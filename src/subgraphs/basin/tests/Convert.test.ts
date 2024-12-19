import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { mockAddLiquidity, mockConvert, mockRemoveLiquidityOneBean } from "./helpers/Liquidity";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { borePintoWells } from "./helpers/Aquifer";
import { mockTransaction } from "../../../core/tests/event-mocking/Transaction";
import { BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, WETH_SWAP_AMOUNT } from "./helpers/Constants";
import { ONE_BD, ZERO_BD, ZERO_BI } from "../../../core/utils/Decimals";
import { getDepositEntityId, getWithdrawEntityId } from "../src/entities/events/Liquidity";
import { Deposit, Withdraw } from "../generated/schema";
import * as PintoBase from "../../../core/constants/raw/PintoBaseConstants";
import { mockPintoTokenPrices } from "./entity-mocking/MockToken";
import { BigInt } from "@graphprotocol/graph-ts";

describe("Convert Tests", () => {
  beforeEach(() => {
    initPintoVersion();
    borePintoWells();
    mockPintoTokenPrices();
  });

  afterEach(() => {
    clearStore();
  });

  // TODO: add/check global convert stats also

  test("Identifies Pinto -> LP convert", () => {
    const transaction = mockTransaction();
    const liquidityEvent = mockAddLiquidity(
      [BEAN_SWAP_AMOUNT, ZERO_BI],
      WELL_LP_AMOUNT,
      ONE_BD,
      PintoBase.PINTO_CBBTC,
      transaction
    );
    const depositId = getDepositEntityId(liquidityEvent, WELL_LP_AMOUNT, true);

    const depositInitial = Deposit.load(depositId)!;
    assert.assertTrue(depositInitial.tradeVolumeReserves[0] == ZERO_BI);
    assert.assertTrue(depositInitial.tradeVolumeReserves[1].gt(ZERO_BI));
    assert.assertTrue(depositInitial.tradeVolumeUSD.gt(ZERO_BD));
    assert.assertTrue(!depositInitial.isConvert);
    assert.entityCount("Deposit", 1);
    assert.entityCount("Withdraw", 0);

    mockConvert(PintoBase.BEAN_ERC20, PintoBase.PINTO_CBBTC, BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, transaction);
    const depositedUpdated = Deposit.load(depositId)!;
    assert.assertTrue(depositedUpdated.isConvert);
  });
  describe("With starting liquidity", () => {
    beforeEach(() => {
      mockAddLiquidity(
        [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT],
        WELL_LP_AMOUNT.times(BigInt.fromString("5")),
        ONE_BD,
        PintoBase.PINTO_CBBTC
      );
    });
    test("Identifies LP -> Pinto convert", () => {
      const transaction = mockTransaction();
      const liquidityEvent = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, PintoBase.PINTO_CBBTC, transaction);
      const withdrawId = getWithdrawEntityId(liquidityEvent, WELL_LP_AMOUNT, true);
      const withdrawInitial = Withdraw.load(withdrawId)!;
      assert.assertTrue(withdrawInitial.tradeVolumeReserves[0].gt(ZERO_BI));
      assert.assertTrue(withdrawInitial.tradeVolumeReserves[1] == ZERO_BI);
      assert.assertTrue(withdrawInitial.tradeVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(!withdrawInitial.isConvert);
      assert.entityCount("Deposit", 1);
      assert.entityCount("Withdraw", 1);

      mockConvert(PintoBase.PINTO_CBBTC, PintoBase.BEAN_ERC20, WELL_LP_AMOUNT, BEAN_SWAP_AMOUNT, transaction);
      const withdrawUpdated = Withdraw.load(withdrawId)!;
      assert.assertTrue(withdrawUpdated.isConvert);
    });
    test("Identifies LP -> LP convert", () => {
      const transaction = mockTransaction();
      const firstEvent = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, PintoBase.PINTO_CBBTC, transaction);
      const secondEvent = mockAddLiquidity(
        [BEAN_SWAP_AMOUNT, ZERO_BI],
        WELL_LP_AMOUNT.times(BigInt.fromString("2")),
        ONE_BD,
        PintoBase.PINTO_WETH,
        transaction
      );
      const withdrawId = getWithdrawEntityId(firstEvent, WELL_LP_AMOUNT, true);
      const depositId = getDepositEntityId(secondEvent, WELL_LP_AMOUNT.times(BigInt.fromString("2")), true);
      const withdrawInitial = Withdraw.load(withdrawId)!;
      const depositInitial = Deposit.load(depositId)!;
      assert.assertTrue(!withdrawInitial.isConvert);
      assert.assertTrue(!depositInitial.isConvert);
      assert.entityCount("Deposit", 2);
      assert.entityCount("Withdraw", 1);

      mockConvert(
        PintoBase.PINTO_CBBTC,
        PintoBase.PINTO_WETH,
        WELL_LP_AMOUNT,
        WELL_LP_AMOUNT.times(BigInt.fromString("2")),
        transaction
      );
      const depositedUpdated = Deposit.load(depositId)!;
      const withdrawUpdated = Withdraw.load(withdrawId)!;
      assert.assertTrue(depositedUpdated.isConvert);
      assert.assertTrue(withdrawUpdated.isConvert);
    });
  });

  test("Convert ignores related events from other transactions", () => {
    const liquidityEvent = mockAddLiquidity([BEAN_SWAP_AMOUNT, ZERO_BI], WELL_LP_AMOUNT, ONE_BD, PintoBase.PINTO_CBBTC);
    const depositId = getDepositEntityId(liquidityEvent, WELL_LP_AMOUNT, true);
    mockConvert(PintoBase.BEAN_ERC20, PintoBase.PINTO_CBBTC, BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT);
    const depositedUpdated = Deposit.load(depositId)!;
    assert.assertTrue(!depositedUpdated.isConvert);
  });

  test("Convert ignores unrelated LP events within the same transaction", () => {
    const transaction = mockTransaction();
    const liquidityEvent = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, PintoBase.PINTO_CBBTC, transaction);
    const withdrawId = getWithdrawEntityId(liquidityEvent, WELL_LP_AMOUNT, true);
    mockConvert(PintoBase.PINTO_CBETH, PintoBase.BEAN_ERC20, WELL_LP_AMOUNT, BEAN_SWAP_AMOUNT, transaction);
    const withdrawUpdated = Withdraw.load(withdrawId)!;
    assert.assertTrue(!withdrawUpdated.isConvert);
  });
});
