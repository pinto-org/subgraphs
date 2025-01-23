import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { SwapInfo, updateWellVolumesAfterLiquidity, updateWellVolumesAfterSwap } from "./Volume";
import { loadOrCreateAccount } from "../entities/Account";
import { loadWell, updateWellLiquidityTokenBalance, updateWellReserves } from "../entities/Well";
import { getTokenRates, updateWellTokenUSDPrices } from "./Well";
import { recordLiquidityEvent, recordSwapEvent } from "../entities/Trade";
import { takeWellSnapshots } from "../entities/snapshots/Well";
import { loadBeanstalk } from "../entities/Beanstalk";
import { takeBeanstalkSnapshots } from "../entities/snapshots/Beanstalk";

// Handles AddLiquidity, Sync, RemoveLiquidity, RemoveLiquidityOneToken events
export function liquidity(deltaReserves: BigInt[], deltaLpTokens: BigInt, event: ethereum.Event): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  updateWellReserves(event.address, deltaReserves, event.block);
  updateWellLiquidityTokenBalance(event.address, deltaLpTokens, event.block);
  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterLiquidity(event.address, deltaReserves, deltaLpTokens, event.block);

  finalTradeProcessing(event.address, event.block);
  recordLiquidityEvent(event, deltaLpTokens, deltaReserves, initialRates, volume);
}

// Handles Swap, Shift events
export function swap(swapInfo: SwapInfo, deltaReserves: BigInt[], event: ethereum.Event): void {
  const well = loadWell(event.address);
  const initialRates = well.tokenRates;
  loadOrCreateAccount(event.transaction.from);

  updateWellReserves(event.address, deltaReserves, event.block);
  updateWellTokenUSDPrices(event.address, event.block.number);

  const volume = updateWellVolumesAfterSwap(event.address, swapInfo, event.block);

  finalTradeProcessing(event.address, event.block);
  recordSwapEvent(event, swapInfo, deltaReserves, initialRates, volume);
}

// Common functionality to process for all exchange types
function finalTradeProcessing(wellAddress: Address, block: ethereum.Block): void {
  const well = loadWell(wellAddress);
  well.tokenRates = getTokenRates(well);
  takeWellSnapshots(well, block);
  well.save();

  const beanstalk = loadBeanstalk();
  takeBeanstalkSnapshots(beanstalk, block);
  beanstalk.save();
}
