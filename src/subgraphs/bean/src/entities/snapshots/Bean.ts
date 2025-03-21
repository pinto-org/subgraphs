import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { Bean, BeanDailySnapshot, BeanHourlySnapshot } from "../../../generated/schema";
import { BD_MAX, toDecimal, ZERO_BD } from "../../../../../core/utils/Decimals";
import { LiquidityBreakdown } from "../../utils/price/PoolStats";

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
  hourly.crosses = bean.crosses;
  hourly.supplyInPegLP = bean.supplyInPegLP;
  hourly.lockedBeans = bean.lockedBeans;
  hourly.volume = bean.volume;
  hourly.volumeUSD = bean.volumeUSD;
  hourly.liquidityUSD = bean.liquidityUSD;
  // These fields are expected to be initialized at sunrise, after this method
  hourly.marketCap = ZERO_BD;
  hourly.instPrice = ZERO_BD;
  hourly.twaPrice = ZERO_BD;
  hourly.twaBeanLiquidityUSD = ZERO_BD;
  hourly.twaNonBeanLiquidityUSD = ZERO_BD;
  hourly.twaLiquidityUSD = ZERO_BD;
  hourly.l2sr = ZERO_BD;
  hourly.twaDeltaB = BD_MAX;
  hourly.instDeltaB = BD_MAX;

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
      // Prevent reassignment to these values after initial creation/external modification
      hourly.marketCap = baseHourly.marketCap;
      hourly.instPrice = baseHourly.instPrice;
      hourly.twaPrice = baseHourly.twaPrice;
      hourly.twaBeanLiquidityUSD = baseHourly.twaBeanLiquidityUSD;
      hourly.twaNonBeanLiquidityUSD = baseHourly.twaNonBeanLiquidityUSD;
      hourly.twaLiquidityUSD = baseHourly.twaLiquidityUSD;
      hourly.l2sr = baseHourly.l2sr;
      hourly.twaDeltaB = baseHourly.twaDeltaB;
      hourly.instDeltaB = baseHourly.instDeltaB;
    }
  } else {
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
  daily.season = bean.currentSeason;
  daily.bean = bean.id;
  daily.supply = bean.supply;
  daily.crosses = bean.crosses;
  daily.supplyInPegLP = bean.supplyInPegLP;
  daily.lockedBeans = bean.lockedBeans;
  daily.volume = bean.volume;
  daily.volumeUSD = bean.volumeUSD;
  daily.liquidityUSD = bean.liquidityUSD;
  // These fields are expected to be initialized at sunrise, after this method
  daily.marketCap = ZERO_BD;
  daily.instPrice = ZERO_BD;
  daily.twaPrice = ZERO_BD;
  daily.twaBeanLiquidityUSD = ZERO_BD;
  daily.twaNonBeanLiquidityUSD = ZERO_BD;
  daily.twaLiquidityUSD = ZERO_BD;
  daily.l2sr = ZERO_BD;
  daily.twaDeltaB = BD_MAX;
  daily.instDeltaB = BD_MAX;

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
      // Prevent reassignment to these values after initial creation/external modification
      daily.marketCap = baseDaily.marketCap;
      daily.instPrice = baseDaily.instPrice;
      daily.twaPrice = baseDaily.twaPrice;
      daily.twaBeanLiquidityUSD = baseDaily.twaBeanLiquidityUSD;
      daily.twaNonBeanLiquidityUSD = baseDaily.twaNonBeanLiquidityUSD;
      daily.twaLiquidityUSD = baseDaily.twaLiquidityUSD;
      daily.l2sr = baseDaily.l2sr;
      daily.twaDeltaB = baseDaily.twaDeltaB;
      daily.instDeltaB = baseDaily.instDeltaB;
    }
  } else {
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

  bean.lastHourlySnapshotSeason = hourly.seasonNumber;
  bean.lastDailySnapshotDay = daily.day;
  bean.lastUpdateTimestamp = block.timestamp;
  bean.lastUpdateBlockNumber = block.number;
}

// Set inst price/deltaB values from the start of the season. Snapshot must have already been created.
export function setBeanSnapshotInstValues(bean: Bean, instDeltaB: BigDecimal): void {
  const hourly = BeanHourlySnapshot.load(bean.id.toHexString() + "-" + bean.lastHourlySnapshotSeason.toString())!;
  if (hourly.instPrice == ZERO_BD) {
    hourly.marketCap = toDecimal(bean.supply).times(bean.lastPrice).truncate(2);
    hourly.instPrice = bean.lastPrice;
    hourly.instDeltaB = instDeltaB;
    hourly.save();
  }
  const daily = BeanDailySnapshot.load(bean.id.toHexString() + "-" + bean.lastDailySnapshotDay.toString())!;
  if (daily.instPrice == ZERO_BD) {
    daily.marketCap = toDecimal(bean.supply).times(bean.lastPrice).truncate(2);
    daily.instPrice = bean.lastPrice;
    daily.instDeltaB = instDeltaB;
    daily.save();
  }
}

// Set twa values from the start of the season. Snapshot must have already been created.
export function setBeanSnapshotTwa(
  bean: Bean,
  twaPrice: BigDecimal,
  twaLiquidity: LiquidityBreakdown,
  twaDeltaB: BigDecimal
): void {
  const hourly = BeanHourlySnapshot.load(bean.id.toHexString() + "-" + bean.lastHourlySnapshotSeason.toString())!;
  hourly.twaPrice = twaPrice.truncate(6);
  hourly.twaBeanLiquidityUSD = twaLiquidity.beanLiquidity.truncate(2);
  hourly.twaNonBeanLiquidityUSD = twaLiquidity.nonBeanLiquidity.truncate(2);
  hourly.twaLiquidityUSD = twaLiquidity.totalLiquidity.truncate(2);
  hourly.twaDeltaB = twaDeltaB;

  // Set L2SR here now that twa liquidity is known
  hourly.l2sr = twaLiquidity.nonBeanLiquidity.div(toDecimal(bean.supply)).truncate(6);
  hourly.save();

  const daily = BeanDailySnapshot.load(bean.id.toHexString() + "-" + bean.lastDailySnapshotDay.toString())!;
  if (daily.twaPrice == ZERO_BD) {
    daily.twaPrice = twaPrice.truncate(6);
    daily.twaBeanLiquidityUSD = twaLiquidity.beanLiquidity.truncate(2);
    daily.twaNonBeanLiquidityUSD = twaLiquidity.nonBeanLiquidity.truncate(2);
    daily.twaLiquidityUSD = twaLiquidity.totalLiquidity.truncate(2);
    daily.twaDeltaB = twaDeltaB;
    daily.l2sr = hourly.l2sr;
    daily.save();
  }
}
