import { Address, BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import {
  emptyBigIntArray,
  toDecimal,
  ZERO_BD,
  ZERO_BI,
  subBigIntArray,
  emptyBigDecimalArray,
  BI_MAX
} from "../../../../core/utils/Decimals";
import { Well } from "../../generated/schema";
import { loadWell } from "../entities/Well";
import { loadToken } from "../entities/Token";
import { WellFunction } from "../../generated/Basin-ABIs/WellFunction";
import { toAddress } from "../../../../core/utils/Bytes";
import { loadOrCreateWellFunction } from "../entities/WellComponents";
import { loadBeanstalk } from "../entities/Beanstalk";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";

export class EventVolume {
  tradeVolumeReserves: BigInt[];
  tradeVolumeReservesUSD: BigDecimal[];
  tradeVolumeUSD: BigDecimal;
  biTradeVolumeReserves: BigInt[];
  transferVolumeReserves: BigInt[];
  transferVolumeReservesUSD: BigDecimal[];
  transferVolumeUSD: BigDecimal;
}

export class SwapInfo {
  fromToken: Address;
  amountIn: BigInt;
  toToken: Address;
  amountOut: BigInt;
}

export function updateWellVolumesAfterSwap(
  wellAddress: Address,
  swapInfo: SwapInfo,
  block: ethereum.Block
): EventVolume {
  let well = loadWell(wellAddress);

  const deltaTradeVolumeReserves = emptyBigIntArray(well.tokens.length);
  const deltaTransferVolumeReserves = emptyBigIntArray(well.tokens.length);

  // Trade volume will ignore the selling end (negative)
  deltaTradeVolumeReserves[well.tokens.indexOf(swapInfo.fromToken)] = swapInfo.amountIn.neg();
  deltaTradeVolumeReserves[well.tokens.indexOf(swapInfo.toToken)] = swapInfo.amountOut;
  // Transfer volume is considered on both ends of the trade
  deltaTransferVolumeReserves[well.tokens.indexOf(swapInfo.fromToken)] = swapInfo.amountIn;
  deltaTransferVolumeReserves[well.tokens.indexOf(swapInfo.toToken)] = swapInfo.amountOut;

  const transactionVolume = updateVolumeStats(well, deltaTradeVolumeReserves, deltaTransferVolumeReserves);

  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
  well.save();

  return transactionVolume;
}

// The current implementation of USD volumes may be incorrect for wells that have more than 2 tokens.
export function updateWellVolumesAfterLiquidity(
  wellAddress: Address,
  amounts: BigInt[],
  deltaLpSupply: BigInt,
  block: ethereum.Block
): EventVolume {
  let well = loadWell(wellAddress);

  // Determines which tokens were bough/sold and how much
  const tradeAmount = calcLiquidityVolume(well, amounts, deltaLpSupply);
  const deltaTransferVolumeReserves = amounts;

  const transactionVolume = updateVolumeStats(well, tradeAmount, deltaTransferVolumeReserves);

  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
  well.save();

  return transactionVolume;
}

/**
 * Calculates the token volume resulting from a liquidity add/remove operation.
 * The reserves corresponding to the amount of new lp tokens are compared with deltaReserves,
 * the difference is the amount of trading volume. In a proportional liquidity add, the values will be identical.
 * @param well - The Well entity, which has already updated its reserves and lp supply to the new values
 * @param deltaReserves - the change in reserves from the liquidity operation
 * @param deltaLpSupply - the change in lp token supply from the liquidity operation
 * @returns a list of tokens and the amount bought of each. the purchased token is positive, the sold token negative.
 */
export function calcLiquidityVolume(well: Well, deltaReserves: BigInt[], deltaLpSupply: BigInt): BigInt[] {
  if (well.lpTokenSupply == ZERO_BI) {
    return emptyBigIntArray(well.reserves.length);
  }
  const wellFn = loadOrCreateWellFunction(toAddress(well.wellFunction));
  const wellFnContract = WellFunction.bind(toAddress(wellFn.id));

  let tokenAmountBought: BigInt[];
  if (deltaLpSupply.gt(ZERO_BI)) {
    const doubleSided = wellFnContract.calcLPTokenUnderlying(
      deltaLpSupply.abs(),
      well.reserves,
      well.lpTokenSupply,
      well.wellFunctionData
    );
    tokenAmountBought = [doubleSided[0].minus(deltaReserves[0]), doubleSided[1].minus(deltaReserves[1])];
  } else {
    const prevReserves = subBigIntArray(well.reserves, deltaReserves);
    const prevLpSupply = well.lpTokenSupply.minus(deltaLpSupply);
    const doubleSided = wellFnContract.calcLPTokenUnderlying(
      deltaLpSupply.abs(),
      prevReserves,
      prevLpSupply,
      well.wellFunctionData
    );
    tokenAmountBought = [deltaReserves[0].abs().minus(doubleSided[0]), deltaReserves[1].abs().minus(doubleSided[1])];
  }
  return tokenAmountBought;
}

// Updates all volume statistics associated with this well using the provided values
function updateVolumeStats(
  well: Well,
  deltaTradeVolumeReserves: BigInt[],
  deltaTransferVolumeReserves: BigInt[]
): EventVolume {
  let retval: EventVolume = {
    tradeVolumeReserves: emptyBigIntArray(deltaTradeVolumeReserves.length),
    tradeVolumeReservesUSD: emptyBigDecimalArray(deltaTradeVolumeReserves.length),
    tradeVolumeUSD: ZERO_BD,
    biTradeVolumeReserves: emptyBigIntArray(deltaTradeVolumeReserves.length),
    transferVolumeReserves: emptyBigIntArray(deltaTradeVolumeReserves.length),
    transferVolumeReservesUSD: emptyBigDecimalArray(deltaTradeVolumeReserves.length),
    transferVolumeUSD: ZERO_BD
  };

  let tradeVolumeReserves = well.cumulativeTradeVolumeReserves;
  let tradeVolumeReservesUSD = well.cumulativeTradeVolumeReservesUSD;
  let biTradeVolumeReserves = well.cumulativeBiTradeVolumeReserves;
  let rollingDailyTradeVolumeReserves = well.rollingDailyTradeVolumeReserves;
  let rollingDailyTradeVolumeReservesUSD = well.rollingDailyTradeVolumeReservesUSD;
  let rollingDailyBiTradeVolumeReserves = well.rollingDailyBiTradeVolumeReserves;
  let rollingWeeklyTradeVolumeReserves = well.rollingWeeklyTradeVolumeReserves;
  let rollingWeeklyTradeVolumeReservesUSD = well.rollingWeeklyTradeVolumeReservesUSD;
  let rollingWeeklyBiTradeVolumeReserves = well.rollingWeeklyBiTradeVolumeReserves;

  let transferVolumeReserves = well.cumulativeTransferVolumeReserves;
  let transferVolumeReservesUSD = well.cumulativeTransferVolumeReservesUSD;
  let rollingDailyTransferVolumeReserves = well.rollingDailyTransferVolumeReserves;
  let rollingDailyTransferVolumeReservesUSD = well.rollingDailyTransferVolumeReservesUSD;
  let rollingWeeklyTransferVolumeReserves = well.rollingWeeklyTransferVolumeReserves;
  let rollingWeeklyTransferVolumeReservesUSD = well.rollingWeeklyTransferVolumeReservesUSD;

  let totalTradeUSD = ZERO_BD;
  let totalTransferUSD = ZERO_BD;
  for (let i = 0; i < deltaTradeVolumeReserves.length; ++i) {
    const tokenInfo = loadToken(toAddress(well.tokens[i]));
    let usdTradeAmount = ZERO_BD;
    if (deltaTradeVolumeReserves[i] > ZERO_BI) {
      retval.tradeVolumeReserves[i] = deltaTradeVolumeReserves[i];
      tradeVolumeReserves[i] = tradeVolumeReserves[i].plus(deltaTradeVolumeReserves[i]);
      rollingDailyTradeVolumeReserves[i] = rollingDailyTradeVolumeReserves[i].plus(deltaTradeVolumeReserves[i]);
      rollingWeeklyTradeVolumeReserves[i] = rollingWeeklyTradeVolumeReserves[i].plus(deltaTradeVolumeReserves[i]);
      usdTradeAmount = toDecimal(deltaTradeVolumeReserves[i], tokenInfo.decimals).times(tokenInfo.lastPriceUSD);
    }
    retval.biTradeVolumeReserves[i] = deltaTradeVolumeReserves[i].abs();
    biTradeVolumeReserves[i] = biTradeVolumeReserves[i].plus(deltaTradeVolumeReserves[i].abs());
    rollingDailyBiTradeVolumeReserves[i] = rollingDailyBiTradeVolumeReserves[i].plus(deltaTradeVolumeReserves[i].abs());
    rollingWeeklyBiTradeVolumeReserves[i] = rollingWeeklyBiTradeVolumeReserves[i].plus(
      deltaTradeVolumeReserves[i].abs()
    );

    retval.transferVolumeReserves[i] = deltaTransferVolumeReserves[i].abs();
    transferVolumeReserves[i] = transferVolumeReserves[i].plus(deltaTransferVolumeReserves[i].abs());
    rollingDailyTransferVolumeReserves[i] = rollingDailyTransferVolumeReserves[i].plus(
      deltaTransferVolumeReserves[i].abs()
    );
    rollingWeeklyTransferVolumeReserves[i] = rollingWeeklyTransferVolumeReserves[i].plus(
      deltaTransferVolumeReserves[i].abs()
    );
    let usdTransferAmount = toDecimal(deltaTransferVolumeReserves[i].abs(), tokenInfo.decimals).times(
      tokenInfo.lastPriceUSD
    );

    retval.tradeVolumeReservesUSD[i] = usdTradeAmount;
    tradeVolumeReservesUSD[i] = tradeVolumeReservesUSD[i].plus(usdTradeAmount).truncate(2);
    rollingDailyTradeVolumeReservesUSD[i] = rollingDailyTradeVolumeReservesUSD[i].plus(usdTradeAmount).truncate(2);
    rollingWeeklyTradeVolumeReservesUSD[i] = rollingWeeklyTradeVolumeReservesUSD[i].plus(usdTradeAmount).truncate(2);

    retval.transferVolumeReservesUSD[i] = usdTransferAmount;
    transferVolumeReservesUSD[i] = transferVolumeReservesUSD[i].plus(usdTransferAmount).truncate(2);
    rollingDailyTransferVolumeReservesUSD[i] = rollingDailyTransferVolumeReservesUSD[i]
      .plus(usdTransferAmount)
      .truncate(2);
    rollingWeeklyTransferVolumeReservesUSD[i] = rollingWeeklyTransferVolumeReservesUSD[i]
      .plus(usdTransferAmount)
      .truncate(2);

    totalTradeUSD = totalTradeUSD.plus(usdTradeAmount).truncate(2);
    totalTransferUSD = totalTransferUSD.plus(usdTransferAmount).truncate(2);
  }

  well.cumulativeTradeVolumeReserves = tradeVolumeReserves;
  well.cumulativeTradeVolumeReservesUSD = tradeVolumeReservesUSD;
  retval.tradeVolumeUSD = totalTradeUSD;
  well.cumulativeTradeVolumeUSD = well.cumulativeTradeVolumeUSD.plus(totalTradeUSD);
  well.cumulativeBiTradeVolumeReserves = biTradeVolumeReserves;

  well.cumulativeTransferVolumeReserves = transferVolumeReserves;
  well.cumulativeTransferVolumeReservesUSD = transferVolumeReservesUSD;
  retval.transferVolumeUSD = totalTransferUSD;
  well.cumulativeTransferVolumeUSD = well.cumulativeTransferVolumeUSD.plus(totalTransferUSD);

  // Rolling daily/weekly amounts are added immediately, and at at the top of the hour, the oldest
  // hour in the period is removed. This means there is always between 0-1hr of extra data for the period,
  // but this is preferable to having the most recent values being delayed.
  well.rollingDailyTradeVolumeReserves = rollingDailyTradeVolumeReserves;
  well.rollingDailyTradeVolumeReservesUSD = rollingDailyTradeVolumeReservesUSD;
  well.rollingDailyTradeVolumeUSD = well.rollingDailyTradeVolumeUSD.plus(totalTradeUSD).truncate(2);
  well.rollingDailyBiTradeVolumeReserves = rollingDailyBiTradeVolumeReserves;
  well.rollingDailyTransferVolumeReserves = rollingDailyTransferVolumeReserves;
  well.rollingDailyTransferVolumeReservesUSD = rollingDailyTransferVolumeReservesUSD;
  well.rollingDailyTransferVolumeUSD = well.rollingDailyTransferVolumeUSD.plus(totalTransferUSD).truncate(2);

  well.rollingWeeklyTradeVolumeReserves = rollingWeeklyTradeVolumeReserves;
  well.rollingWeeklyTradeVolumeReservesUSD = rollingWeeklyTradeVolumeReservesUSD;
  well.rollingWeeklyTradeVolumeUSD = well.rollingWeeklyTradeVolumeUSD.plus(totalTradeUSD).truncate(2);
  well.rollingWeeklyBiTradeVolumeReserves = rollingWeeklyBiTradeVolumeReserves;
  well.rollingWeeklyTransferVolumeReserves = rollingWeeklyTransferVolumeReserves;
  well.rollingWeeklyTransferVolumeReservesUSD = rollingWeeklyTransferVolumeReservesUSD;
  well.rollingWeeklyTransferVolumeUSD = well.rollingWeeklyTransferVolumeUSD.plus(totalTransferUSD).truncate(2);

  if (well.isBeanstalk) {
    const boughtToken = toAddress(retval.tradeVolumeReservesUSD[0].gt(ZERO_BD) ? well.tokens[0] : well.tokens[1]);
    updateBeanstalkVolumeStats(boughtToken, totalTradeUSD, totalTransferUSD);
  }

  return retval;
}

function updateBeanstalkVolumeStats(
  boughtToken: Address,
  totalTradeUSD: BigDecimal,
  totalTransferUSD: BigDecimal
): void {
  const beanstalk = loadBeanstalk();
  beanstalk.cumulativeTradeVolumeUSD = beanstalk.cumulativeTradeVolumeUSD.plus(totalTradeUSD).truncate(2);
  beanstalk.rollingDailyTradeVolumeUSD = beanstalk.rollingDailyTradeVolumeUSD.plus(totalTradeUSD).truncate(2);
  beanstalk.rollingWeeklyTradeVolumeUSD = beanstalk.rollingWeeklyTradeVolumeUSD.plus(totalTradeUSD).truncate(2);

  if (boughtToken == getProtocolToken(v(), BI_MAX)) {
    beanstalk.cumulativeBuyVolumeUSD = beanstalk.cumulativeBuyVolumeUSD.plus(totalTradeUSD).truncate(2);
    beanstalk.rollingDailyBuyVolumeUSD = beanstalk.rollingDailyBuyVolumeUSD.plus(totalTradeUSD).truncate(2);
    beanstalk.rollingWeeklyBuyVolumeUSD = beanstalk.rollingWeeklyBuyVolumeUSD.plus(totalTradeUSD).truncate(2);
  } else {
    beanstalk.cumulativeSellVolumeUSD = beanstalk.cumulativeSellVolumeUSD.plus(totalTradeUSD).truncate(2);
    beanstalk.rollingDailySellVolumeUSD = beanstalk.rollingDailySellVolumeUSD.plus(totalTradeUSD).truncate(2);
    beanstalk.rollingWeeklySellVolumeUSD = beanstalk.rollingWeeklySellVolumeUSD.plus(totalTradeUSD).truncate(2);
  }
  beanstalk.cumulativeTransferVolumeUSD = beanstalk.cumulativeTransferVolumeUSD.plus(totalTransferUSD).truncate(2);
  beanstalk.rollingDailyTransferVolumeUSD = beanstalk.rollingDailyTransferVolumeUSD.plus(totalTransferUSD).truncate(2);
  beanstalk.rollingWeeklyTransferVolumeUSD = beanstalk.rollingWeeklyTransferVolumeUSD
    .plus(totalTransferUSD)
    .truncate(2);
  beanstalk.save();
}

// Returns the provided token amounts in their appropriate position with respect to well reserve tokens
// Assumption is that if all tokens are already included in the list, their order will be correct.
function padTokenAmounts(allTokens: Address[], includedTokens: Address[], amounts: BigInt[]): BigInt[] {
  if (includedTokens.length < allTokens.length) {
    // Pad with zeros
    const paddedAmounts = emptyBigIntArray(allTokens.length);
    for (let i = 0; i < includedTokens.length; ++i) {
      const tokenIndex = allTokens.indexOf(includedTokens[i]);
      if (tokenIndex >= 0) {
        paddedAmounts[tokenIndex] = amounts[i];
      }
    }
    return paddedAmounts;
  } else {
    return amounts;
  }
}
