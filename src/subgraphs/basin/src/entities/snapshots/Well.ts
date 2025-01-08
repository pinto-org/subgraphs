import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Well, WellDailySnapshot, WellHourlySnapshot } from "../../../generated/schema";
import { loadWell } from "../Well";
import {
  addBigDecimalArray,
  addBigIntArray,
  emptyBigDecimalArray,
  emptyBigIntArray,
  subBigDecimalArray,
  subBigIntArray,
  ZERO_BD,
  ZERO_BI
} from "../../../../../core/utils/Decimals";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { loadBeanstalk } from "../Beanstalk";

// TODO: needs truncation on bd values
export function takeWellSnapshots(well: Well, block: ethereum.Block): void {
  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this hour/day
  const hourlyId = well.id.toHexString() + "-" + hour.toString();
  const dailyId = well.id.toHexString() + "-" + day.toString();
  let baseHourly = WellHourlySnapshot.load(hourlyId);
  let baseDaily = WellDailySnapshot.load(dailyId);
  if (baseHourly == null && well.lastHourlySnapshotHour !== 0) {
    baseHourly = WellHourlySnapshot.load(well.id.toHexString() + "-" + well.lastHourlySnapshotHour.toString());
  }
  if (baseDaily == null && well.lastDailySnapshotDay !== null) {
    baseDaily = WellDailySnapshot.load(well.id.toHexString() + "-" + well.lastDailySnapshotDay!.toString());
  }
  const hourly = new WellHourlySnapshot(hourlyId);
  const daily = new WellDailySnapshot(dailyId);

  // Set current values
  if (well.isBeanstalk) {
    hourly.season = loadBeanstalk().lastSeason;
  }
  hourly.hour = hour;
  hourly.well = well.id;
  hourly.lpTokenSupply = well.lpTokenSupply;
  hourly.totalLiquidityUSD = well.totalLiquidityUSD;
  hourly.tokenPrice = well.tokenPrice;
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
    hourly.deltaTokenPrice = subBigIntArray(hourly.tokenPrice, baseHourly.tokenPrice);
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
      hourly.deltaTokenPrice = addBigIntArray(hourly.deltaTokenPrice, baseHourly.deltaTokenPrice);
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
      // Update the rolling 24h/7d values by removing the oldest value.
      // Newer values for the latest hour were already added.
      // TODO
    }
  } else {
    hourly.deltaLpTokenSupply = hourly.lpTokenSupply;
    hourly.deltaLiquidityUSD = hourly.totalLiquidityUSD;
    hourly.deltaTokenPrice = hourly.tokenPrice;
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
  hourly.createdTimestamp = hour.times(BigInt.fromU32(3600));
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
  daily.tokenPrice = well.tokenPrice;
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
    daily.deltaTokenPrice = subBigIntArray(daily.tokenPrice, baseDaily.tokenPrice);
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
      daily.deltaTokenPrice = addBigIntArray(daily.deltaTokenPrice, baseDaily.deltaTokenPrice);
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
    daily.deltaTokenPrice = daily.tokenPrice;
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
  daily.createdTimestamp = day.times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  well.lastHourlySnapshotHour = hour;
  well.lastDailySnapshotDay = day;
}

export function loadOrCreateWellDailySnapshot(
  wellAddress: Address,
  dayID: i32,
  block: ethereum.Block
): WellDailySnapshot {
  let snapshot = WellDailySnapshot.load(wellAddress.concatI32(dayID));

  if (snapshot == null) {
    let well = loadWell(wellAddress);
    snapshot = new WellDailySnapshot(wellAddress.concatI32(dayID));
    snapshot.day = dayID;
    snapshot.well = wellAddress;
    snapshot.season = "1"; /// change when reimplemented
    snapshot.lpTokenSupply = well.lpTokenSupply;
    snapshot.totalLiquidityUSD = well.totalLiquidityUSD;
    snapshot.tokenPrice = well.tokenPrice;
    snapshot.deltaTokenPrice = well.tokenPrice; ///
    snapshot.cumulativeTradeVolumeReserves = well.cumulativeTradeVolumeReserves;
    snapshot.cumulativeTradeVolumeReservesUSD = well.cumulativeTradeVolumeReservesUSD;
    snapshot.cumulativeTradeVolumeUSD = well.cumulativeTradeVolumeUSD;
    snapshot.cumulativeBiTradeVolumeReserves = well.cumulativeBiTradeVolumeReserves;
    snapshot.cumulativeTransferVolumeReserves = well.cumulativeTransferVolumeReserves;
    snapshot.cumulativeTransferVolumeReservesUSD = well.cumulativeTransferVolumeReservesUSD;
    snapshot.cumulativeTransferVolumeUSD = well.cumulativeTransferVolumeUSD;
    snapshot.deltaLpTokenSupply = ZERO_BI;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaTradeVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTradeVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaTradeVolumeUSD = ZERO_BD;
    snapshot.deltaBiTradeVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTransferVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTransferVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaTransferVolumeUSD = ZERO_BD;
    ///
    snapshot.convertVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.convertVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.convertVolumeUSD = ZERO_BD;
    snapshot.deltaConvertVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaConvertVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaConvertVolumeUSD = ZERO_BD;
    ///
    snapshot.lastUpdateTimestamp = block.timestamp;
    snapshot.lastUpdateBlockNumber = block.number;
    snapshot.save();
  }
  return snapshot as WellDailySnapshot;
}

