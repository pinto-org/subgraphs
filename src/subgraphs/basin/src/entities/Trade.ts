import { ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { subBigIntArray, ZERO_BI } from "../../../../core/utils/Decimals";
import { loadWell } from "./Well";
import { EventVolume, SwapInfo } from "../utils/Volume";
import { ConvertCandidate, Trade } from "../../generated/schema";

// Avoid saving swap Trade entities with volume less than this amount.
// LP events are always saved since they are needed for Convert tracking.
const TRADE_USD_MIN = BigDecimal.fromString("100.0");

export function getLiquidityEntityId(
  tradeType: string,
  event: ethereum.Event,
  lpTokenAmount: BigInt,
  readonly: boolean = false
): string {
  let id = `${tradeType}-${event.transaction.hash.toHexString()}-${event.address.toHexString()}-${lpTokenAmount.toString()}`;
  if (!readonly && Trade.load(id)) {
    id = `${id}-${event.logIndex.toI32()}`;
  }
  return id;
}

export function getSwapEntityId(event: ethereum.Event, outTokenAmount: BigInt, readonly: boolean = false): string {
  let id = `SWAP-${event.transaction.hash.toHexString()}-${event.address.toHexString()}-${outTokenAmount.toString()}`;
  if (!readonly && Trade.load(id)) {
    id = `${id}-${event.logIndex.toI32()}`;
  }
  return id;
}

export function recordLiquidityEvent(
  event: ethereum.Event,
  deltaLpTokens: BigInt,
  deltaReserves: BigInt[],
  initialRates: BigDecimal[],
  volume: EventVolume
): void {
  const tradeType = deltaLpTokens >= ZERO_BI ? "ADD_LIQUIDITY" : "REMOVE_LIQUIDITY";
  const trade = new Trade(getLiquidityEntityId(tradeType, event, deltaLpTokens.abs()));
  const well = loadWell(event.address);

  trade.tradeType = tradeType;
  trade.well = event.address;
  trade.account = event.transaction.from;

  trade.liqLpTokenAmount = deltaLpTokens.abs();
  trade.liqReservesAmount = deltaReserves.map<BigInt>((r) => r.abs());
  trade.isConvert = false;

  trade.beforeReserves = subBigIntArray(well.reserves, deltaReserves);
  trade.afterReserves = well.reserves;
  trade.beforeTokenRates = initialRates;
  trade.afterTokenRates = well.tokenRates;

  trade.tradeVolumeReserves = volume.tradeVolumeReserves;
  trade.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  trade.tradeVolumeUSD = volume.tradeVolumeUSD;
  trade.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  trade.transferVolumeReserves = volume.transferVolumeReserves;
  trade.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  trade.transferVolumeUSD = volume.transferVolumeUSD;
  trade.hash = event.transaction.hash;
  trade.blockNumber = event.block.number;
  trade.logIndex = event.logIndex.toI32();
  trade.timestamp = event.block.timestamp;
  trade.save();

  const convertCandidate = loadOrCreateConvertCandidate();
  if (tradeType == "ADD_LIQUIDITY") {
    convertCandidate.addLiquidityTrade = trade.id;
  } else {
    convertCandidate.removeLiquidityTrade = trade.id;
  }
  convertCandidate.save();
}

export function recordSwapEvent(
  event: ethereum.Event,
  swapInfo: SwapInfo,
  deltaReserves: BigInt[],
  initialRates: BigDecimal[],
  volume: EventVolume
): void {
  if (volume.tradeVolumeUSD < TRADE_USD_MIN) {
    return;
  }

  const trade = new Trade(getSwapEntityId(event, swapInfo.amountOut));
  const well = loadWell(event.address);

  trade.tradeType = "SWAP";
  trade.well = event.address;
  trade.account = event.transaction.from;

  trade.isConvert = false;

  trade.swapFromToken = swapInfo.fromToken;
  trade.swapAmountIn = swapInfo.amountIn;
  trade.swapToToken = swapInfo.toToken;
  trade.swapAmountOut = swapInfo.amountOut;

  trade.beforeReserves = subBigIntArray(well.reserves, deltaReserves);
  trade.afterReserves = well.reserves;
  trade.beforeTokenRates = initialRates;
  trade.afterTokenRates = well.tokenRates;

  trade.tradeVolumeReserves = volume.tradeVolumeReserves;
  trade.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  trade.tradeVolumeUSD = volume.tradeVolumeUSD;
  trade.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  trade.transferVolumeReserves = volume.transferVolumeReserves;
  trade.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  trade.transferVolumeUSD = volume.transferVolumeUSD;
  trade.hash = event.transaction.hash;
  trade.blockNumber = event.block.number;
  trade.logIndex = event.logIndex.toI32();
  trade.timestamp = event.block.timestamp;
  trade.save();
}

export function loadOrCreateConvertCandidate(): ConvertCandidate {
  let convertCandidate = ConvertCandidate.load("internal");
  if (convertCandidate == null) {
    convertCandidate = new ConvertCandidate("internal");
    convertCandidate.save();
  }
  return convertCandidate;
}
