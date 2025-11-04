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

      // First: Referee normal sow event
      sow("0x9876543210987654321098765432109876543210", plotStart, beansSown, pods);
      
      // Second: Referee bonus sow event (10% bonus)
      sow("0x9876543210987654321098765432109876543210", plotStart.plus(mil(2)), ZERO_BI, pods.div(BigInt.fromI32(10)));
      
      // Third: Referrer bonus sow event (10% bonus)
      sow(account, plotStart.plus(mil(5)), ZERO_BI, pods.div(BigInt.fromI32(10)));

      // Fourth: SowReferral event (marks 2nd and 3rd sows as referral)
      handleSowReferral(createSowReferralEvent(
        account,
        plotStart.plus(mil(5)),
        pods.div(BigInt.fromI32(10)),
        "0x9876543210987654321098765432109876543210",
        plotStart.plus(mil(2)),
        pods.div(BigInt.fromI32(10))
      ));
    });

    test("Should handle first referral correctly", () => {
      const referrerAccount = account;
      const refereeIndex = plotStart;
      const refereeBonusIndex = plotStart.plus(mil(2));
      const referrerBonusIndex = plotStart.plus(mil(5));
      const referrerBonusPods = pods.div(BigInt.fromI32(10));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", referrerBonusPods.toString());

      assert.fieldEquals("Plot", referrerBonusIndex.toString(), "source", "REFERRAL");
      assert.fieldEquals("Plot", referrerBonusIndex.toString(), "farmer", referrerAccount.toLowerCase());
      assert.fieldEquals("Plot", referrerBonusIndex.toString(), "pods", referrerBonusPods.toString());

      assert.fieldEquals("Plot", refereeBonusIndex.toString(), "source", "REFERRAL");
      assert.fieldEquals("Plot", refereeIndex.toString(), "source", "SOW"); // Original sow stays normal
    });

    test("Should handle multiple referrals for same referrer", () => {
      const referrerAccount = account;
      const referrerBonusIndex = plotStart.plus(mil(5));
      const referrerBonusPods = pods.div(BigInt.fromI32(10));
      
      // First referral already handled in beforeEach, now add second referral
      const secondRefereeAccount = "0x1111111111111111111111111111111111111111";
      const secondRefereeIndex = plotStart.plus(mil(10));
      const secondRefereePods = pods.times(BigInt.fromI32(2));
      const secondRefereeBonusIndex = plotStart.plus(mil(12));
      const secondRefereeBonusPods = pods.div(BigInt.fromI32(5)); // 20% referee bonus
      const secondReferrerBonusIndex = plotStart.plus(mil(15));
      const secondReferrerBonusPods = pods.div(BigInt.fromI32(5)); // 20% referrer reward
      
      const secondRefereeBeans = beansSown.times(BigInt.fromI32(2));

      loadFarmer(Address.fromString(secondRefereeAccount), mockBlock(BEANSTALK_BLOCK));

      sow(secondRefereeAccount, secondRefereeIndex, secondRefereeBeans, secondRefereePods);
      sow(secondRefereeAccount, secondRefereeBonusIndex, ZERO_BI, secondRefereeBonusPods);
      sow(referrerAccount, secondReferrerBonusIndex, ZERO_BI, secondReferrerBonusPods);
      handleSowReferral(createSowReferralEvent(
        referrerAccount,
        secondReferrerBonusIndex,
        secondReferrerBonusPods,
        secondRefereeAccount,
        secondRefereeBonusIndex,
        secondRefereeBonusPods
      ));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "2");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", 
        referrerBonusPods.plus(secondReferrerBonusPods).toString());

      assert.fieldEquals("Plot", referrerBonusIndex.toString(), "source", "REFERRAL");
      assert.fieldEquals("Plot", secondReferrerBonusIndex.toString(), "source", "REFERRAL");
    });

    test("Should handle multiple different referrers", () => {
      const referrerAccount = account;
      const referrerBonusPods = pods.div(BigInt.fromI32(10));
      
      // First referrer already handled in beforeEach, now add different referrer
      const secondReferrerAccount = "0x2222222222222222222222222222222222222222";
      const newRefereeAccount = "0x3333333333333333333333333333333333333333";
      const newRefereeIndex = plotStart.plus(mil(20));
      const newRefereePods = pods.times(BigInt.fromI32(2));
      const newRefereeBonusIndex = plotStart.plus(mil(22));
      const newRefereeBonusPods = pods.div(BigInt.fromI32(10)); // 10% referee bonus
      const secondReferrerBonusIndex = plotStart.plus(mil(25));
      const secondReferrerBonusPods = pods.div(BigInt.fromI32(10)); // 10% referrer reward
      
      const newRefereeBeans = beansSown.times(BigInt.fromI32(2));

      loadFarmer(Address.fromString(secondReferrerAccount), mockBlock(BEANSTALK_BLOCK));
      loadFarmer(Address.fromString(newRefereeAccount), mockBlock(BEANSTALK_BLOCK));

      sow(newRefereeAccount, newRefereeIndex, newRefereeBeans, newRefereePods);
      sow(newRefereeAccount, newRefereeBonusIndex, ZERO_BI, newRefereeBonusPods);
      sow(secondReferrerAccount, secondReferrerBonusIndex, ZERO_BI, secondReferrerBonusPods);
      handleSowReferral(createSowReferralEvent(
        secondReferrerAccount,
        secondReferrerBonusIndex,
        secondReferrerBonusPods,
        newRefereeAccount,
        newRefereeBonusIndex,
        newRefereeBonusPods
      ));

      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", referrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", referrerBonusPods.toString());

      assert.fieldEquals("Farmer", secondReferrerAccount.toLowerCase(), "refereeCount", "1");
      assert.fieldEquals("Farmer", secondReferrerAccount.toLowerCase(), "totalReferralRewardPodsReceived", secondReferrerBonusPods.toString());
    });

    test("Should update field plot indexes", () => {
      const refereeIndex = plotStart;
      const refereeBonusIndex = plotStart.plus(mil(2));
      const referrerBonusIndex = plotStart.plus(mil(5));
      
      const field = loadField(BEANSTALK);
      assert.assertTrue(field.plotIndexes.includes(referrerBonusIndex));
      assert.assertTrue(field.plotIndexes.includes(refereeBonusIndex));
      assert.assertTrue(field.plotIndexes.includes(refereeIndex));
    });
  });
});
