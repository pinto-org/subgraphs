import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Well, WellDailySnapshot, WellHourlySnapshot } from "../../../generated/schema";
import {
  addBigDecimalArray,
  addBigIntArray,
  subBigDecimalArray,
  subBigIntArray
} from "../../../../../core/utils/Decimals";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { loadBeanstalk } from "../Beanstalk";

export function takeWellSnapshots(well: Well, block: ethereum.Block): void {
  const hour = hourFromTimestamp(block.timestamp);
  const day = dayFromTimestamp(block.timestamp, 8 * 60 * 60);

  // Load the snapshot for this hour/day
  const hourlyId = well.id.toHexString() + "-" + hour.toString();
  const dailyId = well.id.toHexString() + "-" + day.toString();
  let baseHourly = WellHourlySnapshot.load(hourlyId);
  let baseDaily = WellDailySnapshot.load(dailyId);
  if (baseHourly == null && well.lastHourlySnapshotHour !== 0) {
    baseHourly = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString());
  }
  if (baseDaily == null && well.lastDailySnapshotDay !== 0) {
    baseDaily = WellDailySnapshot.load(well.id.toHexString() + "-" + well.lastDailySnapshotDay.toString());
  }
  let hourly = new WellHourlySnapshot(hourlyId);
  let daily = new WellDailySnapshot(dailyId);

  // Set current values
  hourly.hour = hour;
  if (well.isBeanstalk) {
    // For Beanstalk Wells, prevent starting new snapshot until the new season.
    // This will cause the same case as when a snapshot is taken again during the same hour.
    hourly.season = loadBeanstalk().lastSeason;
    if (baseHourly && hourly.id != baseHourly.id && hourly.season == baseHourly.season) {
      hourly = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString())!;
    }
  }
  hourly.well = well.id;
  hourly.lpTokenSupply = well.lpTokenSupply;
  hourly.totalLiquidityUSD = well.totalLiquidityUSD;
  hourly.tokenRates = well.tokenRates;
  hourly.cumulativeTradeVolumeReserves = well.cumulativeTradeVolumeReserves;
  hourly.cumulativeTradeVolumeReservesUSD = well.cumulativeTradeVolumeReservesUSD;
  hourly.cumulativeTradeVolumeUSD = well.cumulativeTradeVolumeUSD;
  hourly.cumulativeBiTradeVolumeReserves = well.cumulativeBiTradeVolumeReserves;
  hourly.cumulativeTransferVolumeReserves = well.cumulativeTransferVolumeReserves;
  hourly.cumulativeTransferVolumeReservesUSD = well.cumulativeTransferVolumeReservesUSD;
  hourly.cumulativeTransferVolumeUSD = well.cumulativeTransferVolumeUSD;
  hourly.convertVolumeReserves = well.convertVolumeReserves;
  hourly.convertVolumeReservesUSD = well.convertVolumeReservesUSD;
  hourly.convertVolumeUSD = well.convertVolumeUSD;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaLpTokenSupply = hourly.lpTokenSupply.minus(baseHourly.lpTokenSupply);
    hourly.deltaLiquidityUSD = hourly.totalLiquidityUSD.minus(baseHourly.totalLiquidityUSD);
    hourly.deltaTokenRates = subBigDecimalArray(hourly.tokenRates, baseHourly.tokenRates);
    hourly.deltaTradeVolumeReserves = subBigIntArray(
      hourly.cumulativeTradeVolumeReserves,
      baseHourly.cumulativeTradeVolumeReserves
    );
    hourly.deltaTradeVolumeReservesUSD = subBigDecimalArray(
      hourly.cumulativeTradeVolumeReservesUSD,
      baseHourly.cumulativeTradeVolumeReservesUSD
    );
    hourly.deltaTradeVolumeUSD = hourly.cumulativeTradeVolumeUSD.minus(baseHourly.cumulativeTradeVolumeUSD);
    hourly.deltaBiTradeVolumeReserves = subBigIntArray(
      hourly.cumulativeBiTradeVolumeReserves,
      baseHourly.cumulativeBiTradeVolumeReserves
    );
    hourly.deltaTransferVolumeReserves = subBigIntArray(
      hourly.cumulativeTransferVolumeReserves,
      baseHourly.cumulativeTransferVolumeReserves
    );
    hourly.deltaTransferVolumeReservesUSD = subBigDecimalArray(
      hourly.cumulativeTransferVolumeReservesUSD,
      baseHourly.cumulativeTransferVolumeReservesUSD
    );
    hourly.deltaTransferVolumeUSD = hourly.cumulativeTransferVolumeUSD.minus(baseHourly.cumulativeTransferVolumeUSD);
    hourly.deltaConvertVolumeReserves = subBigIntArray(hourly.convertVolumeReserves, baseHourly.convertVolumeReserves);
    hourly.deltaConvertVolumeReservesUSD = subBigDecimalArray(
      hourly.convertVolumeReservesUSD,
      baseHourly.convertVolumeReservesUSD
    );
    hourly.deltaConvertVolumeUSD = hourly.convertVolumeUSD.minus(baseHourly.convertVolumeUSD);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaLpTokenSupply = hourly.deltaLpTokenSupply.plus(baseHourly.deltaLpTokenSupply);
      hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.plus(baseHourly.deltaLiquidityUSD);
      hourly.deltaTokenRates = addBigDecimalArray(hourly.deltaTokenRates, baseHourly.deltaTokenRates);
      hourly.deltaTradeVolumeReserves = addBigIntArray(
        hourly.deltaTradeVolumeReserves,
        baseHourly.deltaTradeVolumeReserves
      );
      hourly.deltaTradeVolumeReservesUSD = addBigDecimalArray(
        hourly.deltaTradeVolumeReservesUSD,
        baseHourly.deltaTradeVolumeReservesUSD
      );
      hourly.deltaTradeVolumeUSD = hourly.deltaTradeVolumeUSD.plus(baseHourly.deltaTradeVolumeUSD);
      hourly.deltaBiTradeVolumeReserves = addBigIntArray(
        hourly.deltaBiTradeVolumeReserves,
        baseHourly.deltaBiTradeVolumeReserves
      );
      hourly.deltaTransferVolumeReserves = addBigIntArray(
        hourly.deltaTransferVolumeReserves,
        baseHourly.deltaTransferVolumeReserves
      );
      hourly.deltaTransferVolumeReservesUSD = addBigDecimalArray(
        hourly.deltaTransferVolumeReservesUSD,
        baseHourly.deltaTransferVolumeReservesUSD
      );
      hourly.deltaTransferVolumeUSD = hourly.deltaTransferVolumeUSD.plus(baseHourly.deltaTransferVolumeUSD);
      hourly.deltaConvertVolumeReserves = addBigIntArray(
        hourly.deltaConvertVolumeReserves,
        baseHourly.deltaConvertVolumeReserves
      );
      hourly.deltaConvertVolumeReservesUSD = addBigDecimalArray(
        hourly.deltaConvertVolumeReservesUSD,
        baseHourly.deltaConvertVolumeReservesUSD
      );
      hourly.deltaConvertVolumeUSD = hourly.deltaConvertVolumeUSD.plus(baseHourly.deltaConvertVolumeUSD);
    } else {
      // *Hourly only functionality*
      // This is the first time creating a snapshot for this hour, and past datapoints are available.
      removeOldestRollingWellStats(well, hourly.hour);
    }
  } else {
    hourly.deltaLpTokenSupply = hourly.lpTokenSupply;
    hourly.deltaLiquidityUSD = hourly.totalLiquidityUSD;
    hourly.deltaTokenRates = hourly.tokenRates;
    hourly.deltaTradeVolumeReserves = hourly.cumulativeTradeVolumeReserves;
    hourly.deltaTradeVolumeReservesUSD = hourly.cumulativeTradeVolumeReservesUSD;
    hourly.deltaTradeVolumeUSD = hourly.cumulativeTradeVolumeUSD;
    hourly.deltaBiTradeVolumeReserves = hourly.cumulativeBiTradeVolumeReserves;
    hourly.deltaTransferVolumeReserves = hourly.cumulativeTransferVolumeReserves;
    hourly.deltaTransferVolumeReservesUSD = hourly.cumulativeTransferVolumeReservesUSD;
    hourly.deltaTransferVolumeUSD = hourly.cumulativeTransferVolumeUSD;
    hourly.deltaConvertVolumeReserves = hourly.convertVolumeReserves;
    hourly.deltaConvertVolumeReservesUSD = hourly.convertVolumeReservesUSD;
    hourly.deltaConvertVolumeUSD = hourly.convertVolumeUSD;
  }
  // Set precision on BigDecimal deltas
  hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.truncate(2);
  hourly.deltaTradeVolumeReservesUSD = hourly.deltaTradeVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  hourly.deltaTradeVolumeUSD = hourly.deltaTradeVolumeUSD.truncate(2);
  hourly.deltaTransferVolumeReservesUSD = hourly.deltaTransferVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  hourly.deltaTransferVolumeUSD = hourly.deltaTransferVolumeUSD.truncate(2);
  hourly.deltaConvertVolumeReservesUSD = hourly.deltaConvertVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  hourly.deltaConvertVolumeUSD = hourly.deltaConvertVolumeUSD.truncate(2);

  hourly.createdTimestamp = BigInt.fromI32(hourly.hour).times(BigInt.fromU32(3600));
  hourly.lastUpdateTimestamp = block.timestamp;
  hourly.lastUpdateBlockNumber = block.number;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  if (well.isBeanstalk) {
    daily.season = loadBeanstalk().lastSeason;
  }
  daily.day = day;
  daily.well = well.id;
  daily.lpTokenSupply = well.lpTokenSupply;
  daily.totalLiquidityUSD = well.totalLiquidityUSD;
  daily.tokenRates = well.tokenRates;
  daily.cumulativeTradeVolumeReserves = well.cumulativeTradeVolumeReserves;
  daily.cumulativeTradeVolumeReservesUSD = well.cumulativeTradeVolumeReservesUSD;
  daily.cumulativeTradeVolumeUSD = well.cumulativeTradeVolumeUSD;
  daily.cumulativeBiTradeVolumeReserves = well.cumulativeBiTradeVolumeReserves;
  daily.cumulativeTransferVolumeReserves = well.cumulativeTransferVolumeReserves;
  daily.cumulativeTransferVolumeReservesUSD = well.cumulativeTransferVolumeReservesUSD;
  daily.cumulativeTransferVolumeUSD = well.cumulativeTransferVolumeUSD;
  daily.convertVolumeReserves = well.convertVolumeReserves;
  daily.convertVolumeReservesUSD = well.convertVolumeReservesUSD;
  daily.convertVolumeUSD = well.convertVolumeUSD;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaLpTokenSupply = daily.lpTokenSupply.minus(baseDaily.lpTokenSupply);
    daily.deltaLiquidityUSD = daily.totalLiquidityUSD.minus(baseDaily.totalLiquidityUSD);
    daily.deltaTokenRates = subBigDecimalArray(daily.tokenRates, baseDaily.tokenRates);
    daily.deltaTradeVolumeReserves = subBigIntArray(
      daily.cumulativeTradeVolumeReserves,
      baseDaily.cumulativeTradeVolumeReserves
    );
    daily.deltaTradeVolumeReservesUSD = subBigDecimalArray(
      daily.cumulativeTradeVolumeReservesUSD,
      baseDaily.cumulativeTradeVolumeReservesUSD
    );
    daily.deltaTradeVolumeUSD = daily.cumulativeTradeVolumeUSD.minus(baseDaily.cumulativeTradeVolumeUSD);
    daily.deltaBiTradeVolumeReserves = subBigIntArray(
      daily.cumulativeBiTradeVolumeReserves,
      baseDaily.cumulativeBiTradeVolumeReserves
    );
    daily.deltaTransferVolumeReserves = subBigIntArray(
      daily.cumulativeTransferVolumeReserves,
      baseDaily.cumulativeTransferVolumeReserves
    );
    daily.deltaTransferVolumeReservesUSD = subBigDecimalArray(
      daily.cumulativeTransferVolumeReservesUSD,
      baseDaily.cumulativeTransferVolumeReservesUSD
    );
    daily.deltaTransferVolumeUSD = daily.cumulativeTransferVolumeUSD.minus(baseDaily.cumulativeTransferVolumeUSD);
    daily.deltaConvertVolumeReserves = subBigIntArray(daily.convertVolumeReserves, baseDaily.convertVolumeReserves);
    daily.deltaConvertVolumeReservesUSD = subBigDecimalArray(
      daily.convertVolumeReservesUSD,
      baseDaily.convertVolumeReservesUSD
    );
    daily.deltaConvertVolumeUSD = daily.convertVolumeUSD.minus(baseDaily.convertVolumeUSD);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaLpTokenSupply = daily.deltaLpTokenSupply.plus(baseDaily.deltaLpTokenSupply);
      daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.plus(baseDaily.deltaLiquidityUSD);
      daily.deltaTokenRates = addBigDecimalArray(daily.deltaTokenRates, baseDaily.deltaTokenRates);
      daily.deltaTradeVolumeReserves = addBigIntArray(
        daily.deltaTradeVolumeReserves,
        baseDaily.deltaTradeVolumeReserves
      );
      daily.deltaTradeVolumeReservesUSD = addBigDecimalArray(
        daily.deltaTradeVolumeReservesUSD,
        baseDaily.deltaTradeVolumeReservesUSD
      );
      daily.deltaTradeVolumeUSD = daily.deltaTradeVolumeUSD.plus(baseDaily.deltaTradeVolumeUSD);
      daily.deltaBiTradeVolumeReserves = addBigIntArray(
        daily.deltaBiTradeVolumeReserves,
        baseDaily.deltaBiTradeVolumeReserves
      );
      daily.deltaTransferVolumeReserves = addBigIntArray(
        daily.deltaTransferVolumeReserves,
        baseDaily.deltaTransferVolumeReserves
      );
      daily.deltaTransferVolumeReservesUSD = addBigDecimalArray(
        daily.deltaTransferVolumeReservesUSD,
        baseDaily.deltaTransferVolumeReservesUSD
      );
      daily.deltaTransferVolumeUSD = daily.deltaTransferVolumeUSD.plus(baseDaily.deltaTransferVolumeUSD);
      daily.deltaConvertVolumeReserves = addBigIntArray(
        daily.deltaConvertVolumeReserves,
        baseDaily.deltaConvertVolumeReserves
      );
      daily.deltaConvertVolumeReservesUSD = addBigDecimalArray(
        daily.deltaConvertVolumeReservesUSD,
        baseDaily.deltaConvertVolumeReservesUSD
      );
      daily.deltaConvertVolumeUSD = daily.deltaConvertVolumeUSD.plus(baseDaily.deltaConvertVolumeUSD);
    }
  } else {
    daily.deltaLpTokenSupply = daily.lpTokenSupply;
    daily.deltaLiquidityUSD = daily.totalLiquidityUSD;
    daily.deltaTokenRates = daily.tokenRates;
    daily.deltaTradeVolumeReserves = daily.cumulativeTradeVolumeReserves;
    daily.deltaTradeVolumeReservesUSD = daily.cumulativeTradeVolumeReservesUSD;
    daily.deltaTradeVolumeUSD = daily.cumulativeTradeVolumeUSD;
    daily.deltaBiTradeVolumeReserves = daily.cumulativeBiTradeVolumeReserves;
    daily.deltaTransferVolumeReserves = daily.cumulativeTransferVolumeReserves;
    daily.deltaTransferVolumeReservesUSD = daily.cumulativeTransferVolumeReservesUSD;
    daily.deltaTransferVolumeUSD = daily.cumulativeTransferVolumeUSD;
    daily.deltaConvertVolumeReserves = daily.convertVolumeReserves;
    daily.deltaConvertVolumeReservesUSD = daily.convertVolumeReservesUSD;
    daily.deltaConvertVolumeUSD = daily.convertVolumeUSD;
  }
  // Set precision on BigDecimal deltas
  daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.truncate(2);
  daily.deltaTradeVolumeReservesUSD = daily.deltaTradeVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  daily.deltaTradeVolumeUSD = daily.deltaTradeVolumeUSD.truncate(2);
  daily.deltaTransferVolumeReservesUSD = daily.deltaTransferVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  daily.deltaTransferVolumeUSD = daily.deltaTransferVolumeUSD.truncate(2);
  daily.deltaConvertVolumeReservesUSD = daily.deltaConvertVolumeReservesUSD.map<BigDecimal>((bd) => bd.truncate(2));
  daily.deltaConvertVolumeUSD = daily.deltaConvertVolumeUSD.truncate(2);

  daily.createdTimestamp = BigInt.fromI32(daily.day).times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  well.lastHourlySnapshotHour = hourly.hour;
  well.lastDailySnapshotDay = daily.day;
  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
}

