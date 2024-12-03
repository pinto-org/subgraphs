// Seasons entity aggregates all of the hourly/daily snapshots

import { ethereum } from "@graphprotocol/graph-ts";
import { Season } from "../../generated/schema";

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
