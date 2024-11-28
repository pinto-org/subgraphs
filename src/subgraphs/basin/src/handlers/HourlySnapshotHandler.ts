import { ethereum } from "@graphprotocol/graph-ts";
import { checkForSnapshot } from "../utils/Well";
import { toAddress } from "../../../../core/utils/Bytes";
import { loadOrCreateAquifer } from "../entities/WellComponents";
import { v } from "../utils/constants/Version";
import { getAquifer, getWhitelistedWells } from "../../../../core/constants/RuntimeConstants";
import { Sunrise } from "../../generated/Basin-ABIs/PintoLaunch";

// Takes snapshots of beanstalk wells only. This is to guarantee a snapshot of each Beanstalk well is
// always available at the top of the season.
export function handleBeanstalkSunrise(event: Sunrise): void {
  const wells = getWhitelistedWells(v());
  for (let i = 0; i < wells.length; i++) {
    checkForSnapshot(toAddress(wells[i]), event.block);
  }
}

// Used to take hourly snapshots for other wells in the absense of pool trading activity.
// This handler should be configured for infrequent polling
export function handleBlock(block: ethereum.Block): void {
  const aquifer = loadOrCreateAquifer(getAquifer(v()));
  const wells = aquifer.wells.load();

  for (let i = 0; i < wells.length; i++) {
    checkForSnapshot(toAddress(wells[i].id), block);
  }
}
