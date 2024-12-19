import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { mockAddLiquidity, mockRemoveLiquidityOneBean } from "./helpers/Liquidity";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { borePintoWells } from "./helpers/Aquifer";
import { mockTransaction } from "../../../core/tests/event-mocking/Transaction";
import { BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, WETH_SWAP_AMOUNT } from "./helpers/Constants";
import { ONE_BD, ZERO_BD, ZERO_BI } from "../../../core/utils/Decimals";
import { getDepositEntityId, getWithdrawEntityId } from "../src/entities/events/Liquidity";
import { Deposit, Withdraw } from "../generated/schema";
import * as PintoBase from "../../../core/constants/raw/PintoBaseConstants";
import { mockPintoTokenPrices } from "./entity-mocking/MockToken";

describe("Convert Tests", () => {
  beforeEach(() => {
    initPintoVersion();
    borePintoWells();
    mockPintoTokenPrices();
  });

  afterEach(() => {
    clearStore();
  });

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
    // TODO: convert event
  });
  describe("With starting liquidity", () => {
    beforeEach(() => {
      mockAddLiquidity([BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT], WELL_LP_AMOUNT, ONE_BD, PintoBase.PINTO_CBBTC);
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
      assert.entityCount("Deposit", 0);
      assert.entityCount("Withdraw", 1);
      // TODO: convert event
    });
    test("Identifies LP -> LP convert", () => {
      //
    });
  });
  test("Doesn't identify regular LP actions as converts", () => {
    //
  });
});
