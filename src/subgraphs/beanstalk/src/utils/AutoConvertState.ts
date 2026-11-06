import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  AutoConvertController,
  AutoConvertProgram,
  AutoConvertWellState,
  DepositGrownStalkState,
  OrderedDepositMigrationState,
  SiloRedemptionPolicyState
} from "../../generated/schema";

function controller(event: ethereum.Event): AutoConvertController {
  const id = event.address.toHexString();
  let row = AutoConvertController.load(id);
  if (row == null) row = new AutoConvertController(id);
  return row;
}
function program(event: ethereum.Event, number: BigInt): AutoConvertProgram {
  const id = event.address.toHexString() + "-" + number.toString();
  let row = AutoConvertProgram.load(id);
  if (row == null) {
    row = new AutoConvertProgram(id);
    row.programId = number;
    row.active = false;
    row.paused = false;
    row.totalBdvConverted = BigInt.zero();
  }
  return row;
}
function wellState(p: AutoConvertProgram, well: ethereum.Value): AutoConvertWellState {
  const address = well.toAddress();
  const id = p.id + "-" + address.toHexString();
  let row = AutoConvertWellState.load(id);
  if (row == null) {
    row = new AutoConvertWellState(id);
    row.program = p.id;
    row.well = address;
  }
  return row;
}
// DewhitelistToken is canonical membership evidence; the version-only event does
// not say whether a Well was added or removed and must not erase survivors.
export function removeAutoConvertWell(event: ethereum.Event, well: Address): void {
  const c = AutoConvertController.load(event.address.toHexString());
  if (c == null) return;
  const current = c.currentProgram;
  if (current == null) return;
  const w = AutoConvertWellState.load(current! + "-" + well.toHexString());
  if (w == null) return;
  w.whitelisted = false;
  w.unset("minPositionLp");
  w.unset("floorSeason");
  w.unset("floorRewound");
  w.save();
}
// Legacy deferred builds advance the cursor without EmaUpdated; current releases
// initialize a nonzero threshold and never enter this path. Sunrise
// precedes stepEma; a later update log in the same transaction supplies seeded values.
// Keep lastEvent tied to a real policy record rather than inventing an EMA event.
export function updateDeferredRedemptionSeason(event: ethereum.Event, season: BigInt): void {
  const row = SiloRedemptionPolicyState.load(event.address.toHexString());
  if (row == null || !row.threshold.isZero() || row.configuredSeasons.isZero() || season.le(row.lastSeason)) return;
  row.lastSeason = season;
  row.save();
}
// Called after immutable payloads are saved. No eth_calls and no balance writes.
export function updateAutoConvertState(name: string, event: ethereum.Event, record: string): void {
  const a = event.parameters;
  if (name == "DepositGrownStalkAdjustment") {
    const id = a[0].value.toAddress().toHexString() + "-" + a[1].value.toBigInt().toString();
    const row = new DepositGrownStalkState(id);
    row.account = a[0].value.toAddress();
    row.depositId = a[1].value.toBigInt();
    row.adjustment = a[2].value.toBigInt(); // absolute replacement, including zero
    row.lastEvent = record;
    row.save();
    return;
  }
  if (name == "OrderedDepositBackfillOperatorSet" || name == "OrderedDepositMigrationVerified") {
    const token = a[0].value.toAddress();
    const id = event.address.toHexString() + "-" + token.toHexString();
    let row = OrderedDepositMigrationState.load(id);
    if (row == null) {
      row = new OrderedDepositMigrationState(id);
      row.protocol = event.address;
      row.token = token;
      row.verified = false;
    }
    row.configured = true;
    if (name == "OrderedDepositBackfillOperatorSet") row.operator = a[1].value.toAddress();
    else {
      row.operator = Address.zero(); // Finalization closes backfill authority.
      row.verified = true;
      row.verificationDigest = a[1].value.toBytes();
    }
    row.lastEvent = record;
    row.save();
    return;
  }
  if (
    name == "SiloRedemptionInitialized" ||
    name == "SiloRedemptionEmaConfigured" ||
    name == "SiloRedemptionEmaUpdated"
  ) {
    const id = event.address.toHexString();
    let row = SiloRedemptionPolicyState.load(id);
    if (row == null) {
      row = new SiloRedemptionPolicyState(id);
      row.threshold = BigInt.zero();
      row.initializedSeason = BigInt.zero();
      row.activeSeasons = BigInt.zero();
      row.configuredSeasons = BigInt.zero();
      row.lastSeason = BigInt.zero();
    }
    if (name == "SiloRedemptionInitialized") {
      row.threshold = a[0].value.toBigInt();
      row.initializedSeason = a[1].value.toBigInt();
      // Legacy deferred initialization publishes zero, whose initial mean is known.
      // Current release/standalone initialization publishes only a rounded threshold.
      if (row.threshold.isZero()) row.meanScaled = BigInt.zero();
      else row.unset("meanScaled");
      row.activeSeasons = BigInt.fromI32(24);
      row.configuredSeasons = BigInt.fromI32(24);
      row.lastSeason = a[1].value.toBigInt();
    } else if (name == "SiloRedemptionEmaConfigured") row.configuredSeasons = a[0].value.toBigInt();
    else {
      row.lastSeason = a[0].value.toBigInt();
      row.meanScaled = a[1].value.toBigInt();
      row.activeSeasons = a[2].value.toBigInt();
      row.threshold = a[3].value.toBigInt();
    }
    row.lastEvent = record;
    row.save();
    return;
  }
  const c = controller(event);
  // Global configuration must not be discarded because its events lack a programId.
  let global = true;
  if (name == "AutoConvertDurationsConfigured") c.durations = record;
  else if (name == "AutoConvertPricePolicyConfigured") c.pricePolicy = record;
  else if (name == "AutoConvertFlowAllowanceConfigured") c.flowAllowancePolicy = record;
  else if (name == "AutoConvertWaitingPolicyConfigured") c.waitingPolicy = record;
  else if (name == "AutoConvertOutflowMultiplierConfigured") c.outflowMultiplierBps = a[1].value.toBigInt();
  else if (name == "AutoConvertMinPositionValueConfigured") c.minPositionValueConfiguredUsd = a[0].value.toBigInt();
  else if (name == "AutoConvertMinPositionValueApplied") {
    c.minPositionValueAppliedUsd = a[0].value.toBigInt();
    c.minPositionValueAppliedSeason = a[1].value.toBigInt();
  } else global = false;
  if (global) {
    c.save();
    return;
  }
  if (name == "AutoConvertWellOracle" || name == "AutoConvertWhitelistChanged") {
    const current = c.currentProgram;
    if (current != null) {
      const p = AutoConvertProgram.load(current!);
      if (p != null) {
        if (name == "AutoConvertWellOracle") {
          const w = wellState(p, a[2].value);
          w.oracle = record;
          w.save();
        } else {
          // Membership version changes preserve valid flow history. Do not reset it.
          p.configVersion = a[1].value.toBigInt();
          p.save();
        }
      }
    }
    return;
  }
  // Other events without programId have history only; never invent a program.
  if (a.length == 0 || a[0].name != "programId") return;
  const p = program(event, a[0].value.toBigInt());
  if (name == "AutoConvertConfigured") {
    p.configuration = record;
    p.configVersion = a[1].value.toBigInt();
    c.currentProgram = p.id;
  } else if (name == "AutoConvertConfigurationVersion" || name == "AutoConvertParameters") {
    p.configVersion = a[1].value.toBigInt();
    if (name == "AutoConvertParameters") p.parameters = record;
  } else if (name == "AutoConvertActivated") p.active = true;
  else if (name == "AutoConvertEnded") {
    p.active = false;
    p.totalBdvConverted = a[1].value.toBigInt();
  } else if (name == "AutoConvertPauseChanged") p.paused = a[1].value.toBoolean();
  else if (name == "AutoConvertResetPolicyConfigured") p.resetPolicy = record;
  else if (name == "AutoConvertResetPauseDurationConfigured") p.resetPauseDuration = a[1].value.toBigInt();
  else if (name == "AutoConvertResetPauseStarted") p.resetPauseUntil = a[4].value.toBigInt();
  else if (name == "AutoConvertResetPauseUpdated") p.resetPauseUntil = a[2].value.toBigInt();
  else if (name == "AutoConvertResetPauseExpired" || name == "AutoConvertResetPauseClearedByCompletion")
    p.resetPauseUntil = BigInt.zero();
  else if (name == "AutoConvertScheduleStarted") p.scheduleStarted = record;
  else if (name == "AutoConvertScheduleReset") p.scheduleReset = record;
  else if (name == "AutoConvertPositionFloorSet" || name == "AutoConvertPositionFloorReleased") {
    const w = wellState(p, a[1].value);
    w.minPositionLp = a[4].value.toBigInt();
    w.floorSeason = a[2].value.toBigInt();
    w.lastFloorEvent = record;
    if (name == "AutoConvertPositionFloorSet") w.floorRewound = a[5].value.toBoolean();
    w.save();
  } else if (name == "AutoConvertFlowState") p.flowState = record;
  else if (name == "AutoConvertDecision") p.lastDecision = record;
  else if (name == "AutoConvertWellPolicy") {
    const w = wellState(p, a[2].value);
    w.policy = record;
    w.whitelisted = true;
    w.save();
  } else if (name == "AutoConvertBatch") p.totalBdvConverted = p.totalBdvConverted.plus(a[3].value.toBigInt());
  p.save();
  c.save();
}
