import { Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { WellDailySnapshot, WellHourlySnapshot } from "../../../generated/schema";
import { loadWell } from "../Well";
import {
  emptyBigDecimalArray,
  emptyBigIntArray,
  subBigDecimalArray,
  subBigIntArray,
  ZERO_BD,
  ZERO_BI
} from "../../../../../core/utils/Decimals";

// TODO: takeWellSnapshots(well, block)

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
    snapshot.lpTokenSupply = well.lpTokenSupply;
    snapshot.totalLiquidityUSD = well.totalLiquidityUSD;
    snapshot.tokenPrice = well.tokenPrice;
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
    snapshot.lpTokenSupply = well.lpTokenSupply;
    snapshot.totalLiquidityUSD = well.totalLiquidityUSD;
    snapshot.tokenPrice = well.tokenPrice;
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
