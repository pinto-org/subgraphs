import { afterEach, beforeEach, assert, clearStore, describe, test, log } from "matchstick-as/assembly/index";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK, BEANSTALK_BLOCK } from "../../../core/constants/raw/BeanstalkEthConstants";
import { BI_10, ZERO_BI } from "../../../core/utils/Decimals";
import { beans_BI as beans, podlineMil_BI as mil } from "../../../core/tests/Values";
import { assertFarmerHasPlot, assertFieldHas, sow } from "./utils/Field";
import { initL1Version } from "./entity-mocking/MockVersion";
import { simpleMockPrice } from "../../../core/tests/event-mocking/Price";
import { handleTemperatureChange, handleSowReferral, handleSow } from "../src/handlers/FieldHandler";
import { createTemperatureChangeEvent, createSowReferralEvent, createSowEvent } from "./event-mocking/Field";
import { loadField } from "../src/entities/Field";
import { takeFieldSnapshots } from "../src/entities/snapshots/Field";
import { mockBlock } from "../../../core/tests/event-mocking/Block";
import { loadFarmer } from "../src/entities/Beanstalk";
import { Address } from "@graphprotocol/graph-ts";

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

  describe("SowReferral Event Handling", () => {
    beforeEach(() => {
      loadField(BEANSTALK);
      loadFarmer(Address.fromString(account), mockBlock(BEANSTALK_BLOCK));
      loadFarmer(Address.fromString("0x9876543210987654321098765432109876543210"), mockBlock(BEANSTALK_BLOCK));
    });

    test("Should handle first referral correctly", () => {
      const referrerAccount = account;
      const refereeAccount = "0x9876543210987654321098765432109876543210";
      const referrerIndex = plotStart.plus(mil(5));
      const referrerPods = pods.div(BigInt.fromI32(10));
      const refereeIndex = plotStart;
      const refereePods = pods;

      // First: Use sow utility for referee plot creation (includes proper mocking)
      sow(refereeAccount, refereeIndex, beansSown, refereePods);

      // Second: Handle SowReferral event (referrer plot creation)
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        referrerIndex,
        referrerPods,
        refereeAccount,
        refereeIndex,
        refereePods
      ));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", referrerPods.toString());

      assert.fieldEquals("Plot", referrerIndex.toString(), "isReferralReward", "true");
      assert.fieldEquals("Plot", referrerIndex.toString(), "farmer", referrerAccount.toLowerCase());
      assert.fieldEquals("Plot", referrerIndex.toString(), "pods", referrerPods.toString());

      assert.fieldEquals("Plot", refereeIndex.toString(), "isReferralReward", "false");
    });

    test("Should handle multiple referrals for same referrer", () => {
      const referrerAccount = account;
      const refereeAccount = "0x9876543210987654321098765432109876543210";
      const referrerIndex = plotStart.plus(mil(5));
      const referrerPods = pods.div(BigInt.fromI32(10));
      const refereeIndex = plotStart;
      const refereePods = pods;
      
      const secondRefereeAccount = "0x1111111111111111111111111111111111111111";
      const secondRefereeIndex = plotStart.plus(mil(10));
      const secondRefereePods = pods.times(BigInt.fromI32(2));
      const secondReferrerIndex = plotStart.plus(mil(15));
      const secondReferrerPods = pods.div(BigInt.fromI32(5));
      
      const secondRefereeBeans = beansSown.times(BigInt.fromI32(2));

      loadFarmer(Address.fromString(secondRefereeAccount), mockBlock(BEANSTALK_BLOCK));

      // First sequence: Sow + SowReferral
      sow(refereeAccount, refereeIndex, beansSown, refereePods);
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        referrerIndex,
        referrerPods,
        refereeAccount,
        refereeIndex,
        refereePods
      ));

      // Second sequence: Sow + SowReferral
      sow(secondRefereeAccount, secondRefereeIndex, secondRefereeBeans, secondRefereePods);
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        secondReferrerIndex,
        secondReferrerPods,
        secondRefereeAccount,
        secondRefereeIndex,
        secondRefereePods
      ));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "2");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", 
        referrerPods.plus(secondReferrerPods).toString());

      assert.fieldEquals("Plot", referrerIndex.toString(), "isReferralReward", "true");
      assert.fieldEquals("Plot", secondReferrerIndex.toString(), "isReferralReward", "true");
    });

    test("Should handle multiple different referrers", () => {
      const referrerAccount = account;
      const refereeAccount = "0x9876543210987654321098765432109876543210";
      const referrerIndex = plotStart.plus(mil(5));
      const referrerPods = pods.div(BigInt.fromI32(10));
      const refereeIndex = plotStart;
      const refereePods = pods;
      
      const secondReferrerAccount = "0x2222222222222222222222222222222222222222";
      const secondReferrerIndex = plotStart.plus(mil(20));
      const secondReferrerPods = pods.div(BigInt.fromI32(8));
      
      const secondRefereeBeans = beansSown.times(BigInt.fromI32(2));
      const secondRefereePods = pods.times(BigInt.fromI32(2));

      loadFarmer(Address.fromString(secondReferrerAccount), mockBlock(BEANSTALK_BLOCK));

      // First sequence: Sow + SowReferral (first referrer)
      sow(refereeAccount, refereeIndex, beansSown, refereePods);
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        referrerIndex,
        referrerPods,
        refereeAccount,
        refereeIndex,
        refereePods
      ));

      // Second sequence: Sow + SowReferral (second referrer, same referee)
      sow(refereeAccount, plotStart.plus(mil(25)), secondRefereeBeans, secondRefereePods);
      handleSowReferral(createSowReferralEvent(
        secondReferrerAccount,
        secondReferrerIndex,
        secondReferrerPods,
        refereeAccount,
        plotStart.plus(mil(25)),
        secondRefereePods
      ));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", referrerPods.toString());

      assert.fieldEquals("Farmer", secondReferrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", secondReferrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", secondReferrerPods.toString());
    });

    test("Should update field plot indexes", () => {
      const referrerAccount = account;
      const refereeAccount = "0x9876543210987654321098765432109876543210";
      const referrerIndex = plotStart.plus(mil(5));
      const referrerPods = pods.div(BigInt.fromI32(10));
      const refereeIndex = plotStart;
      const refereePods = pods;
      
      // First: Use sow utility for referee plot creation (includes proper mocking)
      sow(refereeAccount, refereeIndex, beansSown, refereePods);
      
      // Second: Handle SowReferral event (referrer plot creation)
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        referrerIndex,
        referrerPods,
        refereeAccount,
        refereeIndex,
        refereePods
      ));

      const field = loadField(BEANSTALK);
      assert.assertTrue(field.plotIndexes.includes(referrerIndex));
      assert.assertTrue(field.plotIndexes.includes(refereeIndex));
    });
  });
});
