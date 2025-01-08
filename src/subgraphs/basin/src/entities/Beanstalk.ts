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
    beanstalk.rollingWeeklyTradeVolumeUSD = ZERO_BD;

    beanstalk.cumulativeBuyVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyBuyVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyBuyVolumeUSD = ZERO_BD;

    beanstalk.cumulativeSellVolumeUSD = ZERO_BD;
    beanstalk.rollingDailySellVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklySellVolumeUSD = ZERO_BD;

    beanstalk.cumulativeTransferVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyTransferVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyTransferVolumeUSD = ZERO_BD;

    beanstalk.cumulativeConvertVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyConvertVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyConvertVolumeUSD = ZERO_BD;

    beanstalk.cumulativeConvertUpVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyConvertUpVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyConvertUpVolumeUSD = ZERO_BD;

    beanstalk.cumulativeConvertDownVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyConvertDownVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyConvertDownVolumeUSD = ZERO_BD;

    beanstalk.cumulativeConvertNeutralVolumeUSD = ZERO_BD;
    beanstalk.rollingDailyConvertNeutralVolumeUSD = ZERO_BD;
    beanstalk.rollingWeeklyConvertNeutralVolumeUSD = ZERO_BD;

    beanstalk.createdTimestamp = ZERO_BI;
    beanstalk.lastUpdateTimestamp = ZERO_BI;
    beanstalk.lastUpdateBlockNumber = ZERO_BI;
  }
  return beanstalk as Beanstalk;
}
