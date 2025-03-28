import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { Address, Bytes } from "@graphprotocol/graph-ts";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { createAddedGaugeEvent, createEngagedEvent } from "./event-mocking/GenGauge";
import { handleAddedGauge, handleEngaged } from "../src/handlers/GenGaugeHandler";
import { v } from "../src/utils/constants/Version";

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

describe("Gen Gauge", () => {
  beforeEach(() => {
    initPintoVersion();
  });
  afterEach(() => {
    clearStore();
  });

  describe("Cultivation Factor", () => {
    test("Assigns initial value", () => {
      initCultivationFactorGauge();

      assert.fieldEquals("Field", v().protocolAddress.toHexString(), "cultivationFactor", "50");
    });

    test("Updates value", () => {
      initCultivationFactorGauge();

      const value = Bytes.fromHexString("0x000000000000000000000000000000000000000000000000000000000016e360");
      const engagedEvent = createEngagedEvent(0, value);
      handleEngaged(engagedEvent);

      assert.fieldEquals("Field", v().protocolAddress.toHexString(), "cultivationFactor", "1.5");
    });
  });

  describe("Convert down penalty", () => {
    test("Assigns initial value", () => {
      initConvertPenaltyGauge();

      assert.fieldEquals("Silo", v().protocolAddress.toHexString(), "convertDownPenalty", "0");
    });

    test("Updates value", () => {
      initConvertPenaltyGauge();

      const value = Bytes.fromHexString(
        "0x00000000000000000000000000000000000000000000000005a5f457f79580000000000000000000000000000000000000000000000000000000000000000000"
      );
      const engagedEvent = createEngagedEvent(1, value);
      handleEngaged(engagedEvent);

      assert.fieldEquals("Silo", v().protocolAddress.toHexString(), "convertDownPenalty", "40.7");
    });
  });
});
