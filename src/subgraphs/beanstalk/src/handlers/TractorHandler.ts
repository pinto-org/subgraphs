import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { Tractor } from "../../generated/Beanstalk-ABIs/PintoPI8";
import { OperatorReward } from "../../generated/Beanstalk-ABIs/TractorHelpers";
import { takeTractorSnapshots } from "../entities/snapshots/Tractor";
import { loadTractor, loadTractorReward } from "../entities/Tractor";
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
