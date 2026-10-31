import { updateAutoConvertState } from "../utils/AutoConvertState";
import { ethereum } from "@graphprotocol/graph-ts";
import {
  AutoConvertBatch,
  AutoConvertPosition,
  AutoConvertWell,
  SunriseAutoConvertAttempt,
  AutoConvertFlowBaseline,
  AutoConvertFlowObservation
} from "../../generated/Beanstalk-ABIs/PintoAutoConvert";
import {
  AutoConvertBatchRecord,
  AutoConvertPositionRecord,
  AutoConvertWellRecord,
  SunriseAutoConvertAttemptRecord,
  AutoConvertFlowBaselineRecord,
  AutoConvertFlowObservationRecord
} from "../../generated/schema";
import { convert } from "../utils/Silo";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";

// logIndex prevents collisions across positions/batches in the same transaction.
function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

export function handleAutoConvertBatch(event: AutoConvertBatch): void {
  const row = new AutoConvertBatchRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.programId = event.params.programId;
  row.observationSeason = event.params.observationSeason;
  row.wellCount = event.params.wellCount;
  row.bdvConverted = event.params.bdvConverted;
  row.executor = event.params.executor;
  row.reward = event.params.reward;
  row.save();
  updateAutoConvertState("AutoConvertBatch", event, row.id);
}

export function handleAutoConvertPosition(event: AutoConvertPosition): void {
  const row = new AutoConvertPositionRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.programId = event.params.programId;
  row.account = event.params.account;
  row.well = event.params.well;
  row.stem = event.params.stem;
  row.lpAmount = event.params.lpAmount;
  row.beanAmount = event.params.beanAmount;
  row.bdv = event.params.bdv;
  row.save();
  // AddDeposit/RemoveDeposits already update balances. Only classify the convert
  // here; never mint bonus Stalk or apply the LP withdrawal a second time.
  convert({
    event,
    account: event.params.account,
    fromToken: event.params.well,
    toToken: getProtocolToken(v(), event.block.number),
    fromAmount: event.params.lpAmount,
    toAmount: event.params.beanAmount,
    fromBdv: event.params.bdv,
    toBdv: event.params.beanAmount
  });
}

export function handleAutoConvertWell(event: AutoConvertWell): void {
  const row = new AutoConvertWellRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.programId = event.params.programId;
  row.observationSeason = event.params.observationSeason;
  row.well = event.params.well;
  row.lpAmount = event.params.lpAmount;
  row.beanAmount = event.params.beanAmount;
  row.bdvConverted = event.params.bdvConverted;
  row.save();
}

export function handleSunriseAutoConvertAttempt(event: SunriseAutoConvertAttempt): void {
  const row = new SunriseAutoConvertAttemptRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.season = event.params.season;
  row.success = event.params.success;
  row.reason = event.params.reason;
  row.gasUsed = event.params.gasUsed;
  row.save();
}

export function handleAutoConvertFlowBaseline(event: AutoConvertFlowBaseline): void {
  const row = new AutoConvertFlowBaselineRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.season = event.params.season;
  row.valid = event.params.valid;
  row.pintoPriceUsd = event.params.pintoPriceUsd;
  row.allowanceUsd = event.params.allowanceUsd;
  row.save();
}

export function handleAutoConvertFlowObservation(event: AutoConvertFlowObservation): void {
  const row = new AutoConvertFlowObservationRecord(eventId(event));
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.season = event.params.season;
  row.status = event.params.status;
  row.eligibility = event.params.eligibility;
  row.waiting = event.params.waiting;
  row.allowanceUsd = event.params.allowanceUsd;
  row.adverseUsd = event.params.adverseUsd;
  row.save();
}
