import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  WrappedDepositERC20,
  WrappedDepositERC20DailySnapshot,
  WrappedDepositERC20HourlySnapshot
} from "../../../generated/schema";
import { getCurrentSeason } from "../Beanstalk";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";

export function takeWrappedDepositSnapshots(wrappedDeposit: WrappedDepositERC20, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this season/day
  const hourlyId = wrappedDeposit.id.toHexString() + "-" + currentSeason.toString();
  const dailyId = wrappedDeposit.id.toHexString() + "-" + day.toString();
  let baseHourly = WrappedDepositERC20HourlySnapshot.load(hourlyId);
  let baseDaily = WrappedDepositERC20DailySnapshot.load(dailyId);
  if (baseHourly == null && wrappedDeposit.lastHourlySnapshotSeason !== 0) {
    baseHourly = WrappedDepositERC20HourlySnapshot.load(
      wrappedDeposit.id.toHexString() + "-" + wrappedDeposit.lastHourlySnapshotSeason.toString()
    );
  }
  if (baseDaily == null && wrappedDeposit.lastDailySnapshotDay !== null) {
    baseDaily = WrappedDepositERC20DailySnapshot.load(
      wrappedDeposit.id.toHexString() + "-" + wrappedDeposit.lastDailySnapshotDay!.toString()
    );
  }
  const hourly = new WrappedDepositERC20HourlySnapshot(hourlyId);
  const daily = new WrappedDepositERC20DailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.token = wrappedDeposit.id;
  hourly.supply = wrappedDeposit.supply;
  hourly.redeemRate = wrappedDeposit.redeemRate;

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
  daily.token = wrappedDeposit.id;
  daily.supply = wrappedDeposit.supply;
  daily.redeemRate = wrappedDeposit.redeemRate;
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

  wrappedDeposit.lastHourlySnapshotSeason = currentSeason;
  wrappedDeposit.lastDailySnapshotDay = day;
}
