import { afterEach, beforeEach, assert, clearStore, describe, test, log } from "matchstick-as/assembly/index";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK, BEANSTALK_BLOCK } from "../../../core/constants/raw/BeanstalkEthConstants";
import { BI_10, ZERO_BI } from "../../../core/utils/Decimals";
import { beans_BI as beans, podlineMil_BI as mil } from "../../../core/tests/Values";
import { assertFarmerHasPlot, assertFieldHas, harvest, sow, setHarvestable } from "./utils/Field";
import { initL1Version } from "./entity-mocking/MockVersion";
import { simpleMockPrice } from "../../../core/tests/event-mocking/Price";
import { handleTemperatureChange } from "../src/handlers/FieldHandler";
import { createTemperatureChangeEvent } from "./event-mocking/Field";
import { getFieldEntityId, getPlotEntityId, loadField } from "../src/entities/Field";
import { takeFieldSnapshots } from "../src/entities/snapshots/Field";
import { mockBlock } from "../../../core/tests/event-mocking/Block";
import { getCurrentSeason } from "../src/entities/Beanstalk";
import { mockSeasonStruct } from "./utils/Season";

const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

const plotStart = mil(10);
const beansSown = beans(500);
const temperature = 15;
const pods = beansSown.times(BigInt.fromI32(temperature));
const fieldOne = BigInt.fromI32(1);

// Begin tests
describe("Field", () => {
  beforeEach(() => {
    initL1Version();
  });
  afterEach(() => {
    clearStore();
  });

  test("Sow", () => {
    sow(account, plotStart, beansSown, pods);
    assertFarmerHasPlot(account, plotStart, pods);
    assertFieldHas(BEANSTALK.toHexString(), pods, ZERO_BI);

    assert.fieldEquals("Plot", plotStart.toString(), "source", "SOW");
    assert.fieldEquals(
      "Plot",
      plotStart.toString(),
      "beansPerPod",
      BI_10.pow(6).div(BigInt.fromU32(temperature)).toString()
    );
  });

  describe("Multi-Field Support", () => {
    test("allows sowing on field 0 and 1 simultaneously", () => {
      sow(account, plotStart, beansSown, pods);
      sow(account, plotStart, beansSown, pods, fieldOne);

      assert.entityCount("Plot", 2);

      assertFarmerHasPlot(account, plotStart, pods, ZERO_BI, ZERO_BI);
      assertFarmerHasPlot(account, plotStart, pods, ZERO_BI, fieldOne);

      assertFieldHas(account, pods, ZERO_BI);
      assertFieldHas(account, pods, ZERO_BI, fieldOne);

      assertFieldHas(BEANSTALK.toHexString(), pods, ZERO_BI);
      assertFieldHas(BEANSTALK.toHexString(), pods, ZERO_BI, fieldOne);

      assert.fieldEquals("Plot", getPlotEntityId(plotStart, fieldOne), "fieldId", fieldOne.toString());

      const season = BigInt.fromI32(getCurrentSeason());
      const protocolFieldZero = getFieldEntityId(BEANSTALK, ZERO_BI);
      const protocolFieldOne = getFieldEntityId(BEANSTALK, fieldOne);
      const snapshotZeroId = protocolFieldZero + "-" + season.toString();
      const snapshotOneId = protocolFieldOne + "-" + season.toString();

      assert.fieldEquals("FieldHourlySnapshot", snapshotZeroId, "field", protocolFieldZero);
      assert.fieldEquals("FieldHourlySnapshot", snapshotOneId, "field", protocolFieldOne);
      assert.fieldEquals("FieldHourlySnapshot", snapshotOneId, "fieldId", fieldOne.toString());
    });

    test("harvesting on field 0 does not affect field 1", () => {
      sow(account, plotStart, beansSown, pods);
      sow(account, plotStart, beansSown, pods, fieldOne);

      mockSeasonStruct(BEANSTALK);
      setHarvestable(plotStart.plus(pods));
      harvest(account, [plotStart], beansSown);

      assertFieldHas(BEANSTALK.toHexString(), pods, ZERO_BI, fieldOne);
      assertFarmerHasPlot(account, plotStart, pods, ZERO_BI, fieldOne);
      assert.fieldEquals("Plot", getPlotEntityId(plotStart, fieldOne), "farmer", account);
    });
  });

  describe("Cultivation Temperature", () => {
    beforeEach(() => {
      simpleMockPrice(1, 1);
    });

    const testCultivationTemp = (remainingSoil: i32, caseId: i32): void => {
      const field = loadField(BEANSTALK);
      field.soil = BigInt.fromU32(100).times(BI_10.pow(6));
      field.save();

      handleTemperatureChange(createTemperatureChangeEvent(BigInt.fromU32(2), BigInt.fromU32(15), 5000000));

      const field2 = loadField(BEANSTALK);
      assert.assertTrue(field2.cultivationTemperature === null);

      field2.temperature = BigDecimal.fromString("100");
      field2.soil = BigInt.fromU32(remainingSoil).times(BI_10.pow(6));
      takeFieldSnapshots(field2, mockBlock(BEANSTALK_BLOCK));
      field2.save();

      handleTemperatureChange(createTemperatureChangeEvent(BigInt.fromU32(3), BigInt.fromU32(caseId), 2000000));
    };
    test("Soil is selling out, demand is not decreasing (Should set cultivation temp)", () => {
      testCultivationTemp(5, 14);
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.cultivationTemperature!.equals(BigDecimal.fromString("100")));
    });

    test("Soil isnt selling out, demand is not decreasing (Should not set cultivation temp)", () => {
      testCultivationTemp(60, 14);
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.cultivationTemperature === null);
    });

    test("Soil is selling out, demand is decreasing (Should not set cultivation temp)", () => {
      testCultivationTemp(2, 15);
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.cultivationTemperature === null);
    });

    test("Soil isnt selling out, demand is decreasing (Should not set cultivation temp)", () => {
      testCultivationTemp(60, 15);
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.cultivationTemperature === null);
    });

    test("Case id adjustment above 1000", () => {
      testCultivationTemp(5, 1014);
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.cultivationTemperature!.equals(BigDecimal.fromString("100")));
    });

    test("Falls back to prior cultivation temp", () => {
      const field = loadField(BEANSTALK);
      field.soil = BigInt.fromU32(100).times(BI_10.pow(6));
      field.cultivationTemperature = BigDecimal.fromString("500");
      takeFieldSnapshots(field, mockBlock(BEANSTALK_BLOCK));
      field.save();

      handleTemperatureChange(createTemperatureChangeEvent(BigInt.fromU32(2), BigInt.fromU32(15), 5000000));

      const field2 = loadField(BEANSTALK);
      assert.assertTrue(field2.cultivationTemperature!.equals(BigDecimal.fromString("500")));
    });
  });
});
