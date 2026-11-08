import { beforeEach, afterEach, test, assert, clearStore, newMockEvent } from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { AutoConvertFeePolicyBound } from "../generated/Basin-ABIs/PintoAutoConvert";
import { PintoTradingFlowInvalidated } from "../generated/Basin-ABIs/PintoFeeWell";
import { handleAutoConvertFeePolicyBound } from "../src/handlers/AutoConvertHandler";
import { handlePintoTradingFlowInvalidated } from "../src/handlers/WellHandler";
import { initPintoVersion } from "./entity-mocking/MockVersion";
const futureWell = Address.fromString("0x0000000000000000000000000000000000000002");
const settings = Address.fromString("0x0000000000000000000000000000000000000003");
beforeEach(() => initPintoVersion());
afterEach(() => clearStore());
test("only protocol-bound future Wells may report flow invalidations", () => {
  const invalid = changetype<PintoTradingFlowInvalidated>(newMockEvent());
  invalid.address = futureWell;
  invalid.parameters = [
    new ethereum.EventParam("invalidity", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))),
    new ethereum.EventParam("reason", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2)))
  ];
  handlePintoTradingFlowInvalidated(invalid);
  assert.entityCount("PintoTradingFlowInvalidationRecord", 0);
  const binding = changetype<AutoConvertFeePolicyBound>(newMockEvent());
  binding.parameters = [
    new ethereum.EventParam("well", ethereum.Value.fromAddress(futureWell)),
    new ethereum.EventParam("settings", ethereum.Value.fromAddress(settings)),
    new ethereum.EventParam("feeBps", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(25))),
    new ethereum.EventParam("feeVersion", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)))
  ];
  handleAutoConvertFeePolicyBound(binding);
  handleAutoConvertFeePolicyBound(binding); // admission is idempotent
  handlePintoTradingFlowInvalidated(invalid);
  assert.entityCount("PintoCanonicalFeeWell", 1);
  assert.entityCount("PintoTradingFlowInvalidationRecord", 1);
  assert.fieldEquals(
    "PintoTradingFlowInvalidationRecord",
    invalid.transaction.hash.toHexString() + "-" + invalid.logIndex.toString(),
    "reason",
    "2"
  );
  assert.entityCount("Swap", 0);
});
