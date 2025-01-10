import { BigDecimal, Address, ethereum, log } from "@graphprotocol/graph-ts";
import { ONE_BD, toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { BEAN_ERC20_V1 } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { loadOrCreatePool, savePool } from "../entities/Pool";
import { loadBean, saveBean } from "../entities/Bean";
import { createBeanCross, createPoolCross } from "../entities/Cross";
import { BeanstalkPrice_try_price } from "./price/BeanstalkPrice";
import { updatePoolPrice, updatePoolValues } from "./Pool";
import { updateBeanValues } from "./Bean";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { takeBeanSnapshots } from "../entities/snapshots/Bean";
import { takePoolSnapshots } from "../entities/snapshots/Pool";

export function checkPoolCross(
  poolAddress: Address,
  oldPrice: BigDecimal,
  newPrice: BigDecimal,
  block: ethereum.Block
): boolean {
  let pool = loadOrCreatePool(poolAddress, block.number);

  const crossedBelow = oldPrice >= ONE_BD && newPrice < ONE_BD;
  const crossedAbove = oldPrice < ONE_BD && newPrice >= ONE_BD;
  if (crossedBelow || crossedAbove) {
    createPoolCross(pool, newPrice, crossedAbove, block);

    pool.lastCross = block.timestamp;
    pool.crosses += 1;
    takePoolSnapshots(pool, block);
    savePool(pool, block);
    return true;
  }
  return false;
}

export function checkBeanCross(
  beanAddress: Address,
  oldPrice: BigDecimal,
  newPrice: BigDecimal,
  block: ethereum.Block
): boolean {
  let bean = loadBean(beanAddress);

  const crossedBelow = oldPrice >= ONE_BD && newPrice < ONE_BD;
  const crossedAbove = oldPrice < ONE_BD && newPrice >= ONE_BD;
  if (crossedBelow || crossedAbove) {
    createBeanCross(bean, newPrice, crossedAbove, block);

    bean.lastCross = block.timestamp;
    bean.crosses += 1;
    takeBeanSnapshots(bean, block);
    saveBean(bean, block);
    return true;
  }
  return false;
}

export function getV1Crosses(): i32 {
  let bean = loadBean(BEAN_ERC20_V1);
  return bean.crosses;
}

/**
 * Using the BeanstalkPrice contract, updates pool prices and checks for peg crosses
 * @param priceOnlyOnCross - true if the pool price should only be updated on a peg cross
 * @param block
 * @returns false if the price contract reverted
 */
export function updatePoolPricesOnCross(priceOnlyOnCross: boolean, block: ethereum.Block): boolean {
  const priceResult = BeanstalkPrice_try_price(block.number);
  if (priceResult.reverted) {
    // Price contract was unavailable briefly after well deployment
    return false;
  }
  const beanToken = getProtocolToken(v(), block.number);
  const bean = loadBean(beanToken);
  const prevPrice = bean.price;
  const newPrice = toDecimal(priceResult.value.price);

  // Check for overall peg cross
  const beanCrossed = checkBeanCross(beanToken, prevPrice, newPrice, block);

  // Update pool price for each pool - necessary for checking pool cross
  let totalLiquidity = ZERO_BD;
  for (let i = 0; i < priceResult.value.ps.length; ++i) {
    const poolPriceInfo = priceResult.value.ps[i];
    const pool = loadOrCreatePool(poolPriceInfo.pool, block.number);

    const poolCrossed = checkPoolCross(poolPriceInfo.pool, pool.lastPrice, toDecimal(poolPriceInfo.price), block);

    if (!priceOnlyOnCross || poolCrossed || beanCrossed) {
      totalLiquidity = totalLiquidity.plus(toDecimal(poolPriceInfo.liquidity));
      updatePoolValues(
        poolPriceInfo.pool,
        ZERO_BI,
        ZERO_BD,
        toDecimal(poolPriceInfo.liquidity).minus(pool.liquidityUSD),
        poolPriceInfo.deltaB,
        block
      );
      updatePoolPrice(poolPriceInfo.pool, toDecimal(poolPriceInfo.price), block, false);
    }
  }

  // Update bean values at the end now that the summation of pool liquidity is known
  if (!priceOnlyOnCross || beanCrossed) {
    updateBeanValues(beanToken, newPrice, ZERO_BI, ZERO_BI, ZERO_BD, totalLiquidity.minus(bean.liquidityUSD), block);
  }
  return true;
}
