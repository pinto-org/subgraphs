import { ethereum } from "@graphprotocol/graph-ts";
import { Beanstalk, Season } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";

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

export function loadBeanstalk(): Beanstalk {
  let beanstalk = Beanstalk.load("beanstalk");
  if (beanstalk == null) {
    beanstalk = new Beanstalk("beanstalk");
    beanstalk.lastSeason = "1";
    beanstalk.wells = [];
    beanstalk.totalLiquidityUSD = ZERO_BD;
    beanstalk.cumulativeTradeVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyTradeVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyTransferVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyTradeVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyTransferVolumeUSD = ZERO_BD;
    // TODO: these might not be necessary if using beanstalk convention snapshots
    beanstalk.lastSnapshotDayID = 0;
    beanstalk.lastSnapshotHourID = 0;
    beanstalk.lastUpdateTimestamp = ZERO_BI;
    beanstalk.lastUpdateBlockNumber = ZERO_BI;
  }
  return beanstalk as Beanstalk;
}
