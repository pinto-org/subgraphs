import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  WrappedSiloERC20,
  WrappedSiloERC20DailySnapshot,
  WrappedSiloERC20HourlySnapshot
} from "../../../generated/schema";
import { getCurrentSeason } from "../Beanstalk";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";

export function takeWrappedSiloSnapshots(wrappedSilo: WrappedSiloERC20, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this season/day
  const hourlyId = wrappedSilo.id.toHexString() + "-" + currentSeason.toString();
  const dailyId = wrappedSilo.id.toHexString() + "-" + day.toString();
  let baseHourly = WrappedSiloERC20HourlySnapshot.load(hourlyId);
  let baseDaily = WrappedSiloERC20DailySnapshot.load(dailyId);
  if (baseHourly == null && wrappedSilo.lastHourlySnapshotSeason !== 0) {
    baseHourly = WrappedSiloERC20HourlySnapshot.load(
      wrappedSilo.id.toHexString() + "-" + wrappedSilo.lastHourlySnapshotSeason.toString()
    );
  }
  if (baseDaily == null && wrappedSilo.lastDailySnapshotDay !== null) {
    baseDaily = WrappedSiloERC20DailySnapshot.load(
      wrappedSilo.id.toHexString() + "-" + wrappedSilo.lastDailySnapshotDay!.toString()
    );
  }
  const hourly = new WrappedSiloERC20HourlySnapshot(hourlyId);
  const daily = new WrappedSiloERC20DailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.token = wrappedSilo.id;
  hourly.supply = wrappedSilo.supply;
  hourly.redeemRate = wrappedSilo.redeemRate;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaSupply = hourly.supply.minus(baseHourly.supply);
    hourly.deltaRedeemRate = hourly.redeemRate.minus(baseHourly.redeemRate);
    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaSupply = hourly.deltaSupply.plus(baseHourly.deltaSupply);
      hourly.deltaRedeemRate = hourly.deltaRedeemRate.plus(baseHourly.deltaRedeemRate);
    }
  } else {
    hourly.deltaSupply = hourly.supply;
    hourly.deltaRedeemRate = hourly.redeemRate;
  }
  hourly.createdAt = hour.times(BigInt.fromU32(3600));
  hourly.updatedAt = block.timestamp;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.season = currentSeason;
  daily.token = wrappedSilo.id;
  daily.supply = wrappedSilo.supply;
  daily.redeemRate = wrappedSilo.redeemRate;
  if (baseDaily !== null) {
    daily.deltaSupply = daily.supply.minus(baseDaily.supply);
    daily.deltaRedeemRate = daily.redeemRate.minus(baseDaily.redeemRate);
    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaSupply = daily.deltaSupply.plus(baseDaily.deltaSupply);
      daily.deltaRedeemRate = daily.deltaRedeemRate.plus(baseDaily.deltaRedeemRate);
    }
  } else {
    daily.deltaSupply = daily.supply;
    daily.deltaRedeemRate = daily.redeemRate;
  }
  daily.createdAt = day.times(BigInt.fromU32(86400));
  daily.updatedAt = block.timestamp;
  daily.save();

  wrappedSilo.lastHourlySnapshotSeason = currentSeason;
  wrappedSilo.lastDailySnapshotDay = day;
}
