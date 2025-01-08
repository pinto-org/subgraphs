import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Beanstalk, BeanstalkDailySnapshot, BeanstalkHourlySnapshot } from "../../../generated/schema";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";

export function takeBeanstalkSnapshots(beanstalk: Beanstalk, block: ethereum.Block): void {
  const currentSeason = beanstalk.lastSeason;

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp, 8 * 60 * 60));

  // Load the snapshot for this season/day
  const hourlyId = beanstalk.id + "-" + currentSeason.toString();
  const dailyId = beanstalk.id + "-" + day.toString();
  let baseHourly = BeanstalkHourlySnapshot.load(hourlyId);
  let baseDaily = BeanstalkDailySnapshot.load(dailyId);
  if (baseHourly == null && beanstalk.lastHourlySnapshotSeason !== 0) {
    baseHourly = BeanstalkHourlySnapshot.load(beanstalk.id + "-" + beanstalk.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && beanstalk.lastDailySnapshotDay !== null) {
    baseDaily = BeanstalkDailySnapshot.load(beanstalk.id + "-" + beanstalk.lastDailySnapshotDay!.toString());
  }
  const hourly = new BeanstalkHourlySnapshot(hourlyId);
  const daily = new BeanstalkDailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.wells = beanstalk.wells;
  hourly.totalLiquidityUSD = beanstalk.totalLiquidityUSD;
  hourly.cumulativeTradeVolumeUSD = beanstalk.cumulativeTradeVolumeUSD;
  hourly.cumulativeBuyVolumeUSD = beanstalk.cumulativeBuyVolumeUSD;
  hourly.cumulativeSellVolumeUSD = beanstalk.cumulativeSellVolumeUSD;
  hourly.cumulativeTransferVolumeUSD = beanstalk.cumulativeTransferVolumeUSD;
  hourly.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD;
  hourly.cumulativeConvertUpVolumeUSD = beanstalk.cumulativeConvertUpVolumeUSD;
  hourly.cumulativeConvertDownVolumeUSD = beanstalk.cumulativeConvertDownVolumeUSD;
  hourly.cumulativeConvertNeutralVolumeUSD = beanstalk.cumulativeConvertNeutralVolumeUSD;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaLiquidityUSD = hourly.totalLiquidityUSD.minus(baseHourly.totalLiquidityUSD);
    hourly.deltaTradeVolumeUSD = hourly.cumulativeTradeVolumeUSD.minus(baseHourly.cumulativeTradeVolumeUSD);
    hourly.deltaBuyVolumeUSD = hourly.cumulativeBuyVolumeUSD.minus(baseHourly.cumulativeBuyVolumeUSD);
    hourly.deltaSellVolumeUSD = hourly.cumulativeSellVolumeUSD.minus(baseHourly.cumulativeSellVolumeUSD);
    hourly.deltaTransferVolumeUSD = hourly.cumulativeTransferVolumeUSD.minus(baseHourly.cumulativeTransferVolumeUSD);
    hourly.deltaConvertVolumeUSD = hourly.cumulativeConvertVolumeUSD.minus(baseHourly.cumulativeConvertVolumeUSD);
    hourly.deltaConvertUpVolumeUSD = hourly.cumulativeConvertUpVolumeUSD.minus(baseHourly.cumulativeConvertUpVolumeUSD);
    hourly.deltaConvertDownVolumeUSD = hourly.cumulativeConvertDownVolumeUSD.minus(
      baseHourly.cumulativeConvertDownVolumeUSD
    );
    hourly.deltaConvertNeutralVolumeUSD = hourly.cumulativeConvertNeutralVolumeUSD.minus(
      baseHourly.cumulativeConvertNeutralVolumeUSD
    );

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.plus(baseHourly.deltaLiquidityUSD);
      hourly.deltaTradeVolumeUSD = hourly.deltaTradeVolumeUSD.plus(baseHourly.deltaTradeVolumeUSD);
      hourly.deltaBuyVolumeUSD = hourly.deltaBuyVolumeUSD.plus(baseHourly.deltaBuyVolumeUSD);
      hourly.deltaSellVolumeUSD = hourly.deltaSellVolumeUSD.plus(baseHourly.deltaSellVolumeUSD);
      hourly.deltaTransferVolumeUSD = hourly.deltaTransferVolumeUSD.plus(baseHourly.deltaTransferVolumeUSD);
      hourly.deltaConvertVolumeUSD = hourly.deltaConvertVolumeUSD.plus(baseHourly.deltaConvertVolumeUSD);
      hourly.deltaConvertUpVolumeUSD = hourly.deltaConvertUpVolumeUSD.plus(baseHourly.deltaConvertUpVolumeUSD);
      hourly.deltaConvertDownVolumeUSD = hourly.deltaConvertDownVolumeUSD.plus(baseHourly.deltaConvertDownVolumeUSD);
      hourly.deltaConvertNeutralVolumeUSD = hourly.deltaConvertNeutralVolumeUSD.plus(
        baseHourly.deltaConvertNeutralVolumeUSD
      );
    } else {
      // *Hourly only functionality*
      // This is the first time creating a snapshot for this hour, and past datapoints are available.
      removeOldestRollingBeanstalkStats(beanstalk, parseInt(currentSeason));
    }
  } else {
    hourly.deltaLiquidityUSD = hourly.totalLiquidityUSD;
    hourly.deltaTradeVolumeUSD = hourly.cumulativeTradeVolumeUSD;
    hourly.deltaBuyVolumeUSD = hourly.cumulativeBuyVolumeUSD;
    hourly.deltaSellVolumeUSD = hourly.cumulativeSellVolumeUSD;
    hourly.deltaTransferVolumeUSD = hourly.cumulativeTransferVolumeUSD;
    hourly.deltaConvertVolumeUSD = hourly.cumulativeConvertVolumeUSD;
    hourly.deltaConvertUpVolumeUSD = hourly.cumulativeConvertUpVolumeUSD;
    hourly.deltaConvertDownVolumeUSD = hourly.cumulativeConvertDownVolumeUSD;
    hourly.deltaConvertNeutralVolumeUSD = hourly.cumulativeConvertNeutralVolumeUSD;
  }
  // Set precision on BigDecimal deltas
  hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.truncate(2);
  hourly.deltaTradeVolumeUSD = hourly.deltaTradeVolumeUSD.truncate(2);
  hourly.deltaBuyVolumeUSD = hourly.deltaBuyVolumeUSD.truncate(2);
  hourly.deltaSellVolumeUSD = hourly.deltaSellVolumeUSD.truncate(2);
  hourly.deltaTransferVolumeUSD = hourly.deltaTransferVolumeUSD.truncate(2);
  hourly.deltaConvertVolumeUSD = hourly.deltaConvertVolumeUSD.truncate(2);
  hourly.deltaConvertUpVolumeUSD = hourly.deltaConvertUpVolumeUSD.truncate(2);
  hourly.deltaConvertDownVolumeUSD = hourly.deltaConvertDownVolumeUSD.truncate(2);
  hourly.deltaConvertNeutralVolumeUSD = hourly.deltaConvertNeutralVolumeUSD.truncate(2);

  hourly.createdTimestamp = hour.times(BigInt.fromU32(3600));
  hourly.lastUpdateTimestamp = block.timestamp;
  hourly.lastUpdateBlockNumber = block.number;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.season = currentSeason;
  daily.wells = beanstalk.wells;
  daily.totalLiquidityUSD = beanstalk.totalLiquidityUSD;
  daily.cumulativeTradeVolumeUSD = beanstalk.cumulativeTradeVolumeUSD;
  daily.cumulativeBuyVolumeUSD = beanstalk.cumulativeBuyVolumeUSD;
  daily.cumulativeSellVolumeUSD = beanstalk.cumulativeSellVolumeUSD;
  daily.cumulativeTransferVolumeUSD = beanstalk.cumulativeTransferVolumeUSD;
  daily.cumulativeConvertVolumeUSD = beanstalk.cumulativeConvertVolumeUSD;
  daily.cumulativeConvertUpVolumeUSD = beanstalk.cumulativeConvertUpVolumeUSD;
  daily.cumulativeConvertDownVolumeUSD = beanstalk.cumulativeConvertDownVolumeUSD;
  daily.cumulativeConvertNeutralVolumeUSD = beanstalk.cumulativeConvertNeutralVolumeUSD;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaLiquidityUSD = daily.totalLiquidityUSD.minus(baseDaily.totalLiquidityUSD);
    daily.deltaTradeVolumeUSD = daily.cumulativeTradeVolumeUSD.minus(baseDaily.cumulativeTradeVolumeUSD);
    daily.deltaBuyVolumeUSD = daily.cumulativeBuyVolumeUSD.minus(baseDaily.cumulativeBuyVolumeUSD);
    daily.deltaSellVolumeUSD = daily.cumulativeSellVolumeUSD.minus(baseDaily.cumulativeSellVolumeUSD);
    daily.deltaTransferVolumeUSD = daily.cumulativeTransferVolumeUSD.minus(baseDaily.cumulativeTransferVolumeUSD);
    daily.deltaConvertVolumeUSD = daily.cumulativeConvertVolumeUSD.minus(baseDaily.cumulativeConvertVolumeUSD);
    daily.deltaConvertUpVolumeUSD = daily.cumulativeConvertUpVolumeUSD.minus(baseDaily.cumulativeConvertUpVolumeUSD);
    daily.deltaConvertDownVolumeUSD = daily.cumulativeConvertDownVolumeUSD.minus(
      baseDaily.cumulativeConvertDownVolumeUSD
    );
    daily.deltaConvertNeutralVolumeUSD = daily.cumulativeConvertNeutralVolumeUSD.minus(
      baseDaily.cumulativeConvertNeutralVolumeUSD
    );

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.plus(baseDaily.deltaLiquidityUSD);
      daily.deltaTradeVolumeUSD = daily.deltaTradeVolumeUSD.plus(baseDaily.deltaTradeVolumeUSD);
      daily.deltaBuyVolumeUSD = daily.deltaBuyVolumeUSD.plus(baseDaily.deltaBuyVolumeUSD);
      daily.deltaSellVolumeUSD = daily.deltaSellVolumeUSD.plus(baseDaily.deltaSellVolumeUSD);
      daily.deltaTransferVolumeUSD = daily.deltaTransferVolumeUSD.plus(baseDaily.deltaTransferVolumeUSD);
      daily.deltaConvertVolumeUSD = daily.deltaConvertVolumeUSD.plus(baseDaily.deltaConvertVolumeUSD);
      daily.deltaConvertUpVolumeUSD = daily.deltaConvertUpVolumeUSD.plus(baseDaily.deltaConvertUpVolumeUSD);
      daily.deltaConvertDownVolumeUSD = daily.deltaConvertDownVolumeUSD.plus(baseDaily.deltaConvertDownVolumeUSD);
      daily.deltaConvertNeutralVolumeUSD = daily.deltaConvertNeutralVolumeUSD.plus(
        baseDaily.deltaConvertNeutralVolumeUSD
      );
    }
  } else {
    daily.deltaLiquidityUSD = daily.totalLiquidityUSD;
    daily.deltaTradeVolumeUSD = daily.cumulativeTradeVolumeUSD;
    daily.deltaBuyVolumeUSD = daily.cumulativeBuyVolumeUSD;
    daily.deltaSellVolumeUSD = daily.cumulativeSellVolumeUSD;
    daily.deltaTransferVolumeUSD = daily.cumulativeTransferVolumeUSD;
    daily.deltaConvertVolumeUSD = daily.cumulativeConvertVolumeUSD;
    daily.deltaConvertUpVolumeUSD = daily.cumulativeConvertUpVolumeUSD;
    daily.deltaConvertDownVolumeUSD = daily.cumulativeConvertDownVolumeUSD;
    daily.deltaConvertNeutralVolumeUSD = daily.cumulativeConvertNeutralVolumeUSD;
  }
  // Set precision on BigDecimal deltas
  daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.truncate(2);
  daily.deltaTradeVolumeUSD = daily.deltaTradeVolumeUSD.truncate(2);
  daily.deltaBuyVolumeUSD = daily.deltaBuyVolumeUSD.truncate(2);
  daily.deltaSellVolumeUSD = daily.deltaSellVolumeUSD.truncate(2);
  daily.deltaTransferVolumeUSD = daily.deltaTransferVolumeUSD.truncate(2);
  daily.deltaConvertVolumeUSD = daily.deltaConvertVolumeUSD.truncate(2);
  daily.deltaConvertUpVolumeUSD = daily.deltaConvertUpVolumeUSD.truncate(2);
  daily.deltaConvertDownVolumeUSD = daily.deltaConvertDownVolumeUSD.truncate(2);
  daily.deltaConvertNeutralVolumeUSD = daily.deltaConvertNeutralVolumeUSD.truncate(2);

  daily.createdTimestamp = day.times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  beanstalk.lastHourlySnapshotSeason = currentSeason;
  beanstalk.lastDailySnapshotDay = day;
  beanstalk.lastUpdateTimestamp = block.timestamp;
  beanstalk.lastUpdateBlockNumber = block.number;
}