export function loadOrCreateWellHourlySnapshot(
  wellAddress: Address,
  hourID: i32,
  block: ethereum.Block
): WellHourlySnapshot {
  let snapshot = WellHourlySnapshot.load(wellAddress.concatI32(hourID));
  if (snapshot == null) {
    let well = loadWell(wellAddress);
    snapshot = new WellHourlySnapshot(wellAddress.concatI32(hourID));
    snapshot.hour = hourID;
    snapshot.well = wellAddress;
    snapshot.season = "1"; /// change when reimplemented
    snapshot.lpTokenSupply = well.lpTokenSupply;
    snapshot.totalLiquidityUSD = well.totalLiquidityUSD;
    snapshot.tokenPrice = well.tokenPrice;
    snapshot.deltaTokenPrice = well.tokenPrice; ///
    snapshot.cumulativeTradeVolumeReserves = well.cumulativeTradeVolumeReserves;
    snapshot.cumulativeTradeVolumeReservesUSD = well.cumulativeTradeVolumeReservesUSD;
    snapshot.cumulativeTradeVolumeUSD = well.cumulativeTradeVolumeUSD;
    snapshot.cumulativeBiTradeVolumeReserves = well.cumulativeBiTradeVolumeReserves;
    snapshot.cumulativeTransferVolumeReserves = well.cumulativeTransferVolumeReserves;
    snapshot.cumulativeTransferVolumeReservesUSD = well.cumulativeTransferVolumeReservesUSD;
    snapshot.cumulativeTransferVolumeUSD = well.cumulativeTransferVolumeUSD;
    snapshot.deltaLpTokenSupply = ZERO_BI;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaTradeVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTradeVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaTradeVolumeUSD = ZERO_BD;
    snapshot.deltaBiTradeVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTransferVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaTransferVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaTransferVolumeUSD = ZERO_BD;
    ///
    snapshot.convertVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.convertVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.convertVolumeUSD = ZERO_BD;
    snapshot.deltaConvertVolumeReserves = emptyBigIntArray(well.tokens.length);
    snapshot.deltaConvertVolumeReservesUSD = emptyBigDecimalArray(well.tokens.length);
    snapshot.deltaConvertVolumeUSD = ZERO_BD;
    ///
    snapshot.lastUpdateTimestamp = block.timestamp;
    snapshot.lastUpdateBlockNumber = block.timestamp;
    snapshot.save();
  }
  return snapshot as WellHourlySnapshot;
}

export function takeWellDailySnapshot(wellAddress: Address, dayID: i32, block: ethereum.Block): void {
  let well = loadWell(wellAddress);

  if (well.lastSnapshotDayID == 0) {
    loadOrCreateWellDailySnapshot(wellAddress, dayID, block);
    well.lastSnapshotDayID = dayID;
    well.save();
    return;
  }

  let priorDay = well.lastSnapshotDayID;
  well.lastSnapshotDayID = dayID;
  well.save();

  let priorSnapshot = loadOrCreateWellDailySnapshot(wellAddress, priorDay, block);
  let newSnapshot = loadOrCreateWellDailySnapshot(wellAddress, well.lastSnapshotDayID, block);

  newSnapshot.deltaLpTokenSupply = newSnapshot.lpTokenSupply.minus(priorSnapshot.lpTokenSupply);
  newSnapshot.deltaLiquidityUSD = newSnapshot.totalLiquidityUSD.minus(priorSnapshot.totalLiquidityUSD).truncate(2);

  newSnapshot.deltaTradeVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeTradeVolumeReserves,
    priorSnapshot.cumulativeTradeVolumeReserves
  );
  newSnapshot.deltaTradeVolumeReservesUSD = subBigDecimalArray(
    newSnapshot.cumulativeTradeVolumeReservesUSD,
    priorSnapshot.cumulativeTradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  newSnapshot.deltaTradeVolumeUSD = newSnapshot.cumulativeTradeVolumeUSD
    .minus(priorSnapshot.cumulativeTradeVolumeUSD)
    .truncate(2);
  newSnapshot.deltaBiTradeVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeBiTradeVolumeReserves,
    priorSnapshot.cumulativeBiTradeVolumeReserves
  );
  newSnapshot.deltaTransferVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeTransferVolumeReserves,
    priorSnapshot.cumulativeTransferVolumeReserves
  );
  newSnapshot.deltaTransferVolumeReservesUSD = subBigDecimalArray(
    newSnapshot.cumulativeTransferVolumeReservesUSD,
    priorSnapshot.cumulativeTransferVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  newSnapshot.deltaTransferVolumeUSD = newSnapshot.cumulativeTransferVolumeUSD
    .minus(priorSnapshot.cumulativeTransferVolumeUSD)
    .truncate(2);

  newSnapshot.lastUpdateTimestamp = block.timestamp;
  newSnapshot.lastUpdateBlockNumber = block.number;
  newSnapshot.save();
}

