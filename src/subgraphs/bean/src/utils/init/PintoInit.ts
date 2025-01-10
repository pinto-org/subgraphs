import { ethereum } from "@graphprotocol/graph-ts";
import { loadBean } from "../../entities/Bean";
import { getProtocolToken } from "../../../../../core/constants/RuntimeConstants";
import { v } from "../constants/Version";
import { createNewSeason } from "../../entities/Season";

// Initialize season entity immediately/before first sunrise occurs.
export function init(block: ethereum.Block): void {
  const season = createNewSeason(1, block);
  const bean = loadBean(getProtocolToken(v(), block.number));
  bean.currentSeason = season.id;
  bean.save();
}
