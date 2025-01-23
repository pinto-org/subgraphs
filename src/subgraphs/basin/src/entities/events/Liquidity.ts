import { ethereum, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { subBigIntArray } from "../../../../../core/utils/Decimals";
import { loadWell } from "../Well";
import { EventVolume } from "../../utils/Volume";
import { Trade } from "../../../generated/schema";

// TODO: consolidate into one Trade.ts file

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

export function recordLiquidityEvent(
  eventType: string,
  event: ethereum.Event,
  lpTokenAmount: BigInt,
  deltaReserves: BigInt[],
  initialRates: BigDecimal[],
  volume: EventVolume
): void {
  const tradeType = ["AddLiquidity", "Sync"].includes(eventType) ? "ADD_LIQUIDITY" : "REMOVE_LIQUIDITY";
  const trade = new Trade(getLiquidityEntityId(tradeType, event, lpTokenAmount));
  const well = loadWell(event.address);

  trade.tradeType = tradeType;
  trade.eventType = eventType;
  trade.well = event.address;
  trade.account = event.transaction.from;

  trade.liqLpTokens = lpTokenAmount;
  trade.liqReserveTokens = deltaReserves; //TODO: apply absolute value here
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
}
