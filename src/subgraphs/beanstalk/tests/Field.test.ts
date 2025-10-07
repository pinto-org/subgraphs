import { afterEach, beforeEach, assert, clearStore, describe, test, log } from "matchstick-as/assembly/index";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK, BEANSTALK_BLOCK } from "../../../core/constants/raw/BeanstalkEthConstants";
import { BI_10, ZERO_BI } from "../../../core/utils/Decimals";
import { beans_BI as beans, podlineMil_BI as mil } from "../../../core/tests/Values";
import { assertFarmerHasPlot, assertFieldHas, combinePlots, sow } from "./utils/Field";
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
    const plotIndices = [1000, 3000, 5000, 9000];
    const podSizes = [2000, 2000, 4000, 1000];

    for (let i = 0; i < plotIndices.length; ++i) {
      sow(account, BigInt.fromI32(plotIndices[i]), beans(1), BigInt.fromI32(podSizes[i]));
    }

    const harvestableValues = [100, 150, 75, 0];
    const harvestedValues = [50, 25, 0, 0];

    for (let i = 0; i < harvestableValues.length; ++i) {
      const plot = loadPlot(BEANSTALK, BigInt.fromI32(plotIndices[i]));
      plot.harvestablePods = BigInt.fromI32(harvestableValues[i]);
      plot.harvestedPods = BigInt.fromI32(harvestedValues[i]);
      plot.save();
    }

    const index1000 = BigInt.fromI32(plotIndices[0]);
    const index3000 = BigInt.fromI32(plotIndices[1]);
    const index5000 = BigInt.fromI32(plotIndices[2]);
    const index9000 = BigInt.fromI32(plotIndices[3]);

    let totalPods = ZERO_BI;
    let expectedHarvestable = ZERO_BI;
    let expectedHarvested = ZERO_BI;
    let expectedBeansPerPodSum = ZERO_BI;
    let expectedSownBeansPerPodSum = ZERO_BI;
    for (let i = 0; i < 3; ++i) {
      const plot = loadPlot(BEANSTALK, BigInt.fromI32(plotIndices[i]));
      totalPods = totalPods.plus(BigInt.fromI32(podSizes[i]));
      expectedHarvestable = expectedHarvestable.plus(BigInt.fromI32(harvestableValues[i]));
      expectedHarvested = expectedHarvested.plus(BigInt.fromI32(harvestedValues[i]));
      expectedBeansPerPodSum = expectedBeansPerPodSum.plus(plot.beansPerPod.times(plot.pods));
      expectedSownBeansPerPodSum = expectedSownBeansPerPodSum.plus(
        plot.sownBeansPerPod.times(plot.pods)
      );
    }
    const expectedBeansPerPod = expectedBeansPerPodSum.div(totalPods);
    const expectedSownBeansPerPod = expectedSownBeansPerPodSum.div(totalPods);
    const podsD = BigInt.fromI32(podSizes[3]);
    const blockNumber = BigInt.fromI32(123);

    const combinedIndexes: BigInt[] = [index1000, index3000, index5000];
    combinePlots(account, combinedIndexes, totalPods, blockNumber);

    assert.fieldEquals("Plot", index1000.toString(), "pods", totalPods.toString());
    assert.fieldEquals("Plot", index1000.toString(), "harvestablePods", expectedHarvestable.toString());
    assert.fieldEquals("Plot", index1000.toString(), "harvestedPods", expectedHarvested.toString());
    assert.fieldEquals("Plot", index1000.toString(), "beansPerPod", expectedBeansPerPod.toString());
    assert.fieldEquals("Plot", index1000.toString(), "sownBeansPerPod", expectedSownBeansPerPod.toString());
    assert.fieldEquals("Plot", index1000.toString(), "combinedAtBlock", blockNumber.toString());
    assert.fieldEquals("Plot", index1000.toString(), "fullyHarvested", "false");

    assert.notInStore("Plot", index3000.toString());
    assert.notInStore("Plot", index5000.toString());

    const fieldEntity = loadField(BEANSTALK);
    const fieldIndexes = fieldEntity.plotIndexes;
    assert.assertTrue(fieldIndexes.indexOf(index3000) == -1);
    assert.assertTrue(fieldIndexes.indexOf(index5000) == -1);
    assert.assertTrue(fieldIndexes.indexOf(index1000) != -1);
    assert.assertTrue(fieldIndexes.indexOf(index9000) != -1);

    assert.fieldEquals("Plot", index9000.toString(), "pods", podsD.toString());
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
