import { SiloRedemptionPolicyState } from "../generated/schema";
import { removeAutoConvertWell, updateDeferredRedemptionSeason } from "../src/utils/AutoConvertState";
import { afterEach, assert, clearStore, test, newMockEvent } from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  handleAutoConvertConfigured,
  handleAutoConvertActivated,
  handleAutoConvertPauseChanged,
  handleAutoConvertEnded,
  handleAutoConvertConfigurationVersion,
  handleAutoConvertResetPauseStarted,
  handleAutoConvertResetPauseExpired,
  handleAutoConvertResetPolicyConfigured,
  handleAutoConvertParameters,
  handleAutoConvertWaitingPolicyConfigured,
  handleAutoConvertDurationsConfigured,
  handleAutoConvertPricePolicyConfigured,
  handleAutoConvertFlowAllowanceConfigured,
  handleAutoConvertOutflowMultiplierConfigured,
  handleAutoConvertMinPositionValueConfigured,
  handleAutoConvertMinPositionValueApplied,
  handleAutoConvertPositionFloorSet,
  handleAutoConvertPositionFloorReleased,
  handleAutoConvertResetPauseUpdated,
  handleAutoConvertResetPauseClearedByCompletion,
  handleAutoConvertWhitelistChanged,
  handleOrderedDepositBackfillOperatorSet,
  handleOrderedDepositMigrationVerified,
  handleSiloRedemptionInitialized,
  handleSiloRedemptionEmaConfigured,
  handleSiloRedemptionEmaUpdated,
  handleDepositGrownStalkAdjustment,
  handleAutoConvertFlowSample,
  handleAutoConvertFlowState,
  handleAutoConvertDecision,
  handleOrderedDepositInserted,
  handleOrderedDepositRemoved,
  handleSiloDepositsRedeemed,
  handleSiloPintoDepositsSwapped
} from "../src/handlers/AutoConvertEventsHandler";
import { handleAutoConvertBatch, handleAutoConvertWell } from "../src/handlers/AutoConvertHandler";
import { AutoConvertBatch, AutoConvertWell } from "../generated/Beanstalk-ABIs/PintoAutoConvert";
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
function tuple(name: string, params: ethereum.EventParam[]): ethereum.EventParam {
  const values = new ethereum.Tuple();
  for (let i = 0; i < params.length; ++i) values.push(params[i].value);
  return new ethereum.EventParam(name, ethereum.Value.fromTuple(values));
}
function id(e: ethereum.Event): string {
  return e.transaction.hash.toHexString() + "-" + e.logIndex.toString();
}
afterEach(() => clearStore());
test("controller lifecycle survives pauses, expiry and program replacement", () => {
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
  handleAutoConvertActivated(event([n("programId", 1), n("activationSeason", 100)], 2));
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
  const batch = changetype<AutoConvertBatch>(
    event(
      [
        n("programId", 1),
        n("observationSeason", 101),
        n("wellCount", 1),
        n("bdvConverted", 50),
        address("executor", account),
        n("reward", 0),
        tuple("details", [
          n("configVersion", 3),
          n("mode", 2),
          n("marketTargetWad", 1000),
          n("targetPriceWad", 950),
          n("referenceLossUsd", 15),
          bool("inventoryLimited", true)
        ])
      ],
      8
    )
  );
  handleAutoConvertBatch(batch);
  assert.fieldEquals("AutoConvertBatchRecord", id(batch), "details_referenceLossUsd", "15");
  assert.fieldEquals("AutoConvertBatchRecord", id(batch), "details_inventoryLimited", "true");
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
  assert.fieldEquals(
    "AutoConvertController",
    e.address.toHexString(),
    "currentProgram",
    e.address.toHexString() + "-2"
  );
  assert.entityCount("AutoConvertProgram", 2);
});
test("merged Well keeps zero-leg plan flags without inventing account balances", () => {
  const e = event(
    [
      n("programId", 1),
      n("observationSeason", 101),
      address("well", well),
      n("lpAmount", 0),
      n("beanAmount", 0),
      n("bdvConverted", 0),
      tuple("plan", [
        n("currentPriceWad", 1100),
        n("postPriceWad", 1100),
        n("valueUsd", 0),
        n("lossUsd", 0),
        n("flags", 1)
      ])
    ],
    1
  );
  handleAutoConvertWell(changetype<AutoConvertWell>(e));
  assert.fieldEquals("AutoConvertWellRecord", id(e), "plan_flags", "1");
  assert.fieldEquals("AutoConvertWellRecord", id(e), "plan_currentPriceWad", "1100");
  assert.fieldEquals("AutoConvertWellRecord", id(e), "lpAmount", "0");
  assert.entityCount("Silo", 0);
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
test("global policies retain all matrix cells and durations without inventing a program", () => {
  const rows = new Array<ethereum.Value>();
  for (let row = 0; row < 4; ++row) {
    const values = new Array<BigInt>();
    for (let col = 0; col < 4; ++col) values.push(BigInt.fromI32(row * 4 + col));
    rows.push(ethereum.Value.fromUnsignedBigIntArray(values));
  }
  const waits = event(
    [new ethereum.EventParam("waitingObservations", ethereum.Value.fromArray(rows)), n("launchRemaining", 10)],
    1
  );
  handleAutoConvertWaitingPolicyConfigured(waits);
  assert.fieldEquals(
    "AutoConvertWaitingPolicyConfiguredRecord",
    id(waits),
    "waitingObservations",
    "[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]"
  );
  const durations = new Array<BigInt>();
  for (let i = 0; i < 144; ++i) durations.push(BigInt.fromI32(i + 1));
  const duration = event(
    [new ethereum.EventParam("durationSeasonsByCase", ethereum.Value.fromUnsignedBigIntArray(durations))],
    2
  );
  handleAutoConvertDurationsConfigured(duration);
  assert.fieldEquals(
    "AutoConvertDurationsConfiguredRecord",
    id(duration),
    "durationSeasonsByCase",
    "[" + durations.map<string>((x) => x.toString()).join(", ") + "]"
  );
  const price = event([n("maxStepBps", 100), n("minimumFeeBps", 25)], 3);
  handleAutoConvertPricePolicyConfigured(price);
  const flow = event([n("liquidityFraction", 10), n("supplyFraction", 20), n("minimumUsd", 1000000)], 4);
  handleAutoConvertFlowAllowanceConfigured(flow);
  handleAutoConvertOutflowMultiplierConfigured(
    event([n("previousMultiplierBps", 30000), n("multiplierBps", 20000)], 5)
  );
  const c = waits.address.toHexString();
  assert.fieldEquals("AutoConvertController", c, "waitingPolicy", id(waits));
  assert.fieldEquals("AutoConvertController", c, "durations", id(duration));
  assert.fieldEquals("AutoConvertController", c, "pricePolicy", id(price));
  assert.fieldEquals("AutoConvertController", c, "flowAllowancePolicy", id(flow));
  assert.fieldEquals("AutoConvertController", c, "outflowMultiplierBps", "20000");
  assert.entityCount("AutoConvertProgram", 0);
});
test("USD policy staging cannot publish a Well floor before its pass boundary", () => {
  const e = event([n("programId", 1), n("configVersion", 2)], 1);
  handleAutoConvertParameters(e); // Latest event has only two parameters.
  const p = e.address.toHexString() + "-1";
  const w = p + "-" + well.toHexString();
  const other = Address.fromString("0x0000000000000000000000000000000000000003");
  handleAutoConvertPositionFloorSet(
    event(
      [
        n("programId", 1),
        address("well", well),
        n("season", 100),
        n("previousFloorLp", 0),
        n("floorLp", 50),
        bool("rewound", true)
      ],
      2
    )
  );
  handleAutoConvertPositionFloorSet(
    event(
      [
        n("programId", 1),
        address("well", other),
        n("season", 100),
        n("previousFloorLp", 0),
        n("floorLp", 70),
        bool("rewound", false)
      ],
      3
    )
  );
  handleAutoConvertMinPositionValueConfigured(event([n("valueUsd", 20000000)], 4));
  const c = e.address.toHexString();
  assert.fieldEquals("AutoConvertController", c, "minPositionValueConfiguredUsd", "20000000");
  handleAutoConvertMinPositionValueApplied(event([n("valueUsd", 20000000), n("season", 101)], 5));
  assert.fieldEquals("AutoConvertController", c, "minPositionValueAppliedSeason", "101");
  assert.fieldEquals("AutoConvertWellState", w, "minPositionLp", "50");
  handleAutoConvertPositionFloorSet(
    event(
      [
        n("programId", 1),
        address("well", well),
        n("season", 102),
        n("previousFloorLp", 50),
        n("floorLp", 90),
        bool("rewound", true)
      ],
      6
    )
  );
  assert.fieldEquals("AutoConvertWellState", w, "minPositionLp", "90");
  assert.fieldEquals("AutoConvertWellState", p + "-" + other.toHexString(), "minPositionLp", "70");
  handleAutoConvertPositionFloorReleased(
    event([n("programId", 1), address("well", well), n("season", 103), n("previousFloorLp", 90), n("floorLp", 1)], 7)
  );
  assert.fieldEquals("AutoConvertWellState", w, "minPositionLp", "1");
  assert.entityCount("Silo", 0);
});
test("scalar reset policy and live pause updates clear on completion", () => {
  const reset = event([n("programId", 1), n("bufferBps", 250)], 1);
  handleAutoConvertResetPolicyConfigured(reset);
  assert.fieldEquals("AutoConvertResetPolicyConfiguredRecord", id(reset), "bufferBps", "250");
  const p = reset.address.toHexString() + "-1";
  handleAutoConvertResetPauseUpdated(event([n("programId", 1), n("previousUntil", 2000), n("pauseUntil", 1500)], 2));
  assert.fieldEquals("AutoConvertProgram", p, "resetPauseUntil", "1500");
  handleAutoConvertResetPauseClearedByCompletion(event([n("programId", 1), n("pauseUntil", 1500)], 3));
  assert.fieldEquals("AutoConvertProgram", p, "resetPauseUntil", "0");
});
test("EMA configuration remains distinct from the active threshold until Sunrise", () => {
  const init = event([n("minGrownStalkPerBdv", 48), n("season", 100)], 1);
  handleSiloRedemptionInitialized(init);
  const initial = SiloRedemptionPolicyState.load(init.address.toHexString())!;
  assert.bigIntEquals(initial.activeSeasons, BigInt.fromI32(24));
  assert.bigIntEquals(initial.configuredSeasons, BigInt.fromI32(24));
  assert.bigIntEquals(initial.lastSeason, BigInt.fromI32(100));
  assert.assertTrue(initial.meanScaled === null);
  handleSiloRedemptionEmaUpdated(
    event(
      [
        n("season", 101),
        new ethereum.EventParam(
          "meanScaled",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromString("2000000000000000000"))
        ),
        n("seasons", 24),
        n("threshold", 48)
      ],
      3
    )
  );
  assert.fieldEquals("SiloRedemptionPolicyState", init.address.toHexString(), "configuredSeasons", "24");
  handleSiloRedemptionEmaConfigured(event([n("seasons", 36)], 4));
  const key = init.address.toHexString();
  assert.fieldEquals("SiloRedemptionPolicyState", key, "configuredSeasons", "36");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "activeSeasons", "24");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "threshold", "48");
  handleSiloRedemptionEmaUpdated(
    event(
      [
        n("season", 102),
        new ethereum.EventParam(
          "meanScaled",
          ethereum.Value.fromUnsignedBigInt(BigInt.fromString("3000000000000000000"))
        ),
        n("seasons", 36),
        n("threshold", 108)
      ],
      5
    )
  );
  assert.fieldEquals("SiloRedemptionPolicyState", key, "activeSeasons", "36");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "threshold", "108");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "initializedSeason", "100");
});
test("backfill verification preserves its digest and closes operator access", () => {
  const e = event([address("token", well), address("operator", account)], 1);
  handleOrderedDepositBackfillOperatorSet(e);
  const key = e.address.toHexString() + "-" + well.toHexString();
  assert.fieldEquals("OrderedDepositMigrationState", key, "configured", "true");
  assert.fieldEquals("OrderedDepositMigrationState", key, "verified", "false");
  const digest = Bytes.fromHexString("0x" + "11".repeat(32));
  handleOrderedDepositMigrationVerified(
    event(
      [address("token", well), new ethereum.EventParam("verificationDigest", ethereum.Value.fromFixedBytes(digest))],
      2
    )
  );
  assert.fieldEquals("OrderedDepositMigrationState", key, "operator", Address.zero().toHexString());
  assert.fieldEquals("OrderedDepositMigrationState", key, "verified", "true");
  assert.fieldEquals("OrderedDepositMigrationState", key, "verificationDigest", digest.toHexString());
  assert.entityCount("Silo", 0);
});
test("flow snapshots distinguish interval close from opening and preserve invalid measurements", () => {
  for (let phase = 0; phase < 2; phase++) {
    const e = event(
      [
        n("programId", 1),
        n("season", 100),
        n("configVersion", 2),
        n("phase", phase),
        tuple("state", [
          n("requiredChillFactor", 48),
          n("chillFactor", 24),
          bool("qualified", false),
          bool("measurementValid", false),
          bool("outflowPaused", true),
          n("liquidityUsd", 1000 + phase),
          n("supplyUsd", 2000),
          bool("observationProcessed", phase == 0),
          n("status", 1),
          n("observationAllowanceUsd", 0),
          n("adverseUsd", 0),
          bool("openingValid", phase == 1),
          n("pintoPriceUsd", 900000),
          n("openingAllowanceUsd", 100)
        ])
      ],
      phase
    );
    handleAutoConvertFlowState(e);
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "phase", phase.toString());
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "state_measurementValid", "false");
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "state_openingValid", phase == 1 ? "true" : "false");
    assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "state_liquidityUsd", (1000 + phase).toString());
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
      n("gasAllowance", 10012000),
      new ethereum.EventParam("failureSelector", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x01020304"))),
      n("gasUsed", 12345)
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

test("removing a Well clears only its effective floor and keeps survivor flow history", () => {
  const configured = event(
    [
      n("programId", 1),
      n("configVersion", 1),
      new ethereum.EventParam("wells", ethereum.Value.fromAddressArray([well, account]))
    ],
    1
  );
  handleAutoConvertConfigured(configured);
  const p = configured.address.toHexString() + "-1";
  handleAutoConvertPositionFloorSet(
    event(
      [
        n("programId", 1),
        address("well", well),
        n("season", 100),
        n("previousFloorLp", 0),
        n("floorLp", 50),
        bool("rewound", true)
      ],
      2
    )
  );
  handleAutoConvertPositionFloorSet(
    event(
      [
        n("programId", 1),
        address("well", account),
        n("season", 100),
        n("previousFloorLp", 0),
        n("floorLp", 70),
        bool("rewound", true)
      ],
      3
    )
  );
  const flow = event(
    [
      n("programId", 1),
      n("season", 100),
      n("configVersion", 1),
      n("phase", 1),
      tuple("state", [
        n("requiredChillFactor", 48),
        n("chillFactor", 48),
        bool("qualified", true),
        bool("measurementValid", true),
        bool("outflowPaused", false),
        n("liquidityUsd", 1000),
        n("supplyUsd", 2000),
        bool("observationProcessed", true),
        n("status", 0),
        n("observationAllowanceUsd", 100),
        n("adverseUsd", 0),
        bool("openingValid", true),
        n("pintoPriceUsd", 900000),
        n("openingAllowanceUsd", 100)
      ])
    ],
    4
  );
  handleAutoConvertFlowState(flow);
  handleAutoConvertWhitelistChanged(event([address("well", well), n("configVersion", 2)], 5));
  assert.fieldEquals("AutoConvertProgram", p, "configVersion", "2");
  removeAutoConvertWell(configured, well);
  assert.fieldEquals("AutoConvertWellState", p + "-" + well.toHexString(), "whitelisted", "false");
  assert.fieldEquals("AutoConvertWellState", p + "-" + account.toHexString(), "minPositionLp", "70");
  assert.fieldEquals("AutoConvertProgram", p, "flowState", id(flow));
  assert.entityCount("AutoConvertPositionFloorSetRecord", 2);
});

test("legacy deferred redemption tracks every Sunrise without manufacturing EMA updates", () => {
  const init = event([n("minGrownStalkPerBdv", 0), n("season", 100)], 100);
  const key = init.address.toHexString();
  updateDeferredRedemptionSeason(init, BigInt.fromI32(99));
  assert.entityCount("SiloRedemptionPolicyState", 0);
  handleSiloRedemptionInitialized(init);
  assert.fieldEquals("SiloRedemptionPolicyState", key, "meanScaled", "0");
  handleSiloRedemptionEmaConfigured(event([n("seasons", 36)], 101));
  for (let season = 101; season <= 104; season++) {
    updateDeferredRedemptionSeason(init, BigInt.fromI32(season));
    assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", season.toString());
    assert.fieldEquals("SiloRedemptionPolicyState", key, "threshold", "0");
    assert.fieldEquals("SiloRedemptionPolicyState", key, "meanScaled", "0");
    assert.fieldEquals("SiloRedemptionPolicyState", key, "activeSeasons", "24");
    assert.fieldEquals("SiloRedemptionPolicyState", key, "configuredSeasons", "36");
  }
  assert.entityCount("SiloRedemptionEmaUpdatedRecord", 0);
  updateDeferredRedemptionSeason(init, BigInt.fromI32(103));
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "104");
  const opened = event([n("season", 105), n("meanScaled", 3000), n("seasons", 36), n("threshold", 108)], 102);
  handleSiloRedemptionEmaUpdated(opened);
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "105");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "threshold", "108");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "meanScaled", "3000");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "activeSeasons", "36");
  updateDeferredRedemptionSeason(init, BigInt.fromI32(106));
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "105");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastEvent", id(opened));
  handleSiloRedemptionEmaUpdated(
    event([n("season", 106), n("meanScaled", 4000), n("seasons", 36), n("threshold", 144)], 103)
  );
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "106");
  assert.entityCount("SiloRedemptionEmaUpdatedRecord", 2);
});

