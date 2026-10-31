import { afterEach, assert, clearStore, test, newMockEvent } from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  handleAutoConvertConfigured,
  handleAutoConvertActivated,
  handleAutoConvertPauseChanged,
  handleAutoConvertEnded,
  handleAutoConvertConfigurationVersion,
  handleAutoConvertRewardFunded,
  handleAutoConvertRewardWithdrawn,
  handleAutoConvertResetPauseStarted,
  handleAutoConvertResetPauseExpired,
  handleAutoConvertPolicyConfigured,
  handleAutoConvertResetPolicyConfigured,
  handleDepositGrownStalkAdjustment,
  handleAutoConvertFlowSample,
  handleAutoConvertFlowState,
  handleAutoConvertDecision,
  handleOrderedDepositInserted,
  handleOrderedDepositRemoved,
  handleSiloDepositsRedeemed,
  handleSiloPintoDepositsSwapped
} from "../src/handlers/AutoConvertEventsHandler";
import { handleAutoConvertBatch } from "../src/handlers/AutoConvertHandler";
import { AutoConvertBatch } from "../generated/Beanstalk-ABIs/PintoAutoConvert";
import {
  handleFeeSettingsInitialized,
  handleFeeChanged,
  handleWellFeeSet,
  handleWellFeeCleared
} from "../src/handlers/PintoFeeSettingsHandler";
const account = Address.fromString("0x0000000000000000000000000000000000000001");
const well = Address.fromString("0x0000000000000000000000000000000000000002");
function n(name: string, value: i32): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromSignedBigInt(BigInt.fromI32(value)));
}
function address(name: string, value: Address): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromAddress(value));
}
function bool(name: string, value: boolean): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromBoolean(value));
}
function event(params: ethereum.EventParam[], index: i32): ethereum.Event {
  const e = newMockEvent();
  e.parameters = params;
  e.logIndex = BigInt.fromI32(index);
  return e;
}
function id(e: ethereum.Event): string {
  return e.transaction.hash.toHexString() + "-" + e.logIndex.toString();
}
afterEach(() => clearStore());
test("controller lifecycle survives pauses, expiry and program replacement; rewards are global", () => {
  const e = event(
    [
      n("programId", 1),
      n("configVersion", 2),
      new ethereum.EventParam("wells", ethereum.Value.fromAddressArray([well]))
    ],
    1
  );
  handleAutoConvertConfigured(e);
  const p = e.address.toHexString() + "-1";
  handleAutoConvertActivated(event([n("programId", 1), n("activationSeason", 100), n("nextEligibleAt", 1000)], 2));
  handleAutoConvertPauseChanged(event([n("programId", 1), bool("paused", true)], 3));
  assert.fieldEquals("AutoConvertProgram", p, "active", "true");
  assert.fieldEquals("AutoConvertProgram", p, "paused", "true");
  handleAutoConvertResetPauseStarted(
    event(
      [n("programId", 1), n("season", 101), n("triggeredAt", 1000), n("previousPauseUntil", 0), n("pauseUntil", 2000)],
      4
    )
  );
  assert.fieldEquals("AutoConvertProgram", p, "resetPauseUntil", "2000");
  handleAutoConvertResetPauseExpired(event([n("programId", 1), n("pauseUntil", 2000)], 5));
  assert.fieldEquals("AutoConvertProgram", p, "resetPauseUntil", "0");
  handleAutoConvertConfigurationVersion(event([n("programId", 1), n("configVersion", 3)], 6));
  assert.fieldEquals("AutoConvertProgram", p, "configVersion", "3");
  handleAutoConvertRewardFunded(event([address("funder", account), n("amount", 100)], 7));
  const batch = changetype<AutoConvertBatch>(
    event(
      [
        n("programId", 1),
        n("observationSeason", 101),
        n("wellCount", 1),
        n("bdvConverted", 50),
        address("executor", account),
        n("reward", 10)
      ],
      8
    )
  );
  handleAutoConvertBatch(batch);
  handleAutoConvertRewardWithdrawn(event([address("recipient", account), n("amount", 20)], 9));
  assert.fieldEquals("AutoConvertController", e.address.toHexString(), "rewardReserve", "70");
  assert.fieldEquals("AutoConvertProgram", p, "totalBdvConverted", "50");
  handleAutoConvertEnded(event([n("programId", 1), n("totalBdvConverted", 50)], 10));
  assert.fieldEquals("AutoConvertProgram", p, "active", "false");
  handleAutoConvertConfigured(
    event(
      [
        n("programId", 2),
        n("configVersion", 4),
        new ethereum.EventParam("wells", ethereum.Value.fromAddressArray([well]))
      ],
      11
    )
  );
  assert.fieldEquals("AutoConvertController", e.address.toHexString(), "rewardReserve", "70");
  assert.fieldEquals(
    "AutoConvertController",
    e.address.toHexString(),
    "currentProgram",
    e.address.toHexString() + "-2"
  );
  assert.entityCount("AutoConvertProgram", 2);
});
test("grown Stalk is absolute, signed, and clears before deposit re-add", () => {
  for (let i = 0; i < 4; i++) {
    const values = [-90, -30, 0, 12];
    const e = event([address("account", account), n("depositId", 123), n("adjustment", values[i])], i);
    handleDepositGrownStalkAdjustment(e);
    assert.fieldEquals("DepositGrownStalkState", account.toHexString() + "-123", "adjustment", values[i].toString());
  }
  assert.entityCount("DepositGrownStalkAdjustmentRecord", 4);
  assert.entityCount("Silo", 0);
});
test("tuple policies and fixed arrays retain every bound", () => {
  const tuple = new ethereum.Tuple();
  tuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(25)));
  tuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000000)));
  tuple.push(ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(500)));
  const e = event([n("programId", 1), new ethereum.EventParam("policy", ethereum.Value.fromTuple(tuple))], 1);
  handleAutoConvertPolicyConfigured(e);
  assert.fieldEquals("AutoConvertPolicyConfiguredRecord", id(e), "policy_maxRewardBps", "25");
  assert.fieldEquals("AutoConvertPolicyConfiguredRecord", id(e), "policy_maxValuePerWellUsd", "1000000");
  assert.fieldEquals("AutoConvertPolicyConfiguredRecord", id(e), "policy_maxLossPerExecutionUsd", "500");
  const reset = event(
    [
      n("programId", 1),
      new ethereum.EventParam(
        "bufferBps",
        ethereum.Value.fromUnsignedBigIntArray([
          BigInt.fromI32(1),
          BigInt.fromI32(2),
          BigInt.fromI32(3),
          BigInt.fromI32(4)
        ])
      )
    ],
    2
  );
  handleAutoConvertResetPolicyConfigured(reset);
  assert.fieldEquals("AutoConvertResetPolicyConfiguredRecord", id(reset), "bufferBps", "[1, 2, 3, 4]");
});
test("flow snapshots distinguish interval close from opening and preserve invalid measurements", () => {
  for (let phase = 0; phase < 2; phase++) {
    const e = event(
      [
        n("programId", 1),
        n("season", 100),
        n("configVersion", 2),
        n("phase", phase),
        n("requiredChillFactor", 48),
        n("chillFactor", 24),
        bool("qualified", false),
        bool("measurementValid", false),
        bool("outflowPaused", true),
        n("liquidityUsd", 1000 + phase),
        n("supplyUsd", 2000)
      ],
      phase
    );
    handleAutoConvertFlowState(e);
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "phase", phase.toString());
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "measurementValid", "false");
  }
  const sample = event(
    [
      n("season", 100),
      address("well", well),
      n("openedAt", 3600),
      n("nativeFlow", -10),
      n("quotePriceUsd", 2000),
      n("tokenUnit", 100),
      n("flowUsd", -200)
    ],
    3
  );
  handleAutoConvertFlowSample(sample);
  assert.fieldEquals("AutoConvertFlowSampleRecord", id(sample), "flowUsd", "-200");
  const failed = event(
    [
      n("programId", 1),
      n("season", 100),
      n("configVersion", 2),
      n("outcome", 2),
      n("reason", 0),
      address("well", Address.zero()),
      n("windowUnits", 352),
      n("gasAllowance", 10012000)
    ],
    4
  );
  handleAutoConvertDecision(failed);
  assert.fieldEquals("AutoConvertDecisionRecord", id(failed), "outcome", "2");
  assert.entityCount("AutoConvertBatchRecord", 0);
});
test("fee overrides including zero survive default changes, and clear follows the default", () => {
  const init = event([n("feeBps", 25), n("version", 1)], 1);
  handleFeeSettingsInitialized(init);
  const settings = init.address.toHexString(),
    key = settings + "-" + well.toHexString();
  handleWellFeeSet(event([address("well", well), n("previousFeeBps", 25), n("feeBps", 0), n("version", 2)], 2));
  handleFeeChanged(event([n("previousFeeBps", 25), n("feeBps", 30), n("version", 3)], 3));
  assert.fieldEquals("PintoWellFeeOverride", key, "configured", "true");
  assert.fieldEquals("PintoWellFeeOverride", key, "feeBps", "0");
  assert.fieldEquals("PintoFeeSettingsState", settings, "defaultFeeBps", "30");
  handleWellFeeCleared(event([address("well", well), n("previousFeeBps", 0), n("feeBps", 30), n("version", 4)], 4));
  handleFeeChanged(event([n("previousFeeBps", 30), n("feeBps", 35), n("version", 5)], 5));
  assert.fieldEquals("PintoWellFeeOverride", key, "configured", "false");
  assert.fieldEquals("PintoFeeSettingsState", settings, "defaultFeeBps", "35");
  assert.entityCount("PintoFeeChangeRecord", 5);
});
test("ordered deposit and redemption records never apply balances twice", () => {
  const hash = Bytes.fromHexString("0x" + "11".repeat(32));
  const inserted = event(
    [
      address("token", well),
      new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(hash)),
      address("account", account),
      n("stem", -10),
      new ethereum.EventParam("previous", ethereum.Value.fromFixedBytes(hash)),
      new ethereum.EventParam("next", ethereum.Value.fromFixedBytes(hash))
    ],
    1
  );
  handleOrderedDepositInserted(inserted);
  handleOrderedDepositRemoved(
    event([address("token", well), new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(hash))], 2)
  );
  assert.fieldEquals("OrderedDepositInsertedRecord", id(inserted), "stem", "-10");
  handleSiloDepositsRedeemed(
    event([address("account", account), address("well", well), n("lpAmount", 10), n("pintoAmount", 9), n("mode", 0)], 3)
  );
  handleSiloPintoDepositsSwapped(
    event(
      [
        address("account", account),
        address("well", well),
        address("tokenOut", well),
        n("pintoAmount", 10),
        n("amountOut", 9),
        n("mode", 1)
      ],
      4
    )
  );
  assert.entityCount("Silo", 0);
  assert.entityCount("SiloDeposit", 0);
  assert.entityCount("SiloDepositsRedeemedRecord", 1);
  assert.entityCount("SiloPintoDepositsSwappedRecord", 1);
});