// Modifies the provided Well entity by removing the oldest values from its rolling 7d/24h stats.
// Maintains a 1 hour buffer, i.e. rolling 24-25h rather than 23-24h.
function removeOldestRollingWellStats(well: Well, hour: i32): void {
  let oldest24h = WellHourlySnapshot.load(well.id.toHexString() + "-" + (hour - 24 - 1).toString());
  if (oldest24h != null) {
    well.rollingDailyTradeVolumeReserves = subBigIntArray(
      well.rollingDailyTradeVolumeReserves,
      oldest24h.deltaTradeVolumeReserves
    );
    well.rollingDailyTradeVolumeReservesUSD = subBigDecimalArray(
      well.rollingDailyTradeVolumeReservesUSD,
      oldest24h.deltaTradeVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingDailyTradeVolumeUSD = well.rollingDailyTradeVolumeUSD.minus(oldest24h.deltaTradeVolumeUSD).truncate(2);
    well.rollingDailyBiTradeVolumeReserves = subBigIntArray(
      well.rollingDailyBiTradeVolumeReserves,
      oldest24h.deltaBiTradeVolumeReserves
    );
    well.rollingDailyTransferVolumeReserves = subBigIntArray(
      well.rollingDailyTransferVolumeReserves,
      oldest24h.deltaTransferVolumeReserves
    );
    well.rollingDailyTransferVolumeReservesUSD = subBigDecimalArray(
      well.rollingDailyTransferVolumeReservesUSD,
      oldest24h.deltaTransferVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingDailyTransferVolumeUSD = well.rollingDailyTransferVolumeUSD
      .minus(oldest24h.deltaTransferVolumeUSD)
      .truncate(2);
    well.rollingDailyConvertVolumeReserves = subBigIntArray(
      well.rollingDailyConvertVolumeReserves,
      oldest24h.deltaConvertVolumeReserves
    );
    well.rollingDailyConvertVolumeReservesUSD = subBigDecimalArray(
      well.rollingDailyConvertVolumeReservesUSD,
      oldest24h.deltaConvertVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingDailyConvertVolumeUSD = well.rollingDailyConvertVolumeUSD
      .minus(oldest24h.deltaConvertVolumeUSD)
      .truncate(2);
  }

  let oldest7d = WellHourlySnapshot.load(well.id.toHexString() + "-" + (hour - 168 - 1).toString());
  if (oldest7d != null) {
    well.rollingWeeklyTradeVolumeReserves = subBigIntArray(
      well.rollingWeeklyTradeVolumeReserves,
      oldest7d.deltaTradeVolumeReserves
    );
    well.rollingWeeklyTradeVolumeReservesUSD = subBigDecimalArray(
      well.rollingWeeklyTradeVolumeReservesUSD,
      oldest7d.deltaTradeVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingWeeklyTradeVolumeUSD = well.rollingWeeklyTradeVolumeUSD.minus(oldest7d.deltaTradeVolumeUSD).truncate(2);
    well.rollingWeeklyBiTradeVolumeReserves = subBigIntArray(
      well.rollingWeeklyBiTradeVolumeReserves,
      oldest7d.deltaBiTradeVolumeReserves
    );
    well.rollingWeeklyTransferVolumeReserves = subBigIntArray(
      well.rollingWeeklyTransferVolumeReserves,
      oldest7d.deltaTransferVolumeReserves
    );
    well.rollingWeeklyTransferVolumeReservesUSD = subBigDecimalArray(
      well.rollingWeeklyTransferVolumeReservesUSD,
      oldest7d.deltaTransferVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingWeeklyTransferVolumeUSD = well.rollingWeeklyTransferVolumeUSD
      .minus(oldest7d.deltaTransferVolumeUSD)
      .truncate(2);
    well.rollingWeeklyConvertVolumeReserves = subBigIntArray(
      well.rollingWeeklyConvertVolumeReserves,
      oldest7d.deltaConvertVolumeReserves
    );
    well.rollingWeeklyConvertVolumeReservesUSD = subBigDecimalArray(
      well.rollingWeeklyConvertVolumeReservesUSD,
      oldest7d.deltaConvertVolumeReservesUSD
    ).map<BigDecimal>((bd) => bd.truncate(2));
    well.rollingWeeklyConvertVolumeUSD = well.rollingWeeklyConvertVolumeUSD
      .minus(oldest7d.deltaConvertVolumeUSD)
      .truncate(2);
  }
}
