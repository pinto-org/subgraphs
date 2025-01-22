import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import { Deposit, Withdraw } from "../../../generated/schema";
import { AddLiquidity, RemoveLiquidity, RemoveLiquidityOneToken, Sync } from "../../../generated/Basin-ABIs/Well";
import { getBigDecimalArrayTotal } from "../../../../../core/utils/Decimals";
import { getCalculatedReserveUSDValues, getTokenPrices } from "../../utils/Well";
import { loadWell } from "../Well";
import { EventVolume } from "../../utils/Volume";

export function getDepositEntityId(event: ethereum.Event, lpTokenAmount: BigInt, readonly: boolean = false): string {
  let id = `ADD_LIQUIDITY-${event.transaction.hash.toHexString()}-${event.address.toHexString()}-${lpTokenAmount.toString()}`;
  if (!readonly && Deposit.load(id)) {
    id = `${id}-${event.logIndex.toI32()}`;
  }
  return id;
}

export function getWithdrawEntityId(event: ethereum.Event, lpTokenAmount: BigInt, readonly: boolean = false): string {
  let id = `REMOVE_LIQUIDITY-${event.transaction.hash.toHexString()}-${event.address.toHexString()}-${lpTokenAmount.toString()}`;
  if (!readonly && Withdraw.load(id)) {
    id = `${id}-${event.logIndex.toI32()}`;
  }
  return id;
}

export function recordAddLiquidityEvent(event: AddLiquidity, volume: EventVolume): void {
  let deposit = new Deposit(getDepositEntityId(event, event.params.lpAmountOut));
  let well = loadWell(event.address);

  deposit.hash = event.transaction.hash;
  deposit.logIndex = event.logIndex.toI32();
  deposit.eventType = "ADD_LIQUIDITY"; //TODO: unused, replace with event name?
  deposit.account = event.transaction.from;
  deposit.well = event.address;
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.liquidity = event.params.lpAmountOut;
  deposit.tokens = well.tokens;
  deposit.reserves = event.params.tokenAmountsIn;
  deposit.amountUSD = getBigDecimalArrayTotal(getCalculatedReserveUSDValues(well.tokens, event.params.tokenAmountsIn));
  deposit.tokenPrice = well.tokenPrice;
  deposit.isConvert = false;
  deposit.tradeVolumeReserves = volume.tradeVolumeReserves;
  deposit.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  deposit.tradeVolumeUSD = volume.tradeVolumeUSD;
  deposit.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  deposit.transferVolumeReserves = volume.transferVolumeReserves;
  deposit.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  deposit.transferVolumeUSD = volume.transferVolumeUSD;
  deposit.save();
}

export function recordSyncEvent(event: Sync, deltaReserves: BigInt[], volume: EventVolume): void {
  let deposit = new Deposit(getDepositEntityId(event, event.params.lpAmountOut));
  let well = loadWell(event.address);

  deposit.hash = event.transaction.hash;
  deposit.logIndex = event.logIndex.toI32();
  deposit.eventType = "SYNC";
  deposit.account = event.transaction.from;
  deposit.well = event.address;
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.liquidity = event.params.lpAmountOut;
  deposit.tokens = well.tokens;
  deposit.reserves = deltaReserves;
  deposit.amountUSD = getBigDecimalArrayTotal(getCalculatedReserveUSDValues(well.tokens, deltaReserves));
  deposit.tokenPrice = well.tokenPrice;
  deposit.isConvert = false;
  deposit.tradeVolumeReserves = volume.tradeVolumeReserves;
  deposit.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  deposit.tradeVolumeUSD = volume.tradeVolumeUSD;
  deposit.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  deposit.transferVolumeReserves = volume.transferVolumeReserves;
  deposit.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  deposit.transferVolumeUSD = volume.transferVolumeUSD;
  deposit.save();
}

export function recordRemoveLiquidityEvent(event: RemoveLiquidity, volume: EventVolume): void {
  let withdraw = new Withdraw(getWithdrawEntityId(event, event.params.lpAmountIn));
  let well = loadWell(event.address);

  withdraw.hash = event.transaction.hash;
  withdraw.logIndex = event.logIndex.toI32();
  withdraw.eventType = "REMOVE_LIQUIDITY";
  withdraw.account = event.transaction.from;
  withdraw.well = event.address;
  withdraw.blockNumber = event.block.number;
  withdraw.timestamp = event.block.timestamp;
  withdraw.liquidity = event.params.lpAmountIn;
  withdraw.tokens = well.tokens;
  withdraw.reserves = event.params.tokenAmountsOut;
  withdraw.amountUSD = getBigDecimalArrayTotal(
    getCalculatedReserveUSDValues(well.tokens, event.params.tokenAmountsOut)
  );
  withdraw.isConvert = false;
  withdraw.tokenPrice = well.tokenPrice;
  withdraw.tradeVolumeReserves = volume.tradeVolumeReserves;
  withdraw.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  withdraw.tradeVolumeUSD = volume.tradeVolumeUSD;
  withdraw.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  withdraw.transferVolumeReserves = volume.transferVolumeReserves;
  withdraw.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  withdraw.transferVolumeUSD = volume.transferVolumeUSD;
  withdraw.save();
}

export function recordRemoveLiquidityOneEvent(
  event: RemoveLiquidityOneToken,
  tokenAmounts: BigInt[],
  volume: EventVolume
): void {
  let withdraw = new Withdraw(getWithdrawEntityId(event, event.params.lpAmountIn));
  let well = loadWell(event.address);

  withdraw.hash = event.transaction.hash;
  withdraw.logIndex = event.logIndex.toI32();
  withdraw.eventType = "REMOVE_LIQUIDITY_ONE_TOKEN";
  withdraw.account = event.transaction.from;
  withdraw.well = event.address;
  withdraw.blockNumber = event.block.number;
  withdraw.timestamp = event.block.timestamp;
  withdraw.liquidity = event.params.lpAmountIn;
  withdraw.tokens = well.tokens;
  withdraw.reserves = tokenAmounts;
  withdraw.amountUSD = getBigDecimalArrayTotal(getCalculatedReserveUSDValues(well.tokens, tokenAmounts));
  withdraw.tokenPrice = well.tokenPrice;
  withdraw.isConvert = false;
  withdraw.tradeVolumeReserves = volume.tradeVolumeReserves;
  withdraw.tradeVolumeReservesUSD = volume.tradeVolumeReservesUSD;
  withdraw.tradeVolumeUSD = volume.tradeVolumeUSD;
  withdraw.biTradeVolumeReserves = volume.biTradeVolumeReserves;
  withdraw.transferVolumeReserves = volume.transferVolumeReserves;
  withdraw.transferVolumeReservesUSD = volume.transferVolumeReservesUSD;
  withdraw.transferVolumeUSD = volume.transferVolumeUSD;
  withdraw.save();
}
