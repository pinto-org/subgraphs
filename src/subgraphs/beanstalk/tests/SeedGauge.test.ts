import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import {
  handleBeanToMaxLpGpPerBdvRatioChange,
  handleGaugePointChange,
  handleUpdateAverageStalkPerBdvPerSeason,
  handleFarmerGerminatingStalkBalanceChanged,
  handleTotalGerminatingStalkChanged,
  handleTotalStalkChangedFromGermination
} from "../src/handlers/SeedGaugeHandler";
import { BEAN_ERC20, BEANSTALK } from "../../../core/constants/raw/BeanstalkEthConstants";
import {
  createBeanToMaxLpGpPerBdvRatioChangeEvent,
  createFarmerGerminatingStalkBalanceChangedEvent,
  createGaugePointChangeEvent,
  createTotalGerminatingStalkChangedEvent,
  createTotalStalkChangedFromGerminationEvent,
  createUpdateAverageStalkPerBdvPerSeasonEvent,
  createUpdateGaugeSettingsEvent
} from "./event-mocking/SeedGauge";
import { createWhitelistTokenV4Event } from "./event-mocking/Whitelist";
import { createTemperatureChangeEvent } from "./event-mocking/Field";
import { simpleMockPrice } from "../../../core/tests/event-mocking/Price";
import { mockBlock } from "../../../core/tests/event-mocking/Block";
import { setSeason } from "./utils/Season";
import { dayFromTimestamp } from "../../../core/utils/Dates";
import { loadSilo } from "../src/entities/Silo";
import { initL1Version } from "./entity-mocking/MockVersion";
import { handleWhitelistToken_v4 } from "../src/handlers/legacy/LegacySiloHandler";
import { handleUpdateGaugeSettings } from "../src/handlers/legacy/LegacySeedGaugeHandler";
import { BI_10 } from "../../../core/utils/Decimals";
import { handleTemperatureChange } from "../src/handlers/FieldHandler";

const ANVIL_ADDR_1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

const ratioDecimals = BigInt.fromU32(10).pow(18);

