// Seasons entity aggregates all of the hourly/daily snapshots

import { ethereum } from "@graphprotocol/graph-ts";
import { Season } from "../../generated/schema";
import { loadBean } from "./Bean";
import { v } from "../utils/constants/Version";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { BI_MAX } from "../../../../core/utils/Decimals";

export function createNewSeason(seasonNumber: u32, block: ethereum.Block): Season {
  let season = Season.load(seasonNumber.toString());
  if (season == null) {
    season = new Season(seasonNumber.toString());
    season.season = seasonNumber;
    season.timestamp = block.timestamp;
    season.save();
  }
  return season as Season;
}

export function getSeason(seasonNumber: u32): Season {
  return Season.load(seasonNumber.toString())!;
}

export function getLastSeasonDuration(): i32 {
  const currentSeason = getSeason(<i32>parseInt(loadBean(getProtocolToken(v(), BI_MAX)).currentSeason));
  const prevSeason = getSeason(currentSeason.season - 1);
  return currentSeason.timestamp.minus(prevSeason.timestamp).toI32();
}
