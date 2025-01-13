import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { Pool, PoolDailySnapshot, PoolHourlySnapshot } from "../../../generated/schema";
import { addBigIntArray, BI_MAX, emptyBigIntArray, subBigIntArray, ZERO_BD } from "../../../../../core/utils/Decimals";
import { TwaResults } from "../../utils/price/Types";

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
  // These fields are expected to be initialized at sunrise, after this method
  hourly.twaReserves = emptyBigIntArray(2);
  hourly.twaPrice = ZERO_BD;
  hourly.twaToken2Price = ZERO_BD;
  hourly.twaDeltaBeans = BI_MAX;

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
    hourly.deltaLiquidityUSD = hourly.liquidityUSD;
  }
  // Set precision on BigDecimal deltas
  hourly.deltaVolumeUSD = hourly.deltaVolumeUSD.truncate(2);
  hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.truncate(2);

  hourly.createdTimestamp = BigInt.fromI32(hour).times(BigInt.fromU32(3600));
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
  // These fields are expected to be initialized at sunrise, after this method
  daily.twaReserves = emptyBigIntArray(2);
  daily.twaPrice = ZERO_BD;
  daily.twaToken2Price = ZERO_BD;
  daily.twaDeltaBeans = BI_MAX;

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
    daily.deltaLiquidityUSD = daily.liquidityUSD;
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

export function setPoolSnapshotTwa(poolAddress: Address, twaValues: TwaResults): void {
  const pool = Pool.load(poolAddress)!;
  const hourly = PoolHourlySnapshot.load(pool.id.toHexString() + "-" + pool.lastHourlySnapshotSeason.toString())!;
  hourly.twaReserves = twaValues.reserves;
  hourly.twaPrice = twaValues.price;
  hourly.twaToken2Price = twaValues.token2Price;
  hourly.twaDeltaBeans = twaValues.deltaB;
  hourly.save();

  const daily = PoolDailySnapshot.load(pool.id.toHexString() + "-" + pool.lastDailySnapshotDay.toString())!;
  daily.twaReserves = twaValues.reserves;
  daily.twaPrice = twaValues.price;
  daily.twaToken2Price = twaValues.token2Price;
  daily.twaDeltaBeans = twaValues.deltaB;
  daily.save();
}
