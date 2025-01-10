import { ethereum } from "@graphprotocol/graph-ts";
import { toAddress } from "../../../../core/utils/Bytes";
import { loadOrCreateAquifer } from "../entities/WellComponents";
import { v } from "../utils/constants/Version";
import { getAquifer } from "../../../../core/constants/RuntimeConstants";
import { loadWell } from "../entities/Well";
import { takeWellSnapshots } from "../entities/snapshots/Well";

// Used to take hourly snapshots for other wells in the absense of pool trading activity.
// This handler should be configured for infrequent polling
export function handleBlock(block: ethereum.Block): void {
  const aquifer = loadOrCreateAquifer(getAquifer(v()));
  const wells = aquifer.wells.load();

  for (let i = 0; i < wells.length; i++) {
    const well = loadWell(toAddress(wells[i].id));
    takeWellSnapshots(well, block);
    well.save();
  }
}
