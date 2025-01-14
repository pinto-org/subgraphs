import { BigInt, Address, ethereum, BigDecimal } from "@graphprotocol/graph-ts";
import { TwaResults, TWAType } from "../price/PoolStats";
import { pow, toDecimal } from "../../../../../core/utils/Decimals";
import { setPoolSnapshotTwa } from "../../entities/snapshots/Pool";
import { getTWAPrices } from "../price/TwaOracle";
import { constantProductPrice } from "../price/UniswapPrice";

// Beanstalk-Implementation of Well twa
export function legacy_setWellTwa(wellAddress: Address, twaDeltaB: BigInt, block: ethereum.Block): void {
  const twaBalances = getTWAPrices(wellAddress, TWAType.WELL_PUMP, block.timestamp);
  const twaResult = wellTwaResults(twaBalances, twaDeltaB);

  setPoolSnapshotTwa(wellAddress, twaResult);
}

function wellTwaResults(twaBalances: BigInt[], twaDeltaB: BigInt): TwaResults {
  // Use known twaDeltaB to infer the twa eth price
  // This approach of determining price/token2Price is technically "incorrect", in that it is affected
  // by the issue resolved in EBIP-11 https://github.com/BeanstalkFarms/Beanstalk-Governance-Proposals/blob/master/bip/ebip/ebip-11-upgrade-eth-usd-minting-oracle.md
  // However, these were the values reported by the contract at the time, so we use those twa deltas/prices.
  const twaEthPrice = cpToken2PriceFromDeltaB(
    toDecimal(twaBalances[0]),
    toDecimal(twaBalances[1], 18),
    toDecimal(twaDeltaB)
  );

  return {
    reserves: twaBalances,
    deltaB: twaDeltaB,
    beanPrice: constantProductPrice(toDecimal(twaBalances[0]), toDecimal(twaBalances[1], 18), twaEthPrice),
    token2Price: twaEthPrice,
    liquidity: null
  };
}

// Calculates the price of the non-bean token in a constant product pool, when only the deltaB is known
function cpToken2PriceFromDeltaB(beanReserves: BigDecimal, token2Reserves: BigDecimal, deltaB: BigDecimal): BigDecimal {
  const constantProduct = beanReserves.times(token2Reserves);
  const token2Price = pow(deltaB.plus(beanReserves), 2).div(constantProduct);
  return token2Price;
}
