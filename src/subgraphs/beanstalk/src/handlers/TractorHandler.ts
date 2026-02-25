import { Address, Bytes } from "@graphprotocol/graph-ts";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { Tractor, PublishRequisition, CancelBlueprint, TractorExecutionBegan } from "../../generated/Beanstalk-ABIs/PintoPI15";
import { OperatorReward } from "../../generated/Beanstalk-ABIs/TractorHelpers";
import { takeTractorSnapshots } from "../entities/snapshots/Tractor";
import { loadTractor, loadTractorReward } from "../entities/Tractor";
import { loadFarmer } from "../entities/Beanstalk";
import { TractorRequisition, TractorExecution } from "../../generated/schema";
import { v } from "../utils/constants/Version";

export function handleTractor(event: Tractor): void {
  const tractor = loadTractor();
  tractor.totalExecutions += 1;
  takeTractorSnapshots(tractor, event.block);
  tractor.save();
}

export function handleOperatorReward(event: OperatorReward): void {
  const tractor = loadTractor();
  const publisherReward = loadTractorReward(event.params.publisher, event.params.rewardType, event.params.token);
  const operatorReward = loadTractorReward(event.params.operator, event.params.rewardType, event.params.token);

  publisherReward.publisherExecutions += 1;
  operatorReward.operatorExecutions += 1;

  if (event.params.amount > ZERO_BI) {
    const amount = event.params.amount;
    publisherReward.publisherPosAmount = publisherReward.publisherPosAmount.plus(amount);
    operatorReward.operatorPosAmount = operatorReward.operatorPosAmount.plus(amount);
    if (event.params.token == getProtocolToken(v(), event.block.number)) {
      tractor.totalPosBeanTips = tractor.totalPosBeanTips.plus(amount);
    }
  } else {
    const amount = event.params.amount.neg();
    publisherReward.publisherNegAmount = publisherReward.publisherNegAmount.plus(amount);
    operatorReward.operatorNegAmount = operatorReward.operatorNegAmount.plus(amount);
    if (event.params.token == getProtocolToken(v(), event.block.number)) {
      tractor.totalNegBeanTips = tractor.totalNegBeanTips.plus(amount);
    }
  }
  publisherReward.save();
  operatorReward.save();

  takeTractorSnapshots(tractor, event.block);
  tractor.save();
}

export function handlePublishRequisition(event: PublishRequisition): void {
  const blueprint = event.params.requisition.blueprint;
  const blueprintHash = event.params.requisition.blueprintHash;

  let requisition = TractorRequisition.load(blueprintHash);
  if (requisition == null) {
    requisition = new TractorRequisition(blueprintHash);
    requisition.executionCount = 0;
    requisition.cancelled = false;
  }

  const farmer = loadFarmer(blueprint.publisher, event.block);
  requisition.publisher = farmer.id;
  requisition.blueprintData = blueprint.data;

  const rawInstrs = blueprint.operatorPasteInstrs;
  const instrArray = new Array<Bytes>(rawInstrs.length);
  for (let i = 0; i < rawInstrs.length; i++) {
    instrArray[i] = rawInstrs[i];
  }
  requisition.operatorPasteInstrs = instrArray;

  requisition.maxNonce = blueprint.maxNonce;
  requisition.startTime = blueprint.startTime;
  requisition.endTime = blueprint.endTime;
  requisition.signature = event.params.requisition.signature;

  requisition.createdBlock = event.block.number;
  requisition.createdAt = event.block.timestamp;
  requisition.createdHash = event.transaction.hash;

  requisition.save();
}

export function handleCancelBlueprint(event: CancelBlueprint): void {
  const blueprintHash = event.params.blueprintHash;
  let requisition = TractorRequisition.load(blueprintHash);
  if (requisition != null) {
    requisition.cancelled = true;
    requisition.cancelledBlock = event.block.number;
    requisition.cancelledAt = event.block.timestamp;
    requisition.cancelledHash = event.transaction.hash;
    requisition.save();
  }
}

export function handleTractorExecutionBegan(event: TractorExecutionBegan): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const execution = new TractorExecution(id);

  const blueprintHash = event.params.blueprintHash;
  execution.requisition = blueprintHash;
  execution.operator = event.params.operator;
  execution.blueprintHash = blueprintHash;
  execution.nonce = event.params.nonce;
  execution.gasleft = event.params.gasleft;

  const farmer = loadFarmer(event.params.publisher, event.block);
  execution.publisher = farmer.id;

  execution.blockNumber = event.block.number;
  execution.timestamp = event.block.timestamp;
  execution.transactionHash = event.transaction.hash;
  execution.logIndex = event.logIndex;
  execution.save();

  let requisition = TractorRequisition.load(blueprintHash);
  if (requisition != null) {
    requisition.executionCount += 1;
    requisition.save();
  }
}
