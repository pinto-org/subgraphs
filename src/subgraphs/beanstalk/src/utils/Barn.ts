import { Address, BigInt, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import { Chop as ChopEntity } from "../../generated/schema";
import { loadFertilizer, loadFertilizerBalance, loadFertilizerToken } from "../entities/Fertilizer";
import { loadFarmer } from "../entities/Beanstalk";
import { Reseed } from "../../generated/Beanstalk-ABIs/Reseed";
import { loadUnripeToken, loadWhitelistTokenSetting } from "../entities/Silo";
import { takeUnripeTokenSnapshots } from "../entities/snapshots/UnripeToken";
import { BI_10, toDecimal } from "../../../../core/utils/Decimals";
import { getLatestBdv } from "../entities/snapshots/WhitelistTokenSetting";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { getUnripeUnderlying } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { FERT_TOKEN_INFO_CACHED, FertilizerTokenInfo } from "../../cache-builder/results/B3Migration_arb";

class ChopParams {
  event: ethereum.Event;
  type: String;
  account: Address;
  unripeToken: Address;
  unripeAmount: BigInt;
  underlyingAmount: BigInt;
}

export function getFertilizerInfo(fertId: BigInt): FertilizerTokenInfo {
  for (let i = 0; i < FERT_TOKEN_INFO_CACHED.length; ++i) {
    if (FERT_TOKEN_INFO_CACHED[i].id == fertId) {
      return FERT_TOKEN_INFO_CACHED[i];
    }
  }
  // If not cached, get on chain
  const beanstalkContract = Reseed.bind(v().protocolAddress);
  return {
    id: fertId,
    humidity: BigDecimal.fromString(beanstalkContract.getCurrentHumidity().toString()).div(BigDecimal.fromString("10")),
    season: beanstalkContract.season().toI32(),
    startBpf: beanstalkContract.beansPerFertilizer()
  };
}

export function transfer(
  fertilizer1155: Address,
  from: Address,
  to: Address,
  id: BigInt,
  amount: BigInt,
  block: ethereum.Block
): void {
  let fertilizer = loadFertilizer(fertilizer1155);
  let fertilizerToken = loadFertilizerToken(fertilizer, id);
  if (from != ADDRESS_ZERO) {
    let fromFarmer = loadFarmer(from, block);
    let fromFertilizerBalance = loadFertilizerBalance(fertilizerToken, fromFarmer);
    fromFertilizerBalance.amount = fromFertilizerBalance.amount.minus(amount);
    fromFertilizerBalance.save();
  } else {
    fertilizerToken.supply = fertilizerToken.supply.plus(amount);
    fertilizer.supply = fertilizer.supply.plus(amount);
    fertilizer.save();
    fertilizerToken.save();
  }

  let toFarmer = loadFarmer(to, block);
  let toFertilizerBalance = loadFertilizerBalance(fertilizerToken, toFarmer);
  toFertilizerBalance.amount = toFertilizerBalance.amount.plus(amount);
  toFertilizerBalance.save();
}

export function unripeChopped(params: ChopParams): void {
  const unripe = loadUnripeToken(params.unripeToken);
  const unripeWhitelist = loadWhitelistTokenSetting(Address.fromBytes(unripe.id));
  const underlyingWhitelist = loadWhitelistTokenSetting(Address.fromBytes(unripe.underlyingToken));
  const unripeBdvOne = getLatestBdv(unripeWhitelist)!;
  const underlyingBdvOne = getLatestBdv(underlyingWhitelist)!;

  let id =
    params.type + "-" + params.event.transaction.hash.toHexString() + "-" + params.event.transactionLogIndex.toString();
  let chop = new ChopEntity(id);
  chop.farmer = params.account;
  chop.unripeToken = unripe.id;
  chop.unripeAmount = params.unripeAmount;
  chop.unripeBdv = params.unripeAmount.times(unripeBdvOne).div(BI_10.pow(<u8>unripeWhitelist.decimals));
  chop.underlyingToken = unripe.underlyingToken;
  chop.underlyingAmount = params.underlyingAmount;
  chop.underlyingBdv = params.underlyingAmount.times(underlyingBdvOne).div(BI_10.pow(<u8>underlyingWhitelist.decimals));
  chop.chopRate = unripe.chopRate;
  chop.hash = params.event.transaction.hash;
  chop.blockNumber = params.event.block.number;
  chop.createdAt = params.event.block.timestamp;
  chop.save();

  unripe.totalChoppedAmount = unripe.totalChoppedAmount.plus(chop.unripeAmount);
  unripe.totalChoppedBdv = unripe.totalChoppedBdv.plus(chop.unripeBdv);
  unripe.totalChoppedBdvReceived = unripe.totalChoppedBdvReceived.plus(chop.underlyingBdv);
  unripe.save();

  updateUnripeStats(Address.fromBytes(unripe.id), params.event.address, params.event.block);
}

// Update the status for this unripe token using protocol getters. These values fluctuate without related events.
export function updateUnripeStats(unripe: Address, protocol: Address, block: ethereum.Block): void {
  const beanstalk_call = Reseed.bind(protocol);
  let unripeToken = loadUnripeToken(unripe);

  // Contract values
  unripeToken.amountUnderlyingOne = beanstalk_call.getUnderlyingPerUnripeToken(unripe);
  unripeToken.choppableAmountOne = beanstalk_call.getPenalty(unripe);
  unripeToken.chopRate = toDecimal(beanstalk_call.getPercentPenalty(unripe));
  unripeToken.recapPercent = toDecimal(beanstalk_call.getRecapFundedPercent(unripe));

  // Further calculated values
  unripeToken.underlyingToken = getUnripeUnderlying(v(), unripe, block.number);
  const underlyingWhitelist = loadWhitelistTokenSetting(Address.fromBytes(unripeToken.underlyingToken));
  const underlyingBdvOne = getLatestBdv(underlyingWhitelist);
  if (underlyingBdvOne !== null) {
    unripeToken.bdvUnderlyingOne = unripeToken.amountUnderlyingOne
      .times(underlyingBdvOne)
      .div(BI_10.pow(<u8>underlyingWhitelist.decimals));
    unripeToken.choppableBdvOne = unripeToken.choppableAmountOne
      .times(underlyingBdvOne)
      .div(BI_10.pow(<u8>underlyingWhitelist.decimals));
  }

  takeUnripeTokenSnapshots(unripeToken, block);
  unripeToken.save();
}
