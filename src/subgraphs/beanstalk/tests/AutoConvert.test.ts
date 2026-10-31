import { afterEach, beforeEach, assert, clearStore, test, newMockEvent } from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum, DataSourceContext } from "@graphprotocol/graph-ts";
import { dataSourceMock } from "matchstick-as/assembly/data_source_mock";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import {
  AutoConvertPosition,
  SunriseAutoConvertAttempt,
  AutoConvertFlowObservation
} from "../generated/Beanstalk-ABIs/PintoAutoConvert";
import {
  handleAutoConvertPosition,
  handleSunriseAutoConvertAttempt,
  handleAutoConvertFlowObservation
} from "../src/handlers/AutoConvertHandler";
import { loadGaugesInfo } from "../src/utils/GenGauge";
import { v } from "../src/utils/constants/Version";
import { getBeanstalkPriceAddress, wellFnInfoForWell, isStable2WellFn } from "../../../core/constants/PintoBase";
import { PINTO_USDC, WELL_STABLE2 } from "../../../core/constants/raw/PintoBaseConstants";

const account = Address.fromString("0x0000000000000000000000000000000000000001");
function uint(name: string, n: i32): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(n)));
}
beforeEach(() => {
  dataSourceMock.resetValues();
  initPintoVersion();
});
afterEach(() => {
  clearStore();
  dataSourceMock.resetValues();
});

test("multiple automatic positions in one transaction preserve negative stems and update convert totals once", () => {
  const gauge = loadGaugesInfo();
  gauge.g2IsActive = true;
  gauge.save();
  for (let i = 1; i <= 2; i++) {
    const event = changetype<AutoConvertPosition>(newMockEvent());
    event.address = v().protocolAddress;
    event.logIndex = BigInt.fromI32(i);
    event.parameters = [
      uint("programId", 1),
      new ethereum.EventParam("account", ethereum.Value.fromAddress(account)),
      new ethereum.EventParam("well", ethereum.Value.fromAddress(PINTO_USDC)),
      new ethereum.EventParam("stem", ethereum.Value.fromSignedBigInt(BigInt.fromI32(-i))),
      uint("lpAmount", 100),
      uint("beanAmount", 90),
      uint("bdv", 95)
    ];
    handleAutoConvertPosition(event);
    assert.fieldEquals(
      "AutoConvertPositionRecord",
      event.transaction.hash.toHexString() + "-" + i.toString(),
      "stem",
      (-i).toString()
    );
  }
  assert.entityCount("AutoConvertPositionRecord", 2);
  assert.fieldEquals("Silo", account.toHexString(), "totalBdvConvertUp", "180");
  assert.fieldEquals("Silo", account.toHexString(), "bonusStalkConvertUp", "0");
  assert.fieldEquals("Silo", account.toHexString(), "depositedBDV", "0");
});
test("failed Sunrise attempt preserves reason/gas and creates no successful conversion", () => {
  const event = changetype<SunriseAutoConvertAttempt>(newMockEvent());
  event.parameters = [
    uint("season", 100),
    new ethereum.EventParam("success", ethereum.Value.fromBoolean(false)),
    new ethereum.EventParam("reason", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x01020304"))),
    uint("gasUsed", 12345)
  ];
  handleSunriseAutoConvertAttempt(event);
  assert.fieldEquals(
    "SunriseAutoConvertAttemptRecord",
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
    "success",
    "false"
  );
  assert.entityCount("AutoConvertBatchRecord", 0);
});
test("flow observation stores emitted zero waiting without inventing eligibility", () => {
  const event = changetype<AutoConvertFlowObservation>(newMockEvent());
  event.parameters = [
    uint("season", 100),
    uint("status", 0),
    uint("eligibility", 24),
    uint("waiting", 0),
    uint("allowanceUsd", 123),
    uint("adverseUsd", 0)
  ];
  handleAutoConvertFlowObservation(event);
  assert.fieldEquals(
    "AutoConvertFlowObservationRecord",
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
    "waiting",
    "0"
  );
});
test("release addresses apply only at the configured block; historical Stable2 remains recognized", () => {
  const context = new DataSourceContext();
  const replacement = Address.fromString("0x0000000000000000000000000000000000000011");
  context.setBigInt("pintoUpgradeBlock", BigInt.fromI32(53000000));
  context.setBytes("pintoPriceAddress", replacement);
  context.setBytes("pintoStable2Address", replacement);
  dataSourceMock.setContext(context);
  assert.assertTrue(!getBeanstalkPriceAddress(BigInt.fromI32(52999999)).equals(replacement));
  assert.assertTrue(getBeanstalkPriceAddress(BigInt.fromI32(53000000)).equals(replacement));
  assert.assertTrue(wellFnInfoForWell(PINTO_USDC, BigInt.fromI32(52999999)).address.equals(WELL_STABLE2));
  assert.assertTrue(wellFnInfoForWell(PINTO_USDC, BigInt.fromI32(53000000)).address.equals(replacement));
  assert.assertTrue(isStable2WellFn(replacement));
  assert.assertTrue(isStable2WellFn(WELL_STABLE2));
});
