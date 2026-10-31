import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  AutoConvertController,
  AutoConvertProgram,
  AutoConvertWellState,
  DepositGrownStalkState
} from "../../generated/schema";

function controller(event: ethereum.Event): AutoConvertController {
  const id = event.address.toHexString();
  let row = AutoConvertController.load(id);
  if (row == null) {
    row = new AutoConvertController(id);
    row.rewardReserve = BigInt.zero();
  }
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
// Called only after immutable event payloads are saved. No eth_calls and no balance writes.
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
  const c = controller(event);
  if (name == "AutoConvertRewardFunded" || name == "AutoConvertRewardWithdrawn") {
    const amount = a[1].value.toBigInt();
    c.rewardReserve = name == "AutoConvertRewardFunded" ? c.rewardReserve.plus(amount) : c.rewardReserve.minus(amount);
    c.save();
    return;
  }
  if (name == "AutoConvertWellOracle") {
    const current = c.currentProgram;
    if (current != null) {
      const p = AutoConvertProgram.load(current!);
      if (p != null) {
        const w = wellState(p, a[2].value);
        w.oracle = record;
        w.save();
      }
    }
    return;
  }
  // Events without programId have their full history stored but cannot invent a program.
  if (a.length == 0 || a[0].name != "programId") return;
  const p = program(event, a[0].value.toBigInt());
  if (name == "AutoConvertConfigured") {
    p.configuration = record;
    p.configVersion = a[1].value.toBigInt();
    c.currentProgram = p.id;
  } else if (name == "AutoConvertConfigurationVersion") p.configVersion = a[1].value.toBigInt();
  else if (name == "AutoConvertActivated") p.active = true;
  else if (name == "AutoConvertEnded") {
    p.active = false;
    p.totalBdvConverted = a[1].value.toBigInt();
  } else if (name == "AutoConvertPauseChanged") p.paused = a[1].value.toBoolean();
  else if (name == "AutoConvertParameters") {
    p.parameters = record;
    p.priorityFloorBdv = a[4].value.toBigInt();
  } else if (name == "AutoConvertPolicyConfigured") p.policy = record;
  else if (name == "AutoConvertResetPolicyConfigured") p.resetPolicy = record;
  else if (name == "AutoConvertResetPauseDurationConfigured") p.resetPauseDuration = a[1].value.toBigInt();
  else if (name == "AutoConvertResetPauseStarted") p.resetPauseUntil = a[4].value.toBigInt();
  else if (name == "AutoConvertResetPauseExpired") p.resetPauseUntil = BigInt.zero();
  else if (name == "AutoConvertScheduleStarted") p.scheduleStarted = record;
  else if (name == "AutoConvertScheduleReset") p.scheduleReset = record;
  else if (name == "AutoConvertPriorityFloorSet") p.priorityFloorBdv = a[1].value.toBigInt();
  else if (name == "AutoConvertPositionFloorSet") p.cycleFloorBdv = a[3].value.toBigInt();
  else if (name == "AutoConvertFlowState") p.flowState = record;
  else if (name == "AutoConvertDecision") p.lastDecision = record;
  else if (name == "AutoConvertWellPolicy") {
    const w = wellState(p, a[2].value);
    w.policy = record;
    w.save();
  } else if (name == "AutoConvertBatch") {
    p.totalBdvConverted = p.totalBdvConverted.plus(a[3].value.toBigInt());
    c.rewardReserve = c.rewardReserve.minus(a[5].value.toBigInt());
  }
  p.save();
  c.save();
}
