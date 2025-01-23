import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { mockAddLiquidity, mockConvert, mockRemoveLiquidityOneBean } from "./helpers/Liquidity";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { borePintoWells } from "./helpers/Aquifer";
import { mockTransaction } from "../../../core/tests/event-mocking/Transaction";
import { BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, WETH_SWAP_AMOUNT } from "./helpers/Constants";
import { ONE_BD, ZERO_BD, ZERO_BI } from "../../../core/utils/Decimals";
import * as PintoBase from "../../../core/constants/raw/PintoBaseConstants";
import { mockPintoTokenPrices } from "./entity-mocking/MockToken";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { loadWell } from "../src/entities/Well";
import { loadBeanstalk } from "../src/entities/Beanstalk";
import { getLiquidityEntityId } from "../src/entities/Trade";
import { Trade } from "../generated/schema";

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
    const tradeId = getLiquidityEntityId("ADD_LIQUIDITY", liquidityEvent, WELL_LP_AMOUNT, true);
    const tradeInitial = Trade.load(tradeId)!;
    assert.assertTrue(tradeInitial.tradeVolumeReserves[0] == ZERO_BI);
    assert.assertTrue(tradeInitial.tradeVolumeReserves[1].gt(ZERO_BI));
    assert.assertTrue(tradeInitial.tradeVolumeUSD.gt(ZERO_BD));
    assert.assertTrue(!tradeInitial.isConvert);
    assert.entityCount("Trade", 1);

    mockConvert(PintoBase.BEAN_ERC20, PintoBase.PINTO_CBBTC, BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, transaction);
    const tradeUpdated = Trade.load(tradeId)!;
    assert.assertTrue(tradeUpdated.isConvert);

    const well = loadWell(PintoBase.PINTO_CBBTC);
    assert.assertTrue(well.convertVolumeReserves[0] == ZERO_BI);
    assert.assertTrue(well.convertVolumeReserves[1].gt(ZERO_BI));
    assert.assertTrue(well.convertVolumeReservesUSD[0] == ZERO_BD);
    assert.assertTrue(well.convertVolumeReservesUSD[1].gt(ZERO_BD));
    assert.assertTrue(well.convertVolumeUSD.gt(ZERO_BD));

    const beanstalk = loadBeanstalk();
    assert.assertTrue(beanstalk.cumulativeConvertVolumeUSD.gt(ZERO_BD));
    assert.assertTrue(beanstalk.cumulativeConvertUpVolumeUSD == ZERO_BD);
    assert.assertTrue(beanstalk.cumulativeConvertDownVolumeUSD.gt(ZERO_BD));
    assert.assertTrue(beanstalk.cumulativeConvertNeutralTradeVolumeUSD == ZERO_BD);
    assert.assertTrue(beanstalk.cumulativeConvertNeutralTransferVolumeUSD == ZERO_BD);
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
      const tradeId = getLiquidityEntityId("REMOVE_LIQUIDITY", liquidityEvent, WELL_LP_AMOUNT, true);
      const tradeInitial = Trade.load(tradeId)!;
      assert.assertTrue(tradeInitial.tradeVolumeReserves[0].gt(ZERO_BI));
      assert.assertTrue(tradeInitial.tradeVolumeReserves[1] == ZERO_BI);
      assert.assertTrue(tradeInitial.tradeVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(!tradeInitial.isConvert);
      assert.entityCount("Trade", 2);

      mockConvert(PintoBase.PINTO_CBBTC, PintoBase.BEAN_ERC20, WELL_LP_AMOUNT, BEAN_SWAP_AMOUNT, transaction);
      const tradeUpdated = Trade.load(tradeId)!;
      assert.assertTrue(tradeUpdated.isConvert);

      const well = loadWell(PintoBase.PINTO_CBBTC);
      assert.assertTrue(well.convertVolumeReserves[0].gt(ZERO_BI));
      assert.assertTrue(well.convertVolumeReserves[1] == ZERO_BI);
      assert.assertTrue(well.convertVolumeReservesUSD[0].gt(ZERO_BD));
      assert.assertTrue(well.convertVolumeReservesUSD[1] == ZERO_BD);
      assert.assertTrue(well.convertVolumeUSD.gt(ZERO_BD));

      const beanstalk = loadBeanstalk();
      assert.assertTrue(beanstalk.cumulativeConvertVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(beanstalk.cumulativeConvertUpVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(beanstalk.cumulativeConvertDownVolumeUSD == ZERO_BD);
      assert.assertTrue(beanstalk.cumulativeConvertNeutralTradeVolumeUSD == ZERO_BD);
      assert.assertTrue(beanstalk.cumulativeConvertNeutralTransferVolumeUSD == ZERO_BD);
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
      const removeId = getLiquidityEntityId("REMOVE_LIQUIDITY", firstEvent, WELL_LP_AMOUNT, true);
      const addId = getLiquidityEntityId(
        "ADD_LIQUIDITY",
        secondEvent,
        WELL_LP_AMOUNT.times(BigInt.fromString("2")),
        true
      );
      const removeInitial = Trade.load(removeId)!;
      const addInitial = Trade.load(addId)!;
      assert.assertTrue(!removeInitial.isConvert);
      assert.assertTrue(!addInitial.isConvert);
      assert.entityCount("Trade", 3);

      mockConvert(
        PintoBase.PINTO_CBBTC,
        PintoBase.PINTO_WETH,
        WELL_LP_AMOUNT,
        WELL_LP_AMOUNT.times(BigInt.fromString("2")),
        transaction
      );
      const withdrawUpdated = Trade.load(removeId)!;
      const addUpdated = Trade.load(addId)!;
      assert.assertTrue(withdrawUpdated.isConvert);
      assert.assertTrue(addUpdated.isConvert);

      const wellUp = loadWell(PintoBase.PINTO_CBBTC);
      assert.assertTrue(wellUp.convertVolumeReserves[0].gt(ZERO_BI));
      assert.assertTrue(wellUp.convertVolumeReserves[1] == ZERO_BI);
      assert.assertTrue(wellUp.convertVolumeReservesUSD[0].gt(ZERO_BD));
      assert.assertTrue(wellUp.convertVolumeReservesUSD[1] == ZERO_BD);
      assert.assertTrue(wellUp.convertVolumeUSD.gt(ZERO_BD));

      const wellDown = loadWell(PintoBase.PINTO_WETH);
      assert.assertTrue(wellDown.convertVolumeReserves[0] == ZERO_BI);
      assert.assertTrue(wellDown.convertVolumeReserves[1].gt(ZERO_BI));
      assert.assertTrue(wellDown.convertVolumeReservesUSD[0] == ZERO_BD);
      assert.assertTrue(wellDown.convertVolumeReservesUSD[1].gt(ZERO_BD));
      assert.assertTrue(wellDown.convertVolumeUSD.gt(ZERO_BD));

      const beanstalk = loadBeanstalk();
      assert.assertTrue(beanstalk.cumulativeConvertVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(beanstalk.cumulativeConvertUpVolumeUSD == ZERO_BD);
      assert.assertTrue(beanstalk.cumulativeConvertDownVolumeUSD == ZERO_BD);
      assert.assertTrue(beanstalk.cumulativeConvertNeutralTradeVolumeUSD.gt(ZERO_BD));
      assert.assertTrue(beanstalk.cumulativeConvertNeutralTransferVolumeUSD.gt(ZERO_BD));
    });
  });

  test("Convert ignores related events from other transactions", () => {
    const transaction1 = mockTransaction();
    const liquidityEvent = mockAddLiquidity(
      [BEAN_SWAP_AMOUNT, ZERO_BI],
      WELL_LP_AMOUNT,
      ONE_BD,
      PintoBase.PINTO_CBBTC,
      transaction1
    );
    const tradeId = getLiquidityEntityId("ADD_LIQUIDITY", liquidityEvent, WELL_LP_AMOUNT, true);

    const transaction2 = mockTransaction();
    transaction2.hash = Bytes.fromHexString("0xd0a947cdaf4b351da76a7bf051fe15560a4b3f2725a6db2d8b8663c27a11fbe5");
    mockConvert(PintoBase.BEAN_ERC20, PintoBase.PINTO_CBBTC, BEAN_SWAP_AMOUNT, WELL_LP_AMOUNT, transaction2);
    const depositedUpdated = Trade.load(tradeId)!;
    assert.assertTrue(!depositedUpdated.isConvert);
  });

  test("Convert ignores unrelated LP events within the same transaction", () => {
    const transaction = mockTransaction();
    const liquidityEvent = mockRemoveLiquidityOneBean(WELL_LP_AMOUNT, PintoBase.PINTO_CBBTC, transaction);
    const tradeId = getLiquidityEntityId("REMOVE_LIQUIDITY", liquidityEvent, WELL_LP_AMOUNT, true);
    mockConvert(PintoBase.PINTO_CBETH, PintoBase.BEAN_ERC20, WELL_LP_AMOUNT, BEAN_SWAP_AMOUNT, transaction);
    mockConvert(
      PintoBase.PINTO_CBBTC,
      PintoBase.BEAN_ERC20,
      WELL_LP_AMOUNT.div(BigInt.fromString("2")),
      BEAN_SWAP_AMOUNT,
      transaction
    );
    const withdrawUpdated = Trade.load(tradeId)!;
    assert.assertTrue(!withdrawUpdated.isConvert);
  });
});
