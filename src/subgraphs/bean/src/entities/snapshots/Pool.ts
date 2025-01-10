import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { Pool, PoolDailySnapshot, PoolHourlySnapshot } from "../../../generated/schema";
import { addBigIntArray, subBigIntArray } from "../../../../../core/utils/Decimals";

export function takePoolSnapshots(pool: Pool, block: ethereum.Block): void {
  const season = <i32>parseInt(pool.currentSeason);
  const hour = hourFromTimestamp(block.timestamp);
  const day = dayFromTimestamp(block.timestamp);

  // Load the snapshot for this season/day
  const hourlyId = pool.id.toHexString() + "-" + season.toString();
  const dailyId = pool.id.toHexString() + "-" + day.toString();
  let baseHourly = PoolHourlySnapshot.load(hourlyId);
  let baseDaily = PoolDailySnapshot.load(dailyId);
  if (baseHourly == null && pool.lastHourlySnapshotSeason !== 0) {
    baseHourly = PoolHourlySnapshot.load(pool.id.toHexString() + "-" + pool.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && pool.lastDailySnapshotDay !== 0) {
    baseDaily = PoolDailySnapshot.load(pool.id.toHexString() + "-" + pool.lastDailySnapshotDay.toString());
  }
  let hourly = new PoolHourlySnapshot(hourlyId);
  let daily = new PoolDailySnapshot(dailyId);

  // Set current values
  hourly.seasonNumber = season;
  hourly.season = pool.currentSeason;
  hourly.pool = pool.id;
  hourly.reserves = pool.reserves;
  hourly.lastPrice = pool.lastPrice;
  hourly.crosses = pool.crosses;
  hourly.deltaBeans = pool.deltaBeans; // TODO: This field should only be assignable ONCE when the snapshot is first created
  hourly.volume = pool.volume;
  hourly.volumeUSD = pool.volumeUSD;
  hourly.liquidityUSD = pool.liquidityUSD;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaReserves = subBigIntArray(hourly.reserves, baseHourly.reserves);
    hourly.deltaCrosses = hourly.crosses - baseHourly.crosses;
    hourly.deltaVolume = hourly.volume.minus(baseHourly.volume);
    hourly.deltaVolumeUSD = hourly.volumeUSD.minus(baseHourly.volumeUSD);
    hourly.deltaLiquidityUSD = hourly.liquidityUSD.minus(baseHourly.liquidityUSD);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaReserves = addBigIntArray(hourly.deltaReserves, baseHourly.deltaReserves);
      hourly.deltaCrosses = hourly.deltaCrosses + baseHourly.deltaCrosses;
      hourly.deltaVolume = hourly.deltaVolume.plus(baseHourly.deltaVolume);
      hourly.deltaVolumeUSD = hourly.deltaVolumeUSD.plus(baseHourly.deltaVolumeUSD);
      hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.plus(baseHourly.deltaLiquidityUSD);
    }
  } else {
    hourly.deltaReserves = hourly.reserves;
    hourly.deltaCrosses = hourly.crosses;
    hourly.deltaVolume = hourly.volume;
    hourly.deltaVolumeUSD = hourly.volumeUSD;
    hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD;
  }
  // Set precision on BigDecimal deltas
  hourly.deltaVolumeUSD = hourly.deltaVolumeUSD.truncate(2);
  hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.truncate(2);

  hourly.createdTimestamp = hour.times(BigInt.fromU32(3600));
  hourly.lastUpdateTimestamp = block.timestamp;
  hourly.lastUpdateBlockNumber = block.number;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.day = day;
  daily.season = pool.currentSeason;
  daily.pool = pool.id;
  daily.reserves = pool.reserves;
  daily.lastPrice = pool.lastPrice;
  daily.crosses = pool.crosses;
  daily.deltaBeans = pool.deltaBeans;
  daily.volume = pool.volume;
  daily.volumeUSD = pool.volumeUSD;
  daily.liquidityUSD = pool.liquidityUSD;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaReserves = subBigIntArray(daily.reserves, baseDaily.reserves);
    daily.deltaCrosses = daily.crosses - baseDaily.crosses;
    daily.deltaVolume = daily.volume.minus(baseDaily.volume);
    daily.deltaVolumeUSD = daily.volumeUSD.minus(baseDaily.volumeUSD);
    daily.deltaLiquidityUSD = daily.liquidityUSD.minus(baseDaily.liquidityUSD);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaReserves = addBigIntArray(daily.deltaReserves, baseDaily.deltaReserves);
      daily.deltaCrosses = daily.deltaCrosses + baseDaily.deltaCrosses;
      daily.deltaVolume = daily.deltaVolume.plus(baseDaily.deltaVolume);
      daily.deltaVolumeUSD = daily.deltaVolumeUSD.plus(baseDaily.deltaVolumeUSD);
      daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.plus(baseDaily.deltaLiquidityUSD);
    }
  } else {
    daily.deltaReserves = daily.reserves;
    daily.deltaCrosses = daily.crosses;
    daily.deltaVolume = daily.volume;
    daily.deltaVolumeUSD = daily.volumeUSD;
    daily.deltaLiquidityUSD = daily.deltaLiquidityUSD;
  }
  // Set precision on BigDecimal deltas
  daily.deltaVolumeUSD = daily.deltaVolumeUSD.truncate(2);
  daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.truncate(2);

  daily.createdTimestamp = BigInt.fromI32(daily.day).times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  pool.lastHourlySnapshotSeason = hourly.seasonNumber;
  pool.lastDailySnapshotDay = daily.day;
  pool.lastUpdateTimestamp = block.timestamp;
  pool.lastUpdateBlockNumber = block.number;
}

/////
// TODO:
// twa price
// twaToken2Price
// twaDeltaBeans
// utilization
////
