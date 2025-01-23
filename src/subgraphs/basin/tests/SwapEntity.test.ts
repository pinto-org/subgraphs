import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BEAN_ERC20, WETH } from "../../../core/constants/raw/BeanstalkEthConstants";
import {
  "Account",
  BEAN_SWAP_AMOUNT,
  SWAP_ACCOUNT,
  TRADE_ENTITY_TYPE,
  WELL,
  WETH_SWAP_AMOUNT
} from "./helpers/Constants";
import { boreDefaultWell } from "./helpers/Aquifer";
import { mockShift, mockSwap } from "./helpers/Swap";
import { mockAddLiquidity } from "./helpers/Liquidity";
import { BigInt } from "@graphprotocol/graph-ts";
import { BI_10 } from "../../../core/utils/Decimals";
import { initL1Version } from "./entity-mocking/MockVersion";
import { handleSwap } from "../src/handlers/WellHandler";
import { getSwapEntityId } from "../src/entities/Trade";
import { Trade } from "../generated/schema";

describe("Swap Entity", () => {
  beforeEach(() => {
    initL1Version();
    boreDefaultWell();
  });

  afterEach(() => {
    clearStore();
  });

  test("Swap event", () => {
    const processedEvent = mockSwap();
    const id = getSwapEntityId(processedEvent, WETH_SWAP_AMOUNT, true);
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "fromToken", BEAN_ERC20.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "amountIn", BEAN_SWAP_AMOUNT.toString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "toToken", WETH.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "amountOut", WETH_SWAP_AMOUNT.toString());

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Shift event", () => {
    const initialReserves = [BigInt.fromU32(50000).times(BI_10.pow(6)), BigInt.fromU32(20).times(BI_10.pow(18))];
    const shiftedReserves = [BigInt.fromU32(52000).times(BI_10.pow(6)), BigInt.fromU32(19).times(BI_10.pow(18))];
    mockAddLiquidity(initialReserves);

    const amountIn = shiftedReserves[0].minus(initialReserves[0]);
    const amountOut = initialReserves[1].minus(shiftedReserves[1]);
    const processedEvent = mockShift(shiftedReserves, WETH, amountOut);
    const id = getSwapEntityId(processedEvent, amountOut, true);

    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "fromToken", BEAN_ERC20.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "amountIn", amountIn.toString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "toToken", WETH.toHexString());
    assert.fieldEquals(TRADE_ENTITY_TYPE, id, "amountOut", amountOut.toString());

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Entity id is assigned properly", () => {
    const processedEvent = mockSwap();
    const id = getSwapEntityId(processedEvent, WETH_SWAP_AMOUNT, true);
    assert.entityCount("Trade", 1);
    assert.assertNull(Trade.load(`${id}-${processedEvent.logIndex.toI32()}`));

    handleSwap(processedEvent);
    assert.entityCount("Trade", 2);
    assert.assertNotNull(Trade.load(`${id}-${processedEvent.logIndex.toI32()}`));
  });
});