describe("Seed Gauge", () => {
  beforeEach(() => {
    initL1Version();
  });
  afterEach(() => {
    clearStore();
  });

  describe("Renamed Temperature Event", () => {
    test("Renamed Temperature Event", () => {
      simpleMockPrice(1, 1);

      // Temperature inits to 1
      handleTemperatureChange(createTemperatureChangeEvent(BigInt.fromU32(1), BigInt.fromU32(15), 5000000));
      assert.fieldEquals("Field", BEANSTALK.toHexString(), "temperature", "6");
      assert.fieldEquals("FieldHourlySnapshot", BEANSTALK.toHexString() + "-1", "caseId", "15");
      handleTemperatureChange(createTemperatureChangeEvent(BigInt.fromU32(2), BigInt.fromU32(25), 2000000));
      assert.fieldEquals("Field", BEANSTALK.toHexString(), "temperature", "8");
      assert.fieldEquals("FieldHourlySnapshot", BEANSTALK.toHexString() + "-2", "caseId", "25");
    });
  });

  describe("Seasonal Adjustments", () => {
    test("event: BeanToMaxLpGpPerBdvRatioChange (initialization)", () => {
      const initialRatio = BigInt.fromI32(66).times(ratioDecimals);
      setSeason(20000);
      handleBeanToMaxLpGpPerBdvRatioChange(
        createBeanToMaxLpGpPerBdvRatioChangeEvent(BigInt.fromU32(20000), BigInt.fromU32(10), initialRatio)
      );
      assert.fieldEquals("Silo", BEANSTALK.toHexString(), "beanToMaxLpGpPerBdvRatio", initialRatio.toString());
      assert.fieldEquals("SiloHourlySnapshot", BEANSTALK.toHexString() + "-20000", "caseId", "10");
    });

    test("event: BeanToMaxLpGpPerBdvRatioChange (adjustment)", () => {
      const initialRatio = BigInt.fromI32(66).times(ratioDecimals);
      handleBeanToMaxLpGpPerBdvRatioChange(
        createBeanToMaxLpGpPerBdvRatioChangeEvent(BigInt.fromU32(20000), BigInt.fromU32(10), initialRatio)
      );

      const adjustment1 = BigInt.fromI32(2).times(ratioDecimals);
      const adjustment2 = BigInt.fromI32(-5).times(ratioDecimals);
      handleBeanToMaxLpGpPerBdvRatioChange(
        createBeanToMaxLpGpPerBdvRatioChangeEvent(BigInt.fromU32(20001), BigInt.fromU32(10), adjustment1)
      );
      assert.fieldEquals(
        "Silo",
        BEANSTALK.toHexString(),
        "beanToMaxLpGpPerBdvRatio",
        initialRatio.plus(adjustment1).toString()
      );
      handleBeanToMaxLpGpPerBdvRatioChange(
        createBeanToMaxLpGpPerBdvRatioChangeEvent(BigInt.fromU32(20002), BigInt.fromU32(10), adjustment2)
      );
      assert.fieldEquals(
        "Silo",
        BEANSTALK.toHexString(),
        "beanToMaxLpGpPerBdvRatio",
        initialRatio.plus(adjustment1).plus(adjustment2).toString()
      );
    });

    test("event: GaugePointChange", () => {
      handleGaugePointChange(
        createGaugePointChangeEvent(BigInt.fromU32(20000), BEAN_ERC20.toHexString(), BigInt.fromU32(12345))
      );
      assert.fieldEquals("WhitelistTokenSetting", BEAN_ERC20.toHexString(), "gaugePoints", "12345");
    });

    test("event: UpdateAverageStalkPerBdvPerSeason", () => {
      const initialSilo = loadSilo(BEANSTALK);
      initialSilo.depositedBDV = BigInt.fromU32(1000).times(BI_10.pow(6));
      initialSilo.save();

      handleUpdateAverageStalkPerBdvPerSeason(createUpdateAverageStalkPerBdvPerSeasonEvent(BigInt.fromU32(3456)));
      assert.fieldEquals("Silo", BEANSTALK.toHexString(), "grownStalkPerSeason", "3456000");
    });
  });

  describe("Germinating Stalk", () => {
    test("event: FarmerGerminatingStalkBalanceChanged", () => {
      setSeason(5);
      const initialGerminating = BigInt.fromI32(123456);
      handleFarmerGerminatingStalkBalanceChanged(
        createFarmerGerminatingStalkBalanceChangedEvent(ANVIL_ADDR_1, initialGerminating, 0)
      );
      assert.fieldEquals("Germinating", ANVIL_ADDR_1 + "-ODD", "stalk", initialGerminating.toString());
      assert.fieldEquals("Silo", ANVIL_ADDR_1, "germinatingStalk", initialGerminating.toString());

      const times2 = initialGerminating.times(BigInt.fromU32(2));
      handleFarmerGerminatingStalkBalanceChanged(
        createFarmerGerminatingStalkBalanceChangedEvent(ANVIL_ADDR_1, initialGerminating, 0)
      );
      assert.fieldEquals("Germinating", ANVIL_ADDR_1 + "-ODD", "stalk", times2.toString());
      assert.fieldEquals("Silo", ANVIL_ADDR_1, "germinatingStalk", times2.toString());

      handleFarmerGerminatingStalkBalanceChanged(
        createFarmerGerminatingStalkBalanceChangedEvent(ANVIL_ADDR_1, times2.neg(), 0)
      );
      assert.notInStore("Germinating", ANVIL_ADDR_1 + "-ODD");
      assert.fieldEquals("Silo", ANVIL_ADDR_1, "germinatingStalk", "0");

      setSeason(6);
      handleFarmerGerminatingStalkBalanceChanged(
        createFarmerGerminatingStalkBalanceChangedEvent(ANVIL_ADDR_1, initialGerminating, 1)
      );
      assert.fieldEquals("Germinating", ANVIL_ADDR_1 + "-EVEN", "stalk", initialGerminating.toString());
    });

    /**
     * Removed this test due to having to use a simplified approach to account for a bug in the
     * event itself. The test case can be put back once its fixed on b3 and test the b3 implementation
     **/
    // test("event: TotalGerminatingBalanceChanged", () => {
    //   setSeason(6);
    //   const germinatingTokens = BigInt.fromI32(12345);
    //   const germinatingBdv = BigInt.fromI32(7899);
    //   handleTotalGerminatingBalanceChanged(
    //     createTotalGerminatingBalanceChangedEvent(BigInt.fromU32(5), BEAN_ERC20.toHexString(), germinatingTokens, germinatingBdv)
    //   );
    //   assert.fieldEquals("Germinating", BEAN_ERC20.toHexString() + "-ODD", "season", "5");
    //   assert.fieldEquals("Germinating", BEAN_ERC20.toHexString() + "-ODD", "tokenAmount", germinatingTokens.toString());
    //   assert.fieldEquals("Germinating", BEAN_ERC20.toHexString() + "-ODD", "bdv", germinatingBdv.toString());
    //   handleTotalGerminatingBalanceChanged(
    //     createTotalGerminatingBalanceChangedEvent(
    //       BigInt.fromU32(5),
    //       BEAN_ERC20.toHexString(),
    //       germinatingTokens.neg(),
    //       germinatingBdv.neg()
    //     )
    //   );
    //   assert.notInStore("Germinating", BEAN_ERC20.toHexString() + "-ODD");
    // });

    test("event: TotalGerminatingStalkChanged", () => {
      const initialGerminating = BigInt.fromI32(123456789);
      handleTotalGerminatingStalkChanged(
        createTotalGerminatingStalkChangedEvent(BigInt.fromU32(20000), initialGerminating)
      );
      assert.fieldEquals("Silo", BEANSTALK.toHexString(), "germinatingStalk", initialGerminating.toString());
      assert.fieldEquals("Germinating", BEANSTALK.toHexString() + "-EVEN", "stalk", initialGerminating.toString());

      const adjustment = BigInt.fromI32(-8000000);
      handleTotalGerminatingStalkChanged(createTotalGerminatingStalkChangedEvent(BigInt.fromU32(20001), adjustment));
      assert.fieldEquals(
        "Silo",
        BEANSTALK.toHexString(),
        "germinatingStalk",
        initialGerminating.plus(adjustment).toString()
      );
      assert.fieldEquals("Germinating", BEANSTALK.toHexString() + "-ODD", "stalk", adjustment.toString());
    });

    test("event: TotalStalkChangedFromGermination", () => {
      handleTotalStalkChangedFromGermination(
        createTotalStalkChangedFromGerminationEvent(BigInt.fromString("12345"), BigInt.fromString("123"))
      );
      assert.fieldEquals("Silo", BEANSTALK.toHexString(), "stalk", "12345");
      assert.fieldEquals("Silo", BEANSTALK.toHexString(), "roots", "123");
    });
  });

  describe("Owner Configuration", () => {
    test("event: WhitelistToken", () => {
      handleWhitelistToken_v4(
        createWhitelistTokenV4Event(
          BEAN_ERC20.toHexString(),
          "0x12345678",
          BigInt.fromU64(35000000000),
          BigInt.fromU64(10000000000),
          "0xabcdabcd",
          "0x00000000",
          BigInt.fromU32(12345),
          BigInt.fromU32(66).times(ratioDecimals)
        )
      );
      assert.fieldEquals("WhitelistTokenSetting", BEAN_ERC20.toHexString(), "selector", "0x12345678");
      assert.fieldEquals(
        "WhitelistTokenSetting",
        BEAN_ERC20.toHexString(),
        "stalkEarnedPerSeason",
        BigInt.fromU64(35000000000).toString()
      );
      assert.fieldEquals(
        "WhitelistTokenSetting",
        BEAN_ERC20.toHexString(),
        "stalkIssuedPerBdv",
        BigInt.fromU64(10000000000).toString()
      );
      assert.fieldEquals("WhitelistTokenSetting", BEAN_ERC20.toHexString(), "isGaugeEnabled", "true");
      assert.fieldEquals(
        "WhitelistTokenSetting",
        BEAN_ERC20.toHexString(),
        "gaugePoints",
        BigInt.fromU32(12345).toString()
      );
      assert.fieldEquals(
        "WhitelistTokenSetting",
        BEAN_ERC20.toHexString(),
        "optimalPercentDepositedBdv",
        BigInt.fromU32(66).times(ratioDecimals).toString()
      );
    });

    test("event: UpdateGaugeSettings", () => {
      handleUpdateGaugeSettings(
        createUpdateGaugeSettingsEvent(
          BEAN_ERC20.toHexString(),
          "0x12341234",
          "0xabcabcde",
          BigInt.fromU32(66).times(ratioDecimals)
        )
      );
      assert.fieldEquals("WhitelistTokenSetting", BEAN_ERC20.toHexString(), "isGaugeEnabled", "true");
      assert.fieldEquals(
        "WhitelistTokenSetting",
        BEAN_ERC20.toHexString(),
        "optimalPercentDepositedBdv",
        BigInt.fromU32(66).times(ratioDecimals).toString()
      );

      // Setting to 0s should be interpreted as null
      handleUpdateGaugeSettings(
        createUpdateGaugeSettingsEvent(
          BEAN_ERC20.toHexString(),
          "0x00000000",
          "0x00000000",
          BigInt.fromU32(66).times(ratioDecimals)
        )
      );
      assert.fieldEquals("WhitelistTokenSetting", BEAN_ERC20.toHexString(), "isGaugeEnabled", "false");
    });

    test("WhitelistToken Snapshots Get Created", () => {
      const timestamp = BigInt.fromU32(1712793374);
      const day = dayFromTimestamp(timestamp);
      assert.notInStore("WhitelistTokenHourlySnapshot", BEAN_ERC20.toHexString() + "-1");
      assert.notInStore("WhitelistTokenDailySnapshot", BEAN_ERC20.toHexString() + "-" + day.toString());

      let event = createUpdateGaugeSettingsEvent(
        BEAN_ERC20.toHexString(),
        "0x12341234",
        "0xabcabcde",
        BigInt.fromU32(66).times(ratioDecimals)
      );
      event.block = mockBlock(BigInt.fromU32(19628585), timestamp);
      handleUpdateGaugeSettings(event);

      assert.fieldEquals("WhitelistTokenHourlySnapshot", BEAN_ERC20.toHexString() + "-1", "isGaugeEnabled", "true");
      assert.fieldEquals(
        "WhitelistTokenDailySnapshot",
        BEAN_ERC20.toHexString() + "-" + day.toString(),
        "isGaugeEnabled",
        "true"
      );
    });
  });
});
