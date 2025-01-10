import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { ZERO_BD, ZERO_BI } from "../../../core/utils/Decimals";
import { loadWell } from "../src/entities/Well";
import {
  BEAN_SWAP_AMOUNT,
  BEAN_USD_AMOUNT,
  CURRENT_BLOCK_TIMESTAMP,
  WELL,
  WELL_DAILY_ENTITY_TYPE,
  WELL_HOURLY_ENTITY_TYPE,
  WETH_SWAP_AMOUNT,
  WETH_USD_AMOUNT
} from "./helpers/Constants";
import { boreDefaultWell } from "./helpers/Aquifer";
import { mockShift, mockSwap } from "./helpers/Swap";
import { mockAddLiquidity } from "./helpers/Liquidity";
import { dayFromTimestamp, hourFromTimestamp } from "../../../core/utils/Dates";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BEAN_ERC20 } from "../../../core/constants/raw/BeanstalkEthConstants";
import { initL1Version } from "./entity-mocking/MockVersion";
import { assertBDClose } from "../../../core/tests/Assert";
import { loadBeanstalk } from "../src/entities/Beanstalk";

describe("Well Entity: Exchange Tests", () => {
  beforeEach(() => {
    initL1Version();
    boreDefaultWell();
  });

  afterEach(() => {
    clearStore();
  });

  describe("Swap", () => {
    test("Token Balances updated", () => {
      mockSwap();

      let updatedStore = loadWell(WELL);
      let endingBalances = updatedStore.reserves;

      assert.bigIntEquals(BEAN_SWAP_AMOUNT, endingBalances[0]);
      assert.bigIntEquals(ZERO_BI.minus(WETH_SWAP_AMOUNT), endingBalances[1]);
    });
    test("Token Volumes updated", () => {
      mockSwap();

      let updatedStore = loadWell(WELL);
      let tradeAmounts = updatedStore.cumulativeTradeVolumeReserves;
      let transferAmounts = updatedStore.cumulativeTransferVolumeReserves;

      assert.bigIntEquals(ZERO_BI, tradeAmounts[0]);
      assert.bigIntEquals(WETH_SWAP_AMOUNT, tradeAmounts[1]);
      assert.bigIntEquals(BEAN_SWAP_AMOUNT, transferAmounts[0]);
      assert.bigIntEquals(WETH_SWAP_AMOUNT, transferAmounts[1]);
    });
    test("Token Volumes USD updated", () => {
      mockAddLiquidity();
      mockAddLiquidity();
      mockSwap(BigDecimal.fromString("0.5"));

      let updatedStore = loadWell(WELL);
      let tradeAmounts = updatedStore.cumulativeTradeVolumeReservesUSD;
      let transferAmounts = updatedStore.cumulativeTransferVolumeReservesUSD;

      assert.stringEquals("0", tradeAmounts[0].toString());
      assertBDClose(WETH_USD_AMOUNT.times(BigDecimal.fromString("1.5")), tradeAmounts[1]);
      assertBDClose(BEAN_USD_AMOUNT.times(BigDecimal.fromString("2.5")), transferAmounts[0]);
      assertBDClose(WETH_USD_AMOUNT.times(BigDecimal.fromString("3.5")), transferAmounts[1]);
      assertBDClose(WETH_USD_AMOUNT.times(BigDecimal.fromString("1.5")), updatedStore.cumulativeTradeVolumeUSD);
      assertBDClose(
        BEAN_USD_AMOUNT.times(BigDecimal.fromString("2.5")).plus(WETH_USD_AMOUNT.times(BigDecimal.fromString("3.5"))),
        updatedStore.cumulativeTransferVolumeUSD
      );

      const beanstalk = loadBeanstalk();
      assertBDClose(updatedStore.cumulativeTradeVolumeUSD, beanstalk.cumulativeTradeVolumeUSD);
      assertBDClose(ZERO_BD, beanstalk.cumulativeBuyVolumeUSD);
      assertBDClose(WETH_USD_AMOUNT.times(BigDecimal.fromString("1.5")), beanstalk.cumulativeSellVolumeUSD);
      assertBDClose(updatedStore.cumulativeTransferVolumeUSD, beanstalk.cumulativeTransferVolumeUSD);
    });
    test("Well Snapshot entity created", () => {
      mockSwap();

      let hour = hourFromTimestamp(CURRENT_BLOCK_TIMESTAMP);
      let hourSnapshotID = WELL.toHexString() + "-" + hour.toString();

      let day = dayFromTimestamp(CURRENT_BLOCK_TIMESTAMP, 8 * 60 * 60);
      let daySnapshotID = WELL.toHexString() + "-" + day.toString();

      assert.fieldEquals(WELL_HOURLY_ENTITY_TYPE, hourSnapshotID, "hour", hour.toString());
      assert.fieldEquals(WELL_DAILY_ENTITY_TYPE, daySnapshotID, "day", day.toString());
    });
  });

  describe("Shift", () => {
    beforeEach(() => {
      mockAddLiquidity();
      mockAddLiquidity();
      // Buy beans for 1 weth
      mockShift(
        [BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT.times(BigInt.fromU32(3))],
        BEAN_ERC20,
        BEAN_SWAP_AMOUNT,
        BigDecimal.fromString("1.5")
      );
    });
    test("Token Balances updated", () => {
      let updatedStore = loadWell(WELL);
      let endingBalances = updatedStore.reserves;

      assert.bigIntEquals(BEAN_SWAP_AMOUNT, endingBalances[0]);
      assert.bigIntEquals(WETH_SWAP_AMOUNT.times(BigInt.fromU32(3)), endingBalances[1]);
    });
    test("Token Volumes updated", () => {
      let updatedStore = loadWell(WELL);
      let tradeAmounts = updatedStore.cumulativeTradeVolumeReserves;
      let transferAmounts = updatedStore.cumulativeTransferVolumeReserves;

      assert.bigIntEquals(BEAN_SWAP_AMOUNT, tradeAmounts[0]);
      assert.bigIntEquals(ZERO_BI, tradeAmounts[1]);
      assert.bigIntEquals(BEAN_SWAP_AMOUNT.times(BigInt.fromU32(3)), transferAmounts[0]);
      assert.bigIntEquals(WETH_SWAP_AMOUNT.times(BigInt.fromU32(3)), transferAmounts[1]);
    });
    test("Token Volumes USD updated", () => {
      let updatedStore = loadWell(WELL);
      let tradeAmounts = updatedStore.cumulativeTradeVolumeReservesUSD;
      let transferAmounts = updatedStore.cumulativeTransferVolumeReservesUSD;

      assertBDClose(BEAN_USD_AMOUNT.times(BigDecimal.fromString("1.5")), tradeAmounts[0]);
      assert.stringEquals("0", tradeAmounts[1].toString());
      assertBDClose(BEAN_USD_AMOUNT.times(BigDecimal.fromString("3.5")), transferAmounts[0]);
      assertBDClose(WETH_USD_AMOUNT.times(BigDecimal.fromString("2.5")), transferAmounts[1]);
      assertBDClose(BEAN_USD_AMOUNT.times(BigDecimal.fromString("1.5")), updatedStore.cumulativeTradeVolumeUSD);
      assertBDClose(
        BEAN_USD_AMOUNT.times(BigDecimal.fromString("3.5")).plus(WETH_USD_AMOUNT.times(BigDecimal.fromString("2.5"))),
        updatedStore.cumulativeTransferVolumeUSD
      );

      const beanstalk = loadBeanstalk();
      assertBDClose(updatedStore.cumulativeTradeVolumeUSD, beanstalk.cumulativeTradeVolumeUSD);
      assertBDClose(tradeAmounts[0], beanstalk.cumulativeBuyVolumeUSD);
      assertBDClose(tradeAmounts[1], beanstalk.cumulativeSellVolumeUSD);
      assertBDClose(updatedStore.cumulativeTransferVolumeUSD, beanstalk.cumulativeTransferVolumeUSD);
    });
  });
});
