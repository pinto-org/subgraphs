import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BI_10 } from "../../../core/utils/Decimals";
import { BEAN_SWAP_AMOUNT, SWAP_ACCOUNT, WELL, WELL_LP_AMOUNT, WETH_SWAP_AMOUNT } from "./helpers/Constants";
import { boreDefaultWell } from "./helpers/Aquifer";
import {
  mockAddLiquidity,
  mockRemoveLiquidity,
  mockRemoveLiquidityOneBean,
  mockSync,
  loadTrade
} from "./helpers/Liquidity";
import { BigInt } from "@graphprotocol/graph-ts";
import { initL1Version } from "./entity-mocking/MockVersion";
import { loadWell } from "../src/entities/Well";
import { handleAddLiquidity } from "../src/handlers/WellHandler";
import { getLiquidityEntityId } from "../src/entities/Trade";
import { Trade } from "../generated/schema";

describe("Deposit/Withdraw Entities", () => {
  beforeEach(() => {
    initL1Version();
    boreDefaultWell();
  });

  afterEach(() => {
    clearStore();
  });

  test("AddLiquidity event", () => {
    const deltaLiquidity = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT];
    const processedEvent = mockAddLiquidity(deltaLiquidity);
    const id = getLiquidityEntityId("ADD_LIQUIDITY", processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals("Trade", id, "id", id);
    assert.fieldEquals("Trade", id, "well", WELL.toHexString());
    assert.fieldEquals("Trade", id, "liqLpTokenAmount", WELL_LP_AMOUNT.toString());
    assert.fieldEquals(
      "Trade",
      id,
      "liqReservesAmount",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    const updatedStore = loadTrade(id);

    assert.bigIntEquals(deltaLiquidity[0], updatedStore.liqReservesAmount![0]);
    assert.bigIntEquals(deltaLiquidity[1], updatedStore.liqReservesAmount![1]);

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Sync event", () => {
    const initialReserves = [BigInt.fromU32(50000).times(BI_10.pow(6)), BigInt.fromU32(20).times(BI_10.pow(18))];
    const syncdReserves = [BigInt.fromU32(52000).times(BI_10.pow(6)), BigInt.fromU32(205).times(BI_10.pow(17))];
    mockAddLiquidity(initialReserves);

    const deltaLiquidity = [syncdReserves[0].minus(initialReserves[0]), syncdReserves[1].minus(initialReserves[1])];
    const lpAmount = BI_10;
    const processedEvent = mockSync(syncdReserves, lpAmount);
    const id = getLiquidityEntityId("ADD_LIQUIDITY", processedEvent, BI_10, true);

    assert.fieldEquals("Trade", id, "id", id);
    assert.fieldEquals("Trade", id, "well", WELL.toHexString());
    assert.fieldEquals("Trade", id, "liqLpTokenAmount", lpAmount.toString());
    assert.fieldEquals(
      "Trade",
      id,
      "liqReservesAmount",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("RemoveLiquidity event", () => {
    const deltaLiquidity = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT];
    mockAddLiquidity(deltaLiquidity);
    mockAddLiquidity(deltaLiquidity);
    const processedEvent = mockRemoveLiquidity(deltaLiquidity);
    const id = getLiquidityEntityId("REMOVE_LIQUIDITY", processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals("Trade", id, "id", id);
    assert.fieldEquals("Trade", id, "well", WELL.toHexString());
    assert.fieldEquals("Trade", id, "liqLpTokenAmount", WELL_LP_AMOUNT.toString());
    assert.fieldEquals(
      "Trade",
      id,
      "liqReservesAmount",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    const updatedStore = loadTrade(id);
    assert.bigIntEquals(BEAN_SWAP_AMOUNT, updatedStore.liqReservesAmount![0]);
    assert.bigIntEquals(WETH_SWAP_AMOUNT, updatedStore.liqReservesAmount![1]);

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("RemoveLiquidityOneToken event", () => {
    const deltaLiquidity = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT];
    mockAddLiquidity(deltaLiquidity);
    mockAddLiquidity(deltaLiquidity);
    const processedEvent = mockRemoveLiquidityOneBean();
    const id = getLiquidityEntityId("REMOVE_LIQUIDITY", processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals("Trade", id, "id", id);
    assert.fieldEquals("Trade", id, "well", WELL.toHexString());
    assert.fieldEquals("Trade", id, "liqLpTokenAmount", WELL_LP_AMOUNT.toString());
    assert.fieldEquals("Trade", id, "liqReservesAmount", "[" + BEAN_SWAP_AMOUNT.toString() + ", 0]");

    const updatedWell = loadWell(WELL);
    const wellReserves = updatedWell.reserves;

    assert.bigIntEquals(BEAN_SWAP_AMOUNT, wellReserves[0]);
    assert.bigIntEquals(WETH_SWAP_AMOUNT.times(BigInt.fromU32(2)), wellReserves[1]);

    // Account entity exists
    assert.fieldEquals("Account", SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Trade entity id is assigned properly", () => {
    const addEvent = mockAddLiquidity();
    const addId = getLiquidityEntityId("ADD_LIQUIDITY", addEvent, WELL_LP_AMOUNT, true);
    assert.entityCount("Trade", 1);
    assert.assertNull(Trade.load(`${addId}-${addEvent.logIndex.toI32()}`));

    handleAddLiquidity(addEvent);
    assert.entityCount("Trade", 2);
    assert.assertNotNull(Trade.load(`${addId}-${addEvent.logIndex.toI32()}`));

    const removeEvent = mockRemoveLiquidity();
    const removeId = getLiquidityEntityId("REMOVE_LIQUIDITY", removeEvent, WELL_LP_AMOUNT, true);
    assert.entityCount("Trade", 3);
    assert.assertNull(Trade.load(`${removeId}-${addEvent.logIndex.toI32()}`));
  });
});
