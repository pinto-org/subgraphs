import { Convert, Sunrise } from "../../generated/Basin-ABIs/PintoLaunch";
import { toAddress } from "../../../../core/utils/Bytes";
import { v } from "../utils/constants/Version";
import { getWhitelistedWells } from "../../../../core/constants/RuntimeConstants";
import { createNewSeason, loadBeanstalk } from "../entities/Beanstalk";
import { convert } from "../utils/Beanstalk";
import { takeWellSnapshots } from "../entities/snapshots/Well";
import { loadWell } from "../entities/Well";
import { takeBeanstalkSnapshots } from "../entities/snapshots/Beanstalk";

// Takes snapshots of beanstalk wells only and update beanstalk stats
export function handleBeanstalkSunrise(event: Sunrise): void {
  createNewSeason(event.params.season.toU32(), event.block);
  const beanstalk = loadBeanstalk();
  beanstalk.lastSeason = event.params.season.toString();
  takeBeanstalkSnapshots(beanstalk, event.block);
  beanstalk.save();

  const wells = getWhitelistedWells(v());
  for (let i = 0; i < wells.length; i++) {
    const well = loadWell(toAddress(wells[i]));
    takeWellSnapshots(well, event.block);
    well.save();
  }
}

export function handleConvert(event: Convert): void {
  convert({
    event,
    account: event.params.account,
    fromToken: event.params.fromToken,
    toToken: event.params.toToken,
    fromAmount: event.params.fromAmount,
    toAmount: event.params.toAmount
  });
}
