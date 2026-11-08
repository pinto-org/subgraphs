import { updateAutoConvertState } from "../utils/AutoConvertState";
import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  AutoConvertBatch,
  AutoConvertPosition,
  AutoConvertWell
} from "../../generated/Beanstalk-ABIs/PintoAutoConvert";
import {
  AutoConvertBatchRecord,
  AutoConvertPositionRecord,
  AutoConvertWellRecord
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
  row.details_configVersion = event.params.details.configVersion;
  row.details_mode = BigInt.fromI32(event.params.details.mode);
  row.details_marketTargetWad = event.params.details.marketTargetWad;
  row.details_targetPriceWad = event.params.details.targetPriceWad;
  row.details_referenceLossUsd = event.params.details.referenceLossUsd;
  row.details_inventoryLimited = event.params.details.inventoryLimited;
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
  row.plan_currentPriceWad = event.params.plan.currentPriceWad;
  row.plan_postPriceWad = event.params.plan.postPriceWad;
  row.plan_valueUsd = event.params.plan.valueUsd;
  row.plan_lossUsd = event.params.plan.lossUsd;
  row.plan_flags = BigInt.fromI32(event.params.plan.flags);
  row.save();
}