test("above-peg freeze status 6 is retained as valid raw close-phase telemetry", () => {
  const e = event(
    [
      n("programId", 1),
      n("season", 101),
      n("configVersion", 1),
      n("phase", 0),
      tuple("state", [
        n("requiredChillFactor", 48),
        n("chillFactor", 24),
        bool("qualified", false),
        bool("measurementValid", true),
        bool("outflowPaused", false),
        n("liquidityUsd", 1000),
        n("supplyUsd", 2000),
        bool("observationProcessed", true),
        n("status", 6),
        n("observationAllowanceUsd", 0),
        n("adverseUsd", 0),
        bool("openingValid", true),
        n("pintoPriceUsd", 1000000),
        n("openingAllowanceUsd", 100)
      ])
    ],
    110
  );
  handleAutoConvertFlowState(e);
  assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "state_status", "6");
  assert.fieldEquals("AutoConvertFlowStateRecord", id(e), "state_measurementValid", "true");
  assert.entityCount("AutoConvertBatchRecord", 0);
});

test("current release opens immediately and waits for real EMA logs to change policy state", () => {
  const init = event([n("minGrownStalkPerBdv", 25), n("season", 100)], 120);
  const key = init.address.toHexString();
  handleSiloRedemptionInitialized(init);
  assert.fieldEquals("SiloRedemptionPolicyState", key, "threshold", "25");
  assert.assertTrue(SiloRedemptionPolicyState.load(key)!.meanScaled === null);
  updateDeferredRedemptionSeason(init, BigInt.fromI32(101));
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "100");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastEvent", id(init));
  assert.entityCount("SiloRedemptionEmaUpdatedRecord", 0);
  const update = event(
    [
      n("season", 101),
      new ethereum.EventParam(
        "meanScaled",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1000000000000000001"))
      ),
      n("seasons", 24),
      n("threshold", 25)
    ],
    121
  );
  handleSiloRedemptionEmaUpdated(update);
  assert.fieldEquals("SiloRedemptionPolicyState", key, "meanScaled", "1000000000000000001");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastSeason", "101");
  assert.fieldEquals("SiloRedemptionPolicyState", key, "lastEvent", id(update));
  assert.entityCount("SiloRedemptionEmaUpdatedRecord", 1);
});

test("empty automatic selection is skipped with actual child telemetry and no conversion balances", () => {
  const e = event(
    [
      n("programId", 1),
      n("season", 101),
      n("configVersion", 2),
      n("outcome", 0),
      n("reason", 15),
      address("well", Address.zero()),
      n("windowUnits", 352),
      n("gasAllowance", 10012000),
      new ethereum.EventParam("failureSelector", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x31931c09"))),
      n("gasUsed", 12345)
    ],
    122
  );
  handleAutoConvertDecision(e);
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "outcome", "0");
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "reason", "15");
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "failureSelector", "0x31931c09");
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "windowUnits", "352");
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "gasAllowance", "10012000");
  assert.fieldEquals("AutoConvertDecisionRecord", id(e), "gasUsed", "12345");
  assert.fieldEquals("AutoConvertProgram", e.address.toHexString() + "-1", "lastDecision", id(e));
  assert.fieldEquals("AutoConvertProgram", e.address.toHexString() + "-1", "totalBdvConverted", "0");
  assert.entityCount("AutoConvertBatchRecord", 0);
  assert.entityCount("AutoConvertPositionRecord", 0);
  assert.entityCount("Silo", 0);
});
