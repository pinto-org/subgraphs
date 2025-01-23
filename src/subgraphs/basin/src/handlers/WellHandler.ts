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
import { liquidity, swap } from "../utils/Exchange";

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
