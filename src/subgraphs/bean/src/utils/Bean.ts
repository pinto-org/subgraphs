import { BigDecimal, BigInt, ethereum, Address } from "@graphprotocol/graph-ts";
import { Pool, PoolHourlySnapshot } from "../../generated/schema";
import { BEAN_ERC20_V1, BEAN_WETH_V1 } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { ONE_BD, toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { checkBeanCross } from "./Cross";
import { BeanstalkPrice_try_price, BeanstalkPriceResult } from "./price/BeanstalkPrice";
import { calcLockedBeans } from "./LockedBeans";
import { loadBean, saveBean } from "../entities/Bean";
import { loadOrCreatePool } from "../entities/Pool";
import { externalUpdatePoolPrice as univ2_externalUpdatePoolPrice } from "../handlers/legacy/LegacyUniswapV2Handler";
import { updateBeanSupplyPegPercent_v1 } from "./legacy/Bean";
import { toAddress } from "../../../../core/utils/Bytes";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { setBeanSnapshotInstDeltaB, setBeanSnapshotTwa, takeBeanSnapshots } from "../entities/snapshots/Bean";

export function adjustSupply(beanToken: Address, amount: BigInt, block: ethereum.Block): void {
  let bean = loadBean(beanToken);
  bean.supply = bean.supply.plus(amount);
  takeBeanSnapshots(bean, block);
  saveBean(bean, block);
}

export function updateBeanValues(
  token: Address,
  newPrice: BigDecimal | null,
  deltaSupply: BigInt,
  deltaVolume: BigInt,
  deltaVolumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal,
  block: ethereum.Block
): void {
  let bean = loadBean(token);
  if (newPrice !== null) {
    bean.price = newPrice;
  }
  bean.supply = bean.supply.plus(deltaSupply);
  bean.marketCap = toDecimal(bean.supply).times(bean.price);
  bean.volume = bean.volume.plus(deltaVolume);
  bean.volumeUSD = bean.volumeUSD.plus(deltaVolumeUSD);
  bean.liquidityUSD = bean.liquidityUSD.plus(deltaLiquidityUSD);

  takeBeanSnapshots(bean, block);
  saveBean(bean, block);
}

// Returns the liquidity-weighted bean price across all of the whitelisted pools.
export function calcLiquidityWeightedBeanPrice(token: Address): BigDecimal {
  let bean = loadBean(token);
  let weightedPrice = ZERO_BD;
  let totalLiquidity = ZERO_BD;
  for (let i = 0; i < bean.pools.length; ++i) {
    let pool = Pool.load(bean.pools[i])!;
    weightedPrice = weightedPrice.plus(pool.lastPrice.times(pool.liquidityUSD));
    // log.debug("price | liquidity {} | {}", [pool.lastPrice.toString(), pool.liquidityUSD.toString()]);
    totalLiquidity = totalLiquidity.plus(pool.liquidityUSD);
  }
  return weightedPrice.div(totalLiquidity == ZERO_BD ? ONE_BD : totalLiquidity);
}

export function updateBeanSupplyPegPercent(beanToken: Address, block: ethereum.Block): void {
  if (beanToken == BEAN_ERC20_V1) {
    updateBeanSupplyPegPercent_v1(beanToken, block);
    return;
  }
  let bean = loadBean(beanToken);
  // Issue at pinto deployment with no pinto being minted initially
  if (bean.supply == ZERO_BI) {
    return;
  }
  let pegSupply = ZERO_BI;
  for (let i = 0; i < bean.pools.length; ++i) {
    let pool = loadOrCreatePool(toAddress(bean.pools[i]), block.number);
    // Assumption that beans is in the 0 index for all pools, this may need to be revisited.
    pegSupply = pegSupply.plus(pool.reserves[0]);
  }
  bean.lockedBeans = calcLockedBeans(block.number);
  bean.supplyInPegLP = toDecimal(pegSupply).div(toDecimal(bean.supply.minus(bean.lockedBeans)));
  takeBeanSnapshots(bean, block);
  saveBean(bean, block);
}

// Update bean information if the pool is still whitelisted
export function updateBeanAfterPoolSwap(
  poolAddress: Address,
  poolPrice: BigDecimal,
  volumeBean: BigInt,
  volumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal,
  block: ethereum.Block,
  priceContractResult: BeanstalkPriceResult | null = null
): void {
  const pool = loadOrCreatePool(poolAddress, block.number);
  const beanAddr = toAddress(pool.bean);
  const bean = loadBean(beanAddr);
  // Verify the pool is still whitelisted
  if (bean.pools.indexOf(poolAddress) >= 0) {
    const oldBeanPrice = bean.price;
    let beanPrice = poolPrice;

    // Get overall price from price contract if a result was not already provided
    if (beanAddr == BEAN_ERC20_V1) {
      univ2_externalUpdatePoolPrice(BEAN_WETH_V1, block);
      beanPrice = calcLiquidityWeightedBeanPrice(beanAddr);
    } else {
      if (priceContractResult == null) {
        priceContractResult = BeanstalkPrice_try_price(block.number);
      }
      if (!priceContractResult.reverted) {
        beanPrice = toDecimal(priceContractResult.value.price);
      }
    }

    updateBeanSupplyPegPercent(beanAddr, block);
    updateBeanValues(beanAddr, beanPrice, ZERO_BI, volumeBean, volumeUSD, deltaLiquidityUSD, block);
    checkBeanCross(beanAddr, oldBeanPrice, beanPrice, block);
  }
}

export function updateInstDeltaB(token: Address, block: ethereum.Block): void {
  let bean = loadBean(token);

  let cumulativeDeltaB = ZERO_BI;
  for (let i = 0; i < bean.pools.length; i++) {
    let pool = loadOrCreatePool(toAddress(bean.pools[i]), block.number);
    cumulativeDeltaB = cumulativeDeltaB.plus(pool.deltaBeans);
  }

  // TODO: This needs to be updated to only be set once at the start of the season and not updated after that.
  setBeanSnapshotInstDeltaB(bean, cumulativeDeltaB);
}

// Update Bean's TWA deltaB and price. Individual pools' values must be computed prior to calling this method.
export function updateBeanTwa(block: ethereum.Block): void {
  const beanAddress = getProtocolToken(v(), block.number);
  const bean = loadBean(beanAddress);

  let twaDeltaB = ZERO_BI;
  let weightedTwaPrice = ZERO_BD;
  for (let i = 0; i < bean.pools.length; i++) {
    const poolHourly = PoolHourlySnapshot.load(
      bean.pools[i].toHexString() + "-" + bean.lastHourlySnapshotSeason.toString()
    )!;
    twaDeltaB = twaDeltaB.plus(poolHourly.twaDeltaBeans);
    // TODO: this should be using twa liquidity on each pool instead
    weightedTwaPrice = weightedTwaPrice.plus(poolHourly.twaPrice.times(poolHourly.liquidityUSD));
  }

  // Assumption is that total bean liquidity was already summed earlier in the same event's processing
  const twaPrice = weightedTwaPrice.div(bean.liquidityUSD != ZERO_BD ? bean.liquidityUSD : ONE_BD);

  setBeanSnapshotTwa(bean, twaPrice, twaDeltaB);
}
