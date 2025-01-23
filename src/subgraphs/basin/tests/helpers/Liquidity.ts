import { Address, BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { BASIN_BLOCK } from "../../../../core/constants/raw/BeanstalkEthConstants";
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
import { BI_10, subBigIntArray, ONE_BD, addBigIntArray, ZERO_BI, BI_MAX } from "../../../../core/utils/Decimals";
import { mockWellLpTokenUnderlying } from "../../../../core/tests/event-mocking/Tokens";
import { loadWell } from "../../src/entities/Well";
import { toAddress } from "../../../../core/utils/Bytes";
import { AddLiquidity, RemoveLiquidity, RemoveLiquidityOneToken, Sync } from "../../generated/Basin-ABIs/Well";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "../../src/utils/constants/Version";
import { createConvertEvent } from "./Beanstalk";
import { Convert } from "../../generated/Basin-ABIs/PintoLaunch";
import { handleConvert } from "../../src/handlers/BeanstalkHandler";
import { Trade } from "../../generated/schema";

export function mockAddLiquidity(
  tokenAmounts: BigInt[] = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT],
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD,
  well: Address = WELL,
  transaction: ethereum.Transaction | null = null
): AddLiquidity {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_AddLiq(well, tokenAmounts, lpAmount);
  const event = createAddLiquidityEvent(well, SWAP_ACCOUNT, lpAmount, tokenAmounts);
  event.block.number = BASIN_BLOCK;
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleAddLiquidity(event);
  return event;
}

export function mockSync(
  newReserves: BigInt[],
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD,
  well: Address = WELL,
  transaction: ethereum.Transaction | null = null
): Sync {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_AddLiq(well, subBigIntArray(newReserves, loadWell(well).reserves), lpAmount);
  const event = createSyncEvent(well, SWAP_ACCOUNT, newReserves, lpAmount);
  event.block.number = BASIN_BLOCK;
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleSync(event);
  return event;
}

export function mockRemoveLiquidity(
  tokenAmounts: BigInt[] = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT],
  lpAmount: BigInt = WELL_LP_AMOUNT,
  well: Address = WELL,
  transaction: ethereum.Transaction | null = null
): RemoveLiquidity {
  createContractCallMocks();
  mockCalcLPTokenUnderlying_RemoveLiq(well, lpAmount.neg());
  const event = createRemoveLiquidityEvent(well, SWAP_ACCOUNT, lpAmount, tokenAmounts);
  event.block.number = BASIN_BLOCK;
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleRemoveLiquidity(event);
  return event;
}

export function mockRemoveLiquidityOneBean(
  lpAmount: BigInt = WELL_LP_AMOUNT,
  well: Address = WELL,
  transaction: ethereum.Transaction | null = null
): RemoveLiquidityOneToken {
  createContractCallMocks();
  mockCalcLPTokenUnderlying_RemoveLiq(well, lpAmount.neg());
  const event = createRemoveLiquidityOneTokenEvent(
    well,
    SWAP_ACCOUNT,
    lpAmount,
    getProtocolToken(v(), BI_MAX),
    BEAN_SWAP_AMOUNT
  );
  event.block.number = BASIN_BLOCK;
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleRemoveLiquidityOneToken(event);
  return event;
}

export function mockRemoveLiquidityOneNonBean(
  tokenAddress: Address,
  lpAmount: BigInt = WELL_LP_AMOUNT,
  beanPriceMultiple: BigDecimal = ONE_BD,
  well: Address = WELL,
  transaction: ethereum.Transaction | null = null
): RemoveLiquidityOneToken {
  createContractCallMocks(beanPriceMultiple);
  mockCalcLPTokenUnderlying_RemoveLiq(well, lpAmount.neg());
  const event = createRemoveLiquidityOneTokenEvent(well, SWAP_ACCOUNT, lpAmount, tokenAddress, WETH_SWAP_AMOUNT);
  event.block.number = BASIN_BLOCK;
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleRemoveLiquidityOneToken(event);
  return event;
}

export function mockConvert(
  fromToken: Address,
  toToken: Address,
  fromAmount: BigInt,
  toAmount: BigInt,
  transaction: ethereum.Transaction | null = null
): Convert {
  const event = createConvertEvent(SWAP_ACCOUNT, fromToken, toToken, fromAmount, toAmount);
  if (transaction != null) {
    event.transaction = transaction;
  }
  handleConvert(event);
  return event;
}

// Proxy to the mockWellLpTokenUnderlying method, adds base well amounts to reserves/lp delta
function mockCalcLPTokenUnderlying_AddLiq(wellAddr: Address, deltaReserves: BigInt[], lpDelta: BigInt): void {
  const well = loadWell(wellAddr);
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
function mockCalcLPTokenUnderlying_RemoveLiq(wellAddr: Address, lpDelta: BigInt): void {
  const well = loadWell(wellAddr);
  mockWellLpTokenUnderlying(
    toAddress(well.wellFunction),
    lpDelta.abs(),
    well.reserves,
    well.lpTokenSupply,
    Bytes.empty(),
    [BigInt.fromU32(150).times(BI_10.pow(6)), BigInt.fromU32(5).times(BI_10.pow(15))]
  );
}

export function loadTrade(id: string): Trade {
  return Trade.load(id) as Trade;
}
