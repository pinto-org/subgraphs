import { Address } from "@graphprotocol/graph-ts";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { Tractor, TractorReward } from "../../generated/schema";

export function loadTractor(): Tractor {
  let tractor = Tractor.load("tractor");
  if (tractor == null) {
    tractor = new Tractor("tractor");
    tractor.totalExecutions = 0;
    tractor.totalPosBeanTips = ZERO_BI;
    tractor.totalNegBeanTips = ZERO_BI;
    tractor.save();
  }
  return tractor as Tractor;
}

export function loadTractorReward(account: Address, rewardType: i32, rewardToken: Address): TractorReward {
  const id = `${account.toHexString()}-${rewardType.toString()}-${rewardToken.toHexString()}`;
  let tractorReward = TractorReward.load(id);
  if (tractorReward == null) {
    tractorReward = new TractorReward(id);
    tractorReward.farmer = account;
    tractorReward.rewardType = rewardType;
    tractorReward.rewardToken = rewardToken;
    tractorReward.publisherExecutions = 0;
    tractorReward.publisherPosAmount = ZERO_BI;
    tractorReward.publisherNegAmount = ZERO_BI;
    tractorReward.operatorExecutions = 0;
    tractorReward.operatorPosAmount = ZERO_BI;
    tractorReward.operatorNegAmount = ZERO_BI;
    tractorReward.save();
  }
  return tractorReward as TractorReward;
}
