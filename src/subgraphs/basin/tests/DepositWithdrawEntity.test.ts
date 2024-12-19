import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BEAN_ERC20, WETH } from "../../../core/constants/raw/BeanstalkEthConstants";
import { BI_10 } from "../../../core/utils/Decimals";
import {
  ACCOUNT_ENTITY_TYPE,
  BEAN_SWAP_AMOUNT,
  DEPOSIT_ENTITY_TYPE,
  SWAP_ACCOUNT,
  WELL,
  WELL_LP_AMOUNT,
  WETH_SWAP_AMOUNT,
  WITHDRAW_ENTITY_TYPE
} from "./helpers/Constants";
import { boreDefaultWell } from "./helpers/Aquifer";
import {
  mockAddLiquidity,
  mockRemoveLiquidity,
  mockRemoveLiquidityOneBean,
  loadWithdraw,
  mockSync
} from "./helpers/Liquidity";
import { loadDeposit } from "./helpers/Liquidity";
import { BigInt } from "@graphprotocol/graph-ts";
import { initL1Version } from "./entity-mocking/MockVersion";
import { loadWell } from "../src/entities/Well";
import { getDepositEntityId, getWithdrawEntityId } from "../src/entities/events/Liquidity";
import { handleAddLiquidity, handleRemoveLiquidity } from "../src/handlers/WellHandler";
import { Deposit, Withdraw } from "../generated/schema";

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
    const id = getDepositEntityId(processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "liquidity", WELL_LP_AMOUNT.toString());
    assert.fieldEquals(
      DEPOSIT_ENTITY_TYPE,
      id,
      "reserves",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    let updatedStore = loadDeposit(id);
    let tokens = updatedStore.tokens;

    assert.bytesEquals(BEAN_ERC20, tokens[0]);
    assert.bytesEquals(WETH, tokens[1]);

    // Account entity exists
    assert.fieldEquals(ACCOUNT_ENTITY_TYPE, SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Sync event", () => {
    const initialReserves = [BigInt.fromU32(50000).times(BI_10.pow(6)), BigInt.fromU32(20).times(BI_10.pow(18))];
    const syncdReserves = [BigInt.fromU32(52000).times(BI_10.pow(6)), BigInt.fromU32(205).times(BI_10.pow(17))];
    mockAddLiquidity(initialReserves);

    const deltaLiquidity = [syncdReserves[0].minus(initialReserves[0]), syncdReserves[1].minus(initialReserves[1])];
    const lpAmount = BI_10;
    const processedEvent = mockSync(syncdReserves, lpAmount);
    const id = getDepositEntityId(processedEvent, BI_10, true);

    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(DEPOSIT_ENTITY_TYPE, id, "liquidity", lpAmount.toString());
    assert.fieldEquals(
      DEPOSIT_ENTITY_TYPE,
      id,
      "reserves",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    // Account entity exists
    assert.fieldEquals(ACCOUNT_ENTITY_TYPE, SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("RemoveLiquidity event", () => {
    const deltaLiquidity = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT];
    mockAddLiquidity(deltaLiquidity);
    mockAddLiquidity(deltaLiquidity);
    const processedEvent = mockRemoveLiquidity(deltaLiquidity);
    const id = getWithdrawEntityId(processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "liquidity", WELL_LP_AMOUNT.toString());
    assert.fieldEquals(
      WITHDRAW_ENTITY_TYPE,
      id,
      "reserves",
      "[" + deltaLiquidity[0].toString() + ", " + deltaLiquidity[1].toString() + "]"
    );

    let updatedStore = loadWithdraw(id);
    let tokens = updatedStore.tokens;

    assert.bytesEquals(BEAN_ERC20, tokens[0]);
    assert.bytesEquals(WETH, tokens[1]);

    let reserves = updatedStore.reserves;

    assert.bigIntEquals(BEAN_SWAP_AMOUNT, reserves[0]);
    assert.bigIntEquals(WETH_SWAP_AMOUNT, reserves[1]);

    // Account entity exists
    assert.fieldEquals(ACCOUNT_ENTITY_TYPE, SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("RemoveLiquidityOneToken event", () => {
    const deltaLiquidity = [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT];
    mockAddLiquidity(deltaLiquidity);
    mockAddLiquidity(deltaLiquidity);
    const processedEvent = mockRemoveLiquidityOneBean();
    const id = getWithdrawEntityId(processedEvent, WELL_LP_AMOUNT, true);
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "id", id);
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "well", WELL.toHexString());
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "liquidity", WELL_LP_AMOUNT.toString());
    assert.fieldEquals(WITHDRAW_ENTITY_TYPE, id, "reserves", "[" + BEAN_SWAP_AMOUNT.toString() + ", 0]");

    let updatedStore = loadWithdraw(id);
    let tokens = updatedStore.tokens;

    assert.bytesEquals(BEAN_ERC20, tokens[0]);
    assert.bytesEquals(WETH, tokens[1]);

    let updatedWell = loadWell(WELL);
    let wellReserves = updatedWell.reserves;

    assert.bigIntEquals(BEAN_SWAP_AMOUNT, wellReserves[0]);
    assert.bigIntEquals(WETH_SWAP_AMOUNT.times(BigInt.fromU32(2)), wellReserves[1]);

    // Account entity exists
    assert.fieldEquals(ACCOUNT_ENTITY_TYPE, SWAP_ACCOUNT.toHexString(), "id", SWAP_ACCOUNT.toHexString());
  });

  test("Deposit entity id is assigned properly", () => {
    const processedEvent = mockAddLiquidity();
    const id = getDepositEntityId(processedEvent, WELL_LP_AMOUNT, true);
    assert.entityCount("Deposit", 1);
    assert.assertNull(Deposit.load(`${id}-${processedEvent.logIndex.toI32()}`));

    handleAddLiquidity(processedEvent);
    assert.entityCount("Deposit", 2);
    assert.assertNotNull(Deposit.load(`${id}-${processedEvent.logIndex.toI32()}`));
  });

  test("Withdraw entity id is assigned properly", () => {
    mockAddLiquidity();
    mockAddLiquidity();

    const processedEvent = mockRemoveLiquidity();
    const id = getWithdrawEntityId(processedEvent, WELL_LP_AMOUNT, true);
    assert.entityCount("Withdraw", 1);
    assert.assertNull(Withdraw.load(`${id}-${processedEvent.logIndex.toI32()}`));

    handleRemoveLiquidity(processedEvent);
    assert.entityCount("Withdraw", 2);
    assert.assertNotNull(Withdraw.load(`${id}-${processedEvent.logIndex.toI32()}`));
  });
});
