import { AutoConvertFeePolicyBound } from "../../generated/Basin-ABIs/PintoAutoConvert";
import { PintoCanonicalFeeWell } from "../../generated/schema";
import {
  AutoConvertWell,
  WellFunctionReplaced,
  PintoFeeWellUpgraded
} from "../../generated/Basin-ABIs/PintoAutoConvert";
import { convert } from "../utils/Beanstalk";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";
import { loadWell, createWellUpgradeHistoryEntry } from "../entities/Well";
import { loadOrCreateImplementation, loadOrCreateWellFunction } from "../entities/WellComponents";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { takeWellSnapshots } from "../entities/snapshots/Well";
import { loadBeanstalk } from "../entities/Beanstalk";
import { takeBeanstalkSnapshots } from "../entities/snapshots/Beanstalk";

export function handleAutoConvertWell(event: AutoConvertWell): void {
  if (event.params.lpAmount.equals(ZERO_BI)) return;
  // One market removal per Well, not one trade per participating deposit.
  convert({
    event,
    account: event.address,
    fromToken: event.params.well,
    toToken: getProtocolToken(v(), event.block.number),
    fromAmount: event.params.lpAmount,
    toAmount: event.params.beanAmount,
    fromBdv: event.params.bdvConverted,
    toBdv: event.params.beanAmount
  });
  // The preceding LP removal saved snapshots before it was known to be a
  // convert. Publish that classification now, even if no later trade occurs.
  const well = loadWell(event.params.well);
  takeWellSnapshots(well, event.block);
  well.save();
  const beanstalk = loadBeanstalk();
  takeBeanstalkSnapshots(beanstalk, event.block);
  beanstalk.save();
}

export function handleWellFunctionReplaced(event: WellFunctionReplaced): void {
  const well = loadWell(event.params.well);
  loadOrCreateWellFunction(event.params.newFunction);
  well.wellFunction = event.params.newFunction;
  well.save();
}

export function handlePintoFeeWellUpgraded(event: PintoFeeWellUpgraded): void {
  const well = loadWell(event.params.well);
  loadOrCreateImplementation(event.params.feeBase);
  well.implementation = event.params.feeBase;
  well.boredWell = event.params.boredImplementation;
  well.save();
  createWellUpgradeHistoryEntry(well, event.block);
}

export function handleAutoConvertFeePolicyBound(event: AutoConvertFeePolicyBound): void {
  const row = new PintoCanonicalFeeWell(event.params.well);
  row.settings = event.params.settings;
  row.boundFeeBps = event.params.feeBps;
  row.boundFeeVersion = event.params.feeVersion;
  row.save();
}