export function takeWellHourlySnapshot(wellAddress: Address, hourID: i32, block: ethereum.Block): void {
  let well = loadWell(wellAddress);

  let priorHourID = well.lastSnapshotHourID;
  well.lastSnapshotHourID = hourID;

  let priorSnapshot = loadOrCreateWellHourlySnapshot(wellAddress, priorHourID, block);
  let newSnapshot = loadOrCreateWellHourlySnapshot(wellAddress, hourID, block);

  newSnapshot.deltaLpTokenSupply = newSnapshot.lpTokenSupply.minus(priorSnapshot.lpTokenSupply);
  newSnapshot.deltaLiquidityUSD = newSnapshot.totalLiquidityUSD.minus(priorSnapshot.totalLiquidityUSD).truncate(2);

  newSnapshot.deltaTradeVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeTradeVolumeReserves,
    priorSnapshot.cumulativeTradeVolumeReserves
  );
  newSnapshot.deltaTradeVolumeReservesUSD = subBigDecimalArray(
    newSnapshot.cumulativeTradeVolumeReservesUSD,
    priorSnapshot.cumulativeTradeVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  newSnapshot.deltaTradeVolumeUSD = newSnapshot.cumulativeTradeVolumeUSD
    .minus(priorSnapshot.cumulativeTradeVolumeUSD)
    .truncate(2);
  newSnapshot.deltaBiTradeVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeBiTradeVolumeReserves,
    priorSnapshot.cumulativeBiTradeVolumeReserves
  );
  newSnapshot.deltaTransferVolumeReserves = subBigIntArray(
    newSnapshot.cumulativeTransferVolumeReserves,
    priorSnapshot.cumulativeTransferVolumeReserves
  );
  newSnapshot.deltaTransferVolumeReservesUSD = subBigDecimalArray(
    newSnapshot.cumulativeTransferVolumeReservesUSD,
    priorSnapshot.cumulativeTransferVolumeReservesUSD
  ).map<BigDecimal>((bd) => bd.truncate(2));
  newSnapshot.deltaTransferVolumeUSD = newSnapshot.cumulativeTransferVolumeUSD
    .minus(priorSnapshot.cumulativeTransferVolumeUSD)
    .truncate(2);

  newSnapshot.lastUpdateTimestamp = block.timestamp;
  newSnapshot.lastUpdateBlockNumber = block.number;
  newSnapshot.save();

  // Update the rolling daily and weekly volumes by removing the oldest value.
  // Newer values for the latest hour were already added.
  let oldest24h = WellHourlySnapshot.load(wellAddress.concatI32(hourID - 24));
  let oldest7d = WellHourlySnapshot.load(wellAddress.concatI32(hourID - 168));
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
    if (oldest7d != null) {
      well.rollingWeeklyTradeVolumeReserves = subBigIntArray(
        well.rollingWeeklyTradeVolumeReserves,
        oldest7d.deltaTradeVolumeReserves
      );
      well.rollingWeeklyTradeVolumeReservesUSD = subBigDecimalArray(
        well.rollingWeeklyTradeVolumeReservesUSD,
        oldest7d.deltaTradeVolumeReservesUSD
      ).map<BigDecimal>((bd) => bd.truncate(2));
      well.rollingWeeklyTradeVolumeUSD = well.rollingWeeklyTradeVolumeUSD
        .minus(oldest7d.deltaTradeVolumeUSD)
        .truncate(2);
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
    }
  }
  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
  well.save();
}
