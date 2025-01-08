import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityOneToken,
  Shift,
  Swap,
  Sync
} from "../../generated/Basin-ABIs/Well";
import { subBigIntArray, emptyBigIntArray, ZERO_BI } from "../../../../core/utils/Decimals";
import { finalTradeProcessing, loadWell, updateWellLiquidityTokenBalance, updateWellReserves } from "../entities/Well";
import { loadOrCreateAccount } from "../entities/Account";
import { updateWellTokenUSDPrices } from "../utils/Well";
import { updateWellVolumesAfterLiquidity, updateWellVolumesAfterSwap } from "../utils/Volume";
import {
  recordAddLiquidityEvent,
  recordRemoveLiquidityEvent,
  recordRemoveLiquidityOneEvent,
  recordSyncEvent
} from "../entities/events/Liquidity";
import { recordShiftEvent, recordSwapEvent } from "../entities/events/Swap";
import { toAddress } from "../../../../core/utils/Bytes";

export function handleAddLiquidity(event: AddLiquidity): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  updateWellReserves(event.address, event.params.tokenAmountsIn, event.block);
  updateWellLiquidityTokenBalance(event.address, event.params.lpAmountOut, event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterLiquidity(
    event.address,
    well.tokens.map<Address>((b) => toAddress(b)),
    event.params.tokenAmountsIn,
    event.params.lpAmountOut,
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordAddLiquidityEvent(event, volume);
}

export function handleSync(event: Sync): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  let deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
  updateWellReserves(event.address, deltaReserves, event.block);
  updateWellLiquidityTokenBalance(event.address, event.params.lpAmountOut, event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterLiquidity(
    event.address,
    well.tokens.map<Address>((b) => toAddress(b)),
    deltaReserves,
    event.params.lpAmountOut,
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordSyncEvent(event, deltaReserves, volume);
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  // Treat token balances as negative since we are removing liquidity
  let deltaReserves = event.params.tokenAmountsOut;
  for (let i = 0; i < deltaReserves.length; i++) {
    deltaReserves[i] = deltaReserves[i].neg();
  }

  updateWellReserves(event.address, deltaReserves, event.block);
  updateWellLiquidityTokenBalance(event.address, event.params.lpAmountIn.neg(), event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterLiquidity(
    event.address,
    well.tokens.map<Address>((b) => toAddress(b)),
    subBigIntArray([ZERO_BI, ZERO_BI], event.params.tokenAmountsOut),
    event.params.lpAmountIn.neg(),
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordRemoveLiquidityEvent(event, volume);
}

export function handleRemoveLiquidityOneToken(event: RemoveLiquidityOneToken): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  let withdrawnBalances = emptyBigIntArray(well.tokens.length);
  withdrawnBalances[well.tokens.indexOf(event.params.tokenOut)] = withdrawnBalances[
    well.tokens.indexOf(event.params.tokenOut)
  ].plus(event.params.tokenAmountOut);

  updateWellReserves(
    event.address,
    withdrawnBalances.map<BigInt>((b) => b.neg()),
    event.block
  );
  updateWellLiquidityTokenBalance(event.address, event.params.lpAmountIn.neg(), event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterLiquidity(
    event.address,
    [event.params.tokenOut],
    [event.params.tokenAmountOut.neg()],
    event.params.lpAmountIn.neg(),
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordRemoveLiquidityOneEvent(event, withdrawnBalances, volume);
}

export function handleSwap(event: Swap): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  let deltaReserves = emptyBigIntArray(well.tokens.length);
  deltaReserves[well.tokens.indexOf(event.params.fromToken)] = event.params.amountIn;
  deltaReserves[well.tokens.indexOf(event.params.toToken)] = event.params.amountOut.neg();
  updateWellReserves(event.address, deltaReserves, event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterSwap(
    event.address,
    event.params.fromToken,
    event.params.amountIn,
    event.params.toToken,
    event.params.amountOut,
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordSwapEvent(event, volume);
}

export function handleShift(event: Shift): void {
  let well = loadWell(event.address);
  loadOrCreateAccount(event.transaction.from);

  // Since the token in was already transferred before this event was emitted, we need to find the difference to record as the amountIn
  let fromTokenIndex = well.tokens.indexOf(event.params.toToken) == 0 ? 1 : 0;
  let fromToken = toAddress(well.tokens[fromTokenIndex]);

  let deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
  let amountIn = deltaReserves[fromTokenIndex];

  updateWellReserves(event.address, deltaReserves, event.block);

  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterSwap(
    event.address,
    fromToken,
    amountIn,
    event.params.toToken,
    event.params.amountOut,
    event.block
  );

  finalTradeProcessing(event.address, event.block);
  recordShiftEvent(event, fromToken, amountIn, volume);
}
