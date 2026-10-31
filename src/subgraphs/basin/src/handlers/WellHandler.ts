import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityOneToken,
  Shift,
  Swap,
  Sync
} from "../../generated/Basin-ABIs/Well";
import { subBigIntArray, emptyBigIntArray } from "../../../../core/utils/Decimals";
import { loadWell } from "../entities/Well";
import { loadOrCreateAccount } from "../entities/Account";
import { SwapInfo } from "../utils/Volume";
import { toAddress } from "../../../../core/utils/Bytes";
import { finalTradeProcessing, liquidity, swap } from "../utils/Exchange";
import { PintoFeeBurned } from "../../generated/Basin-ABIs/PintoFeeWell";
import { PintoFeeBurnRecord } from "../../generated/schema";
import { getProtocolToken, getWhitelistedWells } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { updateWellReserves } from "../entities/Well";
import { updateWellTokenUSDPrices } from "../utils/Well";

export function handlePintoFeeBurned(event: PintoFeeBurned): void {
  // Aquifer is permissionless. Only canonical Pinto Wells have this fee policy;
  // a third-party Well emitting the same signature must not alter our accounting.
  if (!getWhitelistedWells(v()).includes(event.address)) return;
  const row = new PintoFeeBurnRecord(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  row.well = event.address;
  row.amount = event.params.amount;
  row.transactionHash = event.transaction.hash;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.save();
  const well = loadWell(event.address);
  const index = well.tokens.indexOf(getProtocolToken(v(), event.block.number));
  assert(index >= 0, "Pinto fee event on a non-Pinto Well");
  const deltas = emptyBigIntArray(well.tokens.length);
  deltas[index] = event.params.amount.neg();
  updateWellReserves(event.address, deltas, event.block);
  // Burn may precede the gross-input event (even exceed the previous reserve).
  // Do not evaluate an intermediate nonpositive curve; the ensuing trade settles it.
  // swapTo emits its Swap before its burn, so refresh its final price/snapshot here.
  const reserves = loadWell(event.address).reserves;
  if (reserves.every((r) => r.gt(ZERO_BI))) {
    updateWellTokenUSDPrices(event.address, event.block.number);
    finalTradeProcessing(event.address, event.block);
  }
  // Burning a fee is neither another swap nor LP issuance. No volume/supply debit here.
}

export function handleAddLiquidity(event: AddLiquidity): void {
  liquidity(event.params.tokenAmountsIn, event.params.lpAmountOut, event);
}

export function handleSync(event: Sync): void {
  const well = loadWell(event.address);
  const deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
  liquidity(deltaReserves, event.params.lpAmountOut, event);
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  // Event emits positive values
  const deltaReserves = event.params.tokenAmountsOut;
  for (let i = 0; i < deltaReserves.length; i++) {
    deltaReserves[i] = deltaReserves[i].neg();
  }
  liquidity(deltaReserves, event.params.lpAmountIn.neg(), event);
}

export function handleRemoveLiquidityOneToken(event: RemoveLiquidityOneToken): void {
  const well = loadWell(event.address);
  // Event emits positive values
  const deltaReserves = emptyBigIntArray(well.tokens.length);
  deltaReserves[well.tokens.indexOf(event.params.tokenOut)] = event.params.tokenAmountOut.neg();
  liquidity(deltaReserves, event.params.lpAmountIn.neg(), event);
}

export function handleSwap(event: Swap): void {
  const well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  const deltaReserves = emptyBigIntArray(well.tokens.length);
  deltaReserves[well.tokens.indexOf(event.params.fromToken)] = event.params.amountIn;
  deltaReserves[well.tokens.indexOf(event.params.toToken)] = event.params.amountOut.neg();

  const swapInfo: SwapInfo = {
    fromToken: event.params.fromToken,
    amountIn: event.params.amountIn,
    toToken: event.params.toToken,
    amountOut: event.params.amountOut
  };
  swap(swapInfo, deltaReserves, event);
}

export function handleShift(event: Shift): void {
  const well = loadWell(event.address);

  // Since the token in was already transferred before this event was emitted, we need to find the difference to record as the amountIn
  const fromTokenIndex = well.tokens.indexOf(event.params.toToken) == 0 ? 1 : 0;
  const fromToken = toAddress(well.tokens[fromTokenIndex]);

  const deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
  const amountIn = deltaReserves[fromTokenIndex];

  const swapInfo: SwapInfo = {
    fromToken: fromToken,
    amountIn: amountIn,
    toToken: event.params.toToken,
    amountOut: event.params.amountOut
  };
  swap(swapInfo, deltaReserves, event);
}
