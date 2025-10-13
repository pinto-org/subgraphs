import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { Address, Bytes } from "@graphprotocol/graph-ts";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import {
  createAddedGaugeEvent,
  createEngagedDataEvent,
  createEngagedEvent,
  createRemovedGaugeEvent
} from "./event-mocking/GenGauge";
import {
  handleAddedGauge,
  handleEngaged,
  handleEngagedData,
  handleRemovedGauge
} from "../src/handlers/GenGaugeHandler";
import { v } from "../src/utils/constants/Version";
import { loadGaugesInfo } from "../src/utils/GenGauge";

const initCultivationFactorGauge = (): void => {
  const value = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000002faf080");
  const address = Address.fromString("0xD1A0D188E861ed9d15773a2F3574a2e94134bA8f");
  const selector = Bytes.fromHexString("0x6c07c340");
  const data = Bytes.fromHexString(
    "0x000000000000000000000000000000000000000000000000000000000007a12000000000000000000000000000000000000000000000000000000000001e848000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000005f5e100"
  );
  const addedGaugeEvent = createAddedGaugeEvent(0, value, address, selector, data);
  handleAddedGauge(addedGaugeEvent);
};

const initConvertPenaltyGauge = (): void => {
  const value = Bytes.fromHexString(
    "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  );
  const address = Address.fromString("0xD1A0D188E861ed9d15773a2F3574a2e94134bA8f");
  const selector = Bytes.fromHexString("0x44811f70");
  const data = Bytes.fromHexString(
    "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000c"
  );
  const addedGaugeEvent = createAddedGaugeEvent(1, value, address, selector, data);
  handleAddedGauge(addedGaugeEvent);
};

const initConvertUpBonusGauge = (): void => {
  const value = Bytes.fromHexString(
    "0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003"
  );
  const address = Address.fromString("0xD1A0D188E861ed9d15773a2F3574a2e94134bA8f");
  const selector = Bytes.fromHexString("0xabababab");
  const data = Bytes.fromHexString(
    "0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000000000008"
  );
  const addedGaugeEvent = createAddedGaugeEvent(2, value, address, selector, data);
  handleAddedGauge(addedGaugeEvent);
};

describe("Gen Gauge", () => {
  beforeEach(() => {
    initPintoVersion();
    loadGaugesInfo();
  });
  afterEach(() => {
    clearStore();
  });

  describe("Cultivation Factor", () => {
    test("Assigns initial value", () => {
      assert.fieldEquals("GaugesInfo", "gauges", "g0IsActive", "false");

      initCultivationFactorGauge();

      assert.fieldEquals("GaugesInfo", "gauges", "g0IsActive", "true");
      assert.fieldEquals("GaugesInfo", "gauges", "g0CultivationFactor", "50");
      assert.fieldEquals("Field", v().protocolAddress.toHexString(), "cultivationFactor", "50");
    });

    test("Updates value", () => {
      initCultivationFactorGauge();

      const value = Bytes.fromHexString("0x000000000000000000000000000000000000000000000000000000000016e360");
      const engagedEvent = createEngagedEvent(0, value);
      handleEngaged(engagedEvent);

      assert.fieldEquals("GaugesInfo", "gauges", "g0CultivationFactor", "1.5");
      assert.fieldEquals("Field", v().protocolAddress.toHexString(), "cultivationFactor", "1.5");
    });

    test("Deactivates gauge", () => {
      assert.fieldEquals("GaugesInfo", "gauges", "g0IsActive", "false");
      initCultivationFactorGauge();
      assert.fieldEquals("GaugesInfo", "gauges", "g0IsActive", "true");
      const removedGaugeEvent = createRemovedGaugeEvent(0);
      handleRemovedGauge(removedGaugeEvent);
      assert.fieldEquals("GaugesInfo", "gauges", "g0IsActive", "false");
    });
  });

  describe("Convert down penalty", () => {
    test("Assigns initial value", () => {
      assert.fieldEquals("GaugesInfo", "gauges", "g1IsActive", "false");

      initConvertPenaltyGauge();

      assert.fieldEquals("GaugesInfo", "gauges", "g1IsActive", "true");
      assert.fieldEquals("GaugesInfo", "gauges", "g1ConvertDownPenalty", "0");
      assert.fieldEquals("GaugesInfo", "gauges", "g1BlightFactor", "0");
      assert.fieldEquals("Silo", v().protocolAddress.toHexString(), "convertDownPenalty", "0");
    });

    test("Updates value", () => {
      initConvertPenaltyGauge();

      const value = Bytes.fromHexString(
        "0x00000000000000000000000000000000000000000000000005a5f457f79580000000000000000000000000000000000000000000000000000000000000000005"
      );
      const engagedEvent = createEngagedEvent(1, value);
      handleEngaged(engagedEvent);

      assert.fieldEquals("GaugesInfo", "gauges", "g1IsActive", "true");
      assert.fieldEquals("GaugesInfo", "gauges", "g1ConvertDownPenalty", "0.407");
      assert.fieldEquals("GaugesInfo", "gauges", "g1BlightFactor", "5");
      assert.fieldEquals("Silo", v().protocolAddress.toHexString(), "convertDownPenalty", "0.407");
    });
  });

  describe("Convert up bonus", () => {
    test("Assigns initial value/data", () => {
      assert.fieldEquals("GaugesInfo", "gauges", "g2IsActive", "false");

      initConvertUpBonusGauge();

      assert.fieldEquals("GaugesInfo", "gauges", "g2IsActive", "true");
      assert.fieldEquals("GaugesInfo", "gauges", "g2BonusStalkPerBdv", "1");
      assert.fieldEquals("GaugesInfo", "gauges", "g2MaxConvertCapacity", "2");
      assert.fieldEquals("GaugesInfo", "gauges", "g2BdvConvertedThisSeason", "5");
      assert.fieldEquals("GaugesInfo", "gauges", "g2MaxTwaDeltaB", "7");
    });

    test("Updates value", () => {
      initConvertUpBonusGauge();

      const value = Bytes.fromHexString(
        "0x000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000090000000000000000000000000000000000000000000000000000000000000003"
      );
      const engagedEvent = createEngagedEvent(2, value);
      handleEngaged(engagedEvent);

      assert.fieldEquals("GaugesInfo", "gauges", "g2BonusStalkPerBdv", "5");
      assert.fieldEquals("GaugesInfo", "gauges", "g2MaxConvertCapacity", "9");
    });

    test("Updates data", () => {
      initConvertUpBonusGauge();

      const data = Bytes.fromHexString(
        "0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000b0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000f0000000000000000000000000000000000000000000000000000000000000008"
      );
      const engagedDataEvent = createEngagedDataEvent(2, data);
      handleEngagedData(engagedDataEvent);

      assert.fieldEquals("GaugesInfo", "gauges", "g2BdvConvertedThisSeason", "11");
      assert.fieldEquals("GaugesInfo", "gauges", "g2MaxTwaDeltaB", "15");
    });
  });
});
