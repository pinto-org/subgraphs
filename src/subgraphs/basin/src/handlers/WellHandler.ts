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
import { recordLiquidityEvent } from "../entities/events/Liquidity";
import { recordShiftEvent, recordSwapEvent } from "../entities/events/Swap";
import { toAddress } from "../../../../core/utils/Bytes";

export function handleAddLiquidity(event: AddLiquidity): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
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
  recordLiquidityEvent(
    "AddLiquidity",
    event,
    event.params.lpAmountOut,
    event.params.tokenAmountsIn,
    initialRates,
    volume
  );
}

export function handleSync(event: Sync): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  const deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
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
  recordLiquidityEvent("Sync", event, event.params.lpAmountOut, deltaReserves, initialRates, volume);
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  // Event emits positive values
  const deltaReserves = event.params.tokenAmountsOut;
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
  recordLiquidityEvent("RemoveLiquidity", event, event.params.lpAmountIn, deltaReserves, initialRates, volume);
}

export function handleRemoveLiquidityOneToken(event: RemoveLiquidityOneToken): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  const deltaReserves = emptyBigIntArray(well.tokens.length);
  deltaReserves[well.tokens.indexOf(event.params.tokenOut)] = event.params.tokenAmountOut.neg();

  updateWellReserves(event.address, deltaReserves, event.block);
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
  recordLiquidityEvent("RemoveLiquidityOneToken", event, event.params.lpAmountIn, deltaReserves, initialRates, volume);
}

export function handleSwap(event: Swap): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  const deltaReserves = emptyBigIntArray(well.tokens.length);
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
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  // Since the token in was already transferred before this event was emitted, we need to find the difference to record as the amountIn
  const fromTokenIndex = well.tokens.indexOf(event.params.toToken) == 0 ? 1 : 0;
  const fromToken = toAddress(well.tokens[fromTokenIndex]);

  const deltaReserves = subBigIntArray(event.params.reserves, well.reserves);
  const amountIn = deltaReserves[fromTokenIndex];

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
