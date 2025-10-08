import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK, BEANSTALK_BLOCK } from "../../../core/constants/raw/BeanstalkEthConstants";
import { BI_10, ZERO_BI } from "../../../core/utils/Decimals";
import { beans_BI as beans, podlineMil_BI as mil } from "../../../core/tests/Values";
import { assertFarmerHasPlot, assertFieldHas, combinePlots, PlotSeedScenario, seedPlotWithHarvests, sow } from "./utils/Field";
import { initL1Version } from "./entity-mocking/MockVersion";
import { simpleMockPrice } from "../../../core/tests/event-mocking/Price";
import { handleTemperatureChange } from "../src/handlers/FieldHandler";
import { createTemperatureChangeEvent } from "./event-mocking/Field";
import { loadField, loadPlot } from "../src/entities/Field";
import { takeFieldSnapshots } from "../src/entities/snapshots/Field";
import { mockBlock } from "../../../core/tests/event-mocking/Block";

const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

const plotStart = mil(10);
const beansSown = beans(500);
const temperature = 15;
const pods = beansSown.times(BigInt.fromI32(temperature));

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

  test("PlotCombined merges sequential plots into the earliest index", () => {
    // Fixtures mirror the spec example: plots 1000, 3000, 5000 combine into 1000, 9000 stays untouched.
    const plotConfigs = [
      // 1000: fully harvested plot that becomes the target.
      new PlotSeedScenario(BigInt.fromI32(1000), BigInt.fromI32(2000), ZERO_BI, BigInt.fromI32(2000), true),
      // 3000: fully harvestable plot.
      new PlotSeedScenario(BigInt.fromI32(3000), BigInt.fromI32(3000), BigInt.fromI32(3000), ZERO_BI, true),
      // 5000: partially harvested plot.
      new PlotSeedScenario(BigInt.fromI32(5000), BigInt.fromI32(3000), ZERO_BI, BigInt.fromI32(1000), true),
      // 9000: untouched plot that should remain unchanged.
      new PlotSeedScenario(BigInt.fromI32(9000), BigInt.fromI32(1000), ZERO_BI, ZERO_BI, false)
    ];

    const combinedIndexes = new Array<BigInt>();
    let totalPods = ZERO_BI;
    let expectedHarvestable = ZERO_BI;
    let expectedHarvested = ZERO_BI;
    let expectedBeansPerPodSum = ZERO_BI;
    let expectedSownBeansPerPodSum = ZERO_BI;
    const sowBeans = beans(1);

    for (let i = 0; i < plotConfigs.length; ++i) {
      const config = plotConfigs[i];

      seedPlotWithHarvests(account, config.index, sowBeans, config.pods, config.harvestable, config.harvested);

      const plot = loadPlot(BEANSTALK, config.index);
      if (config.combine) {
        combinedIndexes.push(config.index);
        totalPods = totalPods.plus(config.pods);
        expectedHarvestable = expectedHarvestable.plus(config.harvestable);
        expectedHarvested = expectedHarvested.plus(config.harvested);
        expectedBeansPerPodSum = expectedBeansPerPodSum.plus(plot.beansPerPod.times(plot.pods));
        expectedSownBeansPerPodSum = expectedSownBeansPerPodSum.plus(plot.sownBeansPerPod.times(plot.pods));
      }
    }

    const targetIndex = combinedIndexes[0];
    const expectedBeansPerPod = expectedBeansPerPodSum.div(totalPods);
    const expectedSownBeansPerPod = expectedSownBeansPerPodSum.div(totalPods);
    const blockNumber = BigInt.fromI32(123);

    combinePlots(account, combinedIndexes, totalPods, blockNumber);

    assert.fieldEquals("Plot", targetIndex.toString(), "pods", totalPods.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "harvestablePods", expectedHarvestable.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "harvestedPods", expectedHarvested.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "beansPerPod", expectedBeansPerPod.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "sownBeansPerPod", expectedSownBeansPerPod.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "combinedAtBlock", blockNumber.toString());
    assert.fieldEquals("Plot", targetIndex.toString(), "fullyHarvested", "false");

    const fieldEntity = loadField(BEANSTALK);
    const fieldIndexes = fieldEntity.plotIndexes;
    assert.assertTrue(fieldIndexes.indexOf(targetIndex) != -1);
    for (let i = 1; i < combinedIndexes.length; ++i) {
      const index = combinedIndexes[i];
      assert.notInStore("Plot", index.toString());
      assert.assertTrue(fieldIndexes.indexOf(index) == -1);
    }
    for (let i = 0; i < plotConfigs.length; ++i) {
      const config = plotConfigs[i];
      if (!config.combine) {
        assert.assertTrue(fieldIndexes.indexOf(config.index) != -1);
        assert.fieldEquals("Plot", config.index.toString(), "pods", config.pods.toString());
        assert.fieldEquals("Plot", config.index.toString(), "harvestablePods", config.harvestable.toString());
        assert.fieldEquals("Plot", config.index.toString(), "harvestedPods", config.harvested.toString());
      }
    }
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
