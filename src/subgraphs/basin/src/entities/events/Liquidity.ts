import { BigInt } from "@graphprotocol/graph-ts";
import { Deposit, Withdraw } from "../../../generated/schema";
import { AddLiquidity, RemoveLiquidity, RemoveLiquidityOneToken, Sync } from "../../../generated/Basin-ABIs/Well";
import { getBigDecimalArrayTotal } from "../../../../../core/utils/Decimals";
import { getCalculatedReserveUSDValues, getTokenPrices } from "../../utils/Well";
import { loadWell } from "../Well";
import { EventVolume } from "../../utils/Volume";

export function recordAddLiquidityEvent(event: AddLiquidity, volume: EventVolume): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let deposit = new Deposit(id);
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

  deposit.hash = event.transaction.hash;
  deposit.logIndex = event.logIndex.toI32();
  deposit.eventType = "ADD_LIQUIDITY";
  deposit.account = event.transaction.from;
  deposit.well = event.address;
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.liquidity = event.params.lpAmountOut;
  deposit.tokens = well.tokens;
  deposit.reserves = event.params.tokenAmountsIn;
  deposit.amountUSD = getBigDecimalArrayTotal(getCalculatedReserveUSDValues(well.tokens, event.params.tokenAmountsIn));
  deposit.tokenPrice = well.tokenPrice;
  deposit.save();
}

export function recordSyncEvent(event: Sync, deltaReserves: BigInt[], volume: EventVolume): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let deposit = new Deposit(id);
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

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
  deposit.save();
}

export function recordRemoveLiquidityEvent(event: RemoveLiquidity, volume: EventVolume): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let withdraw = new Withdraw(id);
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

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
  withdraw.tokenPrice = well.tokenPrice;
  withdraw.save();
}

export function recordRemoveLiquidityOneEvent(
  event: RemoveLiquidityOneToken,
  tokenAmounts: BigInt[],
  volume: EventVolume
): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let withdraw = new Withdraw(id);
  let well = loadWell(event.address);
  well.tokenPrice = getTokenPrices(well);
  well.save();

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
  withdraw.save();
}
