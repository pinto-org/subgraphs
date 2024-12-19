import { BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Deposit, Withdraw } from "../../generated/schema";
import { BASIN_BLOCK, BEAN_ERC20, WETH } from "../../../../core/constants/raw/BeanstalkEthConstants";
import {
  handleAddLiquidity,
  handleRemoveLiquidity,
  handleRemoveLiquidityOneToken,
  handleSync
} from "../../src/handlers/WellHandler";
import { BEAN_SWAP_AMOUNT, SWAP_ACCOUNT, WELL, WELL_LP_AMOUNT, WETH_SWAP_AMOUNT } from "./Constants";
import { createContractCallMocks } from "./Functions";
import {
  createAddLiquidityEvent,
  createRemoveLiquidityEvent,
  createRemoveLiquidityOneTokenEvent,
  createSyncEvent
} from "./Well";
import { BI_10, subBigIntArray, ONE_BD, addBigIntArray } from "../../../../core/utils/Decimals";
import { mockWellLpTokenUnderlying } from "../../../../core/tests/event-mocking/Tokens";
import { loadWell } from "../../src/entities/Well";
import { toAddress } from "../../../../core/utils/Bytes";
import { AddLiquidity, RemoveLiquidity, RemoveLiquidityOneToken, Sync } from "../../generated/Basin-ABIs/Well";

export function mockAddLiquidity(
  tokenAmounts: BigInt[] = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT],
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD
): AddLiquidity {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_AddLiq(tokenAmounts, lpAmount);
  const event = createAddLiquidityEvent(WELL, SWAP_ACCOUNT, lpAmount, tokenAmounts);
  event.block.number = BASIN_BLOCK;
  handleAddLiquidity(event);
  return event;
}

export function mockSync(
  newReserves: BigInt[],
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD
): Sync {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_AddLiq(subBigIntArray(newReserves, loadWell(WELL).reserves), lpAmount);
  const event = createSyncEvent(WELL, SWAP_ACCOUNT, newReserves, lpAmount);
  event.block.number = BASIN_BLOCK;
  handleSync(event);
  return event;
}

export function mockRemoveLiquidity(
  tokenAmounts: BigInt[] = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT],
  lpAmount: BigInt = WELL_LP_AMOUNT
): RemoveLiquidity {
  createContractCallMocks();
  mockCalcLPTokenUnderlying_RemoveLiq(lpAmount.neg());
  const event = createRemoveLiquidityEvent(WELL, SWAP_ACCOUNT, lpAmount, tokenAmounts);
  event.block.number = BASIN_BLOCK;
  handleRemoveLiquidity(event);
  return event;
}

export function mockRemoveLiquidityOneBean(lpAmount: BigInt = WELL_LP_AMOUNT): RemoveLiquidityOneToken {
  createContractCallMocks();
  mockCalcLPTokenUnderlying_RemoveLiq(lpAmount.neg());
  const event = createRemoveLiquidityOneTokenEvent(WELL, SWAP_ACCOUNT, lpAmount, BEAN_ERC20, BEAN_SWAP_AMOUNT);
  event.block.number = BASIN_BLOCK;
  handleRemoveLiquidityOneToken(event);
  return event;
}

export function mockRemoveLiquidityOneWeth(
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD
): RemoveLiquidityOneToken {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_RemoveLiq(lpAmount.neg());
  const event = createRemoveLiquidityOneTokenEvent(WELL, SWAP_ACCOUNT, lpAmount, WETH, WETH_SWAP_AMOUNT);
  event.block.number = BASIN_BLOCK;
  handleRemoveLiquidityOneToken(event);
  return event;
}

// Proxy to the mockWellLpTokenUnderlying method, adds base well amounts to reserves/lp delta
function mockCalcLPTokenUnderlying_AddLiq(deltaReserves: BigInt[], lpDelta: BigInt): void {
  const well = loadWell(WELL);
  mockWellLpTokenUnderlying(
    toAddress(well.wellFunction),
    lpDelta.abs(),
    addBigIntArray(well.reserves, deltaReserves),
    well.lpTokenSupply.plus(lpDelta),
    Bytes.empty(),
    [BigInt.fromU32(150).times(BI_10.pow(6)), BigInt.fromU32(5).times(BI_10.pow(15))]
  );
}

// Proxy to the mockWellLpTokenUnderlying method, adds base well amounts to reserves/lp delta
function mockCalcLPTokenUnderlying_RemoveLiq(lpDelta: BigInt): void {
  const well = loadWell(WELL);
  mockWellLpTokenUnderlying(
    toAddress(well.wellFunction),
    lpDelta.abs(),
    well.reserves,
    well.lpTokenSupply,
    Bytes.empty(),
    [BigInt.fromU32(150).times(BI_10.pow(6)), BigInt.fromU32(5).times(BI_10.pow(15))]
  );
}

export function loadDeposit(id: string): Deposit {
  return Deposit.load(id) as Deposit;
}

export function loadWithdraw(id: string): Withdraw {
  return Withdraw.load(id) as Withdraw;
}
