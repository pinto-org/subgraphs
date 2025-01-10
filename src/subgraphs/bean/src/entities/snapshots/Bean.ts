import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { Bean, BeanDailySnapshot, BeanHourlySnapshot } from "../../../generated/schema";

export function takeBeanSnapshots(bean: Bean, block: ethereum.Block): void {
  const season = <i32>parseInt(bean.currentSeason);
  const hour = hourFromTimestamp(block.timestamp);
  const day = dayFromTimestamp(block.timestamp);

  // Load the snapshot for this season/day
  const hourlyId = bean.id.toHexString() + "-" + season.toString();
  const dailyId = bean.id.toHexString() + "-" + day.toString();
  let baseHourly = BeanHourlySnapshot.load(hourlyId);
  let baseDaily = BeanDailySnapshot.load(dailyId);
  if (baseHourly == null && bean.lastHourlySnapshotSeason !== 0) {
    baseHourly = BeanHourlySnapshot.load(bean.id.toHexString() + "-" + bean.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && bean.lastDailySnapshotDay !== 0) {
    baseDaily = BeanDailySnapshot.load(bean.id.toHexString() + "-" + bean.lastDailySnapshotDay.toString());
  }
  let hourly = new BeanHourlySnapshot(hourlyId);
  let daily = new BeanDailySnapshot(dailyId);

  // Set current values
  hourly.seasonNumber = season;
  hourly.season = bean.currentSeason;
  hourly.bean = bean.id;
  hourly.supply = bean.supply;
  hourly.marketCap = bean.marketCap;
  hourly.price = bean.price;
  hourly.crosses = bean.crosses;
  hourly.supplyInPegLP = bean.supplyInPegLP;
  hourly.lockedBeans = bean.lockedBeans;
  hourly.volume = bean.volume;
  hourly.volumeUSD = bean.volumeUSD;
  hourly.liquidityUSD = bean.liquidityUSD;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaCrosses = hourly.crosses - baseHourly.crosses;
    hourly.deltaVolume = hourly.volume.minus(baseHourly.volume);
    hourly.deltaVolumeUSD = hourly.volumeUSD.minus(baseHourly.volumeUSD);
    hourly.deltaLiquidityUSD = hourly.liquidityUSD.minus(baseHourly.liquidityUSD);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaCrosses = hourly.deltaCrosses + baseHourly.deltaCrosses;
      hourly.deltaVolume = hourly.deltaVolume.plus(baseHourly.deltaVolume);
      hourly.deltaVolumeUSD = hourly.deltaVolumeUSD.plus(baseHourly.deltaVolumeUSD);
      hourly.deltaLiquidityUSD = hourly.deltaLiquidityUSD.plus(baseHourly.deltaLiquidityUSD);
    }
  } else {
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
  daily.season = bean.currentSeason;
  daily.bean = bean.id;
  daily.supply = bean.supply;
  daily.marketCap = bean.marketCap;
  daily.price = bean.price;
  daily.crosses = bean.crosses;
  daily.supplyInPegLP = bean.supplyInPegLP;
  daily.lockedBeans = bean.lockedBeans;
  daily.volume = bean.volume;
  daily.volumeUSD = bean.volumeUSD;
  daily.liquidityUSD = bean.liquidityUSD;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaCrosses = daily.crosses - baseDaily.crosses;
    daily.deltaVolume = daily.volume.minus(baseDaily.volume);
    daily.deltaVolumeUSD = daily.volumeUSD.minus(baseDaily.volumeUSD);
    daily.deltaLiquidityUSD = daily.liquidityUSD.minus(baseDaily.liquidityUSD);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaCrosses = daily.deltaCrosses + baseDaily.deltaCrosses;
      daily.deltaVolume = daily.deltaVolume.plus(baseDaily.deltaVolume);
      daily.deltaVolumeUSD = daily.deltaVolumeUSD.plus(baseDaily.deltaVolumeUSD);
      daily.deltaLiquidityUSD = daily.deltaLiquidityUSD.plus(baseDaily.deltaLiquidityUSD);
    }
  } else {
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

  bean.lastHourlySnapshotSeason = hourly.seasonNumber;
  bean.lastDailySnapshotDay = daily.day;
  bean.lastUpdateTimestamp = block.timestamp;
  bean.lastUpdateBlockNumber = block.number;
}

/////
// TODO:
// twa price
// instantaneousDeltaB
// twaDeltaB
////
