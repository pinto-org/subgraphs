import { Shift, Swap } from "../../../generated/Basin-ABIs/Well";
import { Swap as SwapEvent } from "../../../generated/schema";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadWell } from "../Well";
import { getTokenPrices } from "../../utils/Well";
import { EventVolume } from "../../utils/Volume";

export function getSwapEntityId(event: ethereum.Event, outTokenAmount: BigInt, generateNew: boolean = true): string {
  let id = `${event.transaction.hash.toHexString()}-${event.address.toHexString()}-${outTokenAmount.toString()}`;
  if (generateNew && SwapEvent.load(id)) {
    id = `${id}-${event.logIndex.toI32()}`;
  }
  return id;
}

export function recordSwapEvent(event: Swap, volume: EventVolume): void {
  let swap = new SwapEvent(getSwapEntityId(event, event.params.amountOut));
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

  swap.hash = event.transaction.hash;
  swap.logIndex = event.logIndex.toI32();
  swap.eventType = "SWAP";
  swap.account = event.transaction.from;
  swap.well = event.address;
  swap.blockNumber = event.block.number;
  swap.timestamp = event.block.timestamp;
  swap.fromToken = event.params.fromToken;
  swap.amountIn = event.params.amountIn;
  swap.toToken = event.params.toToken;
  swap.amountOut = event.params.amountOut;
  swap.tokenPrice = well.tokenPrice;
  swap.tradeVolumeReserves = volume.tradeVolumeReserves;
  swap.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  swap.tradeVolumeUSD = volume.tradeVolumeUSD;
  swap.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  swap.transferVolumeReserves = volume.transferVolumeReserves;
  swap.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  swap.transferVolumeUSD = volume.transferVolumeUSD;
  swap.save();
}

export function recordShiftEvent(event: Shift, fromToken: Address, amountIn: BigInt, volume: EventVolume): void {
  let swap = new SwapEvent(getSwapEntityId(event, event.params.amountOut));
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

  swap.hash = event.transaction.hash;
  swap.logIndex = event.logIndex.toI32();
  swap.eventType = "SHIFT";
  swap.account = event.transaction.from;
  swap.well = event.address;
  swap.blockNumber = event.block.number;
  swap.timestamp = event.block.timestamp;
  swap.fromToken = fromToken;
  swap.amountIn = amountIn;
  swap.toToken = event.params.toToken;
  swap.amountOut = event.params.amountOut;
  swap.tokenPrice = well.tokenPrice;
  swap.tradeVolumeReserves = volume.tradeVolumeReserves;
  swap.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  swap.tradeVolumeUSD = volume.tradeVolumeUSD;
  swap.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  swap.transferVolumeReserves = volume.transferVolumeReserves;
  swap.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  swap.transferVolumeUSD = volume.transferVolumeUSD;
  swap.save();
}