// Modifies the provided Beanstalk entity by removing the oldest values from its rolling 7d/24h stats
// Newer values for the latest hour were already added.
function removeOldestRollingBeanstalkStats(beanstalk: Beanstalk, season: i32): void {
  let oldest24h = BeanstalkHourlySnapshot.load(beanstalk.id + "-" + (season - 24).toString());
  if (oldest24h != null) {
    beanstalk.rollingDailyTradeVolumeUSD = beanstalk.rollingDailyTradeVolumeUSD
      .minus(oldest24h.deltaTradeVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyBuyVolumeUSD = beanstalk.rollingDailyBuyVolumeUSD
      .minus(oldest24h.deltaBuyVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailySellVolumeUSD = beanstalk.rollingDailySellVolumeUSD
      .minus(oldest24h.deltaSellVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyTransferVolumeUSD = beanstalk.rollingDailyTransferVolumeUSD
      .minus(oldest24h.deltaTransferVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertVolumeUSD = beanstalk.rollingDailyConvertVolumeUSD
      .minus(oldest24h.deltaConvertVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertUpVolumeUSD = beanstalk.rollingDailyConvertUpVolumeUSD
      .minus(oldest24h.deltaConvertUpVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertDownVolumeUSD = beanstalk.rollingDailyConvertDownVolumeUSD
      .minus(oldest24h.deltaConvertDownVolumeUSD)
      .truncate(2);
    beanstalk.rollingDailyConvertNeutralVolumeUSD = beanstalk.rollingDailyConvertNeutralVolumeUSD
      .minus(oldest24h.deltaConvertNeutralVolumeUSD)
      .truncate(2);

    let oldest7d = BeanstalkHourlySnapshot.load(beanstalk.id + "-" + (season - 168).toString());
    if (oldest7d != null) {
      beanstalk.rollingWeeklyTradeVolumeUSD = beanstalk.rollingWeeklyTradeVolumeUSD
        .minus(oldest7d.deltaTradeVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyBuyVolumeUSD = beanstalk.rollingWeeklyBuyVolumeUSD
        .minus(oldest7d.deltaBuyVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklySellVolumeUSD = beanstalk.rollingWeeklySellVolumeUSD
        .minus(oldest7d.deltaSellVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyTransferVolumeUSD = beanstalk.rollingWeeklyTransferVolumeUSD
        .minus(oldest7d.deltaTransferVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertVolumeUSD = beanstalk.rollingWeeklyConvertVolumeUSD
        .minus(oldest7d.deltaConvertVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertUpVolumeUSD = beanstalk.rollingWeeklyConvertUpVolumeUSD
        .minus(oldest7d.deltaConvertUpVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertDownVolumeUSD = beanstalk.rollingWeeklyConvertDownVolumeUSD
        .minus(oldest7d.deltaConvertDownVolumeUSD)
        .truncate(2);
      beanstalk.rollingWeeklyConvertNeutralVolumeUSD = beanstalk.rollingWeeklyConvertNeutralVolumeUSD
        .minus(oldest7d.deltaConvertNeutralVolumeUSD)
        .truncate(2);
    }
  }
}
