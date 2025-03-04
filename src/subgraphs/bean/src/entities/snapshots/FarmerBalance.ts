import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { getCurrentSeason } from "../Season";
import { FarmerBalance, FarmerBalanceDailySnapshot, FarmerBalanceHourlySnapshot } from "../../../generated/schema";

export function takeFarmerBalanceSnapshots(farmerBalance: FarmerBalance, block: ethereum.Block): void {
  const season = getCurrentSeason(block).season;
  const hour = hourFromTimestamp(block.timestamp);
  const day = dayFromTimestamp(block.timestamp);

  // Load the snapshot for this season/day
  const hourlyId = farmerBalance.id + "-" + season.toString();
  const dailyId = farmerBalance.id + "-" + day.toString();
  let baseHourly = FarmerBalanceHourlySnapshot.load(hourlyId);
  let baseDaily = FarmerBalanceDailySnapshot.load(dailyId);
  if (baseHourly == null && farmerBalance.lastHourlySnapshotSeason !== 0) {
    baseHourly = FarmerBalanceHourlySnapshot.load(
      farmerBalance.id + "-" + farmerBalance.lastHourlySnapshotSeason.toString()
    );
  }
  if (baseDaily == null && farmerBalance.lastDailySnapshotDay !== 0) {
    baseDaily = FarmerBalanceDailySnapshot.load(farmerBalance.id + "-" + farmerBalance.lastDailySnapshotDay.toString());
  }
  let hourly = new FarmerBalanceHourlySnapshot(hourlyId);
  let daily = new FarmerBalanceDailySnapshot(dailyId);

  // Set current values
  hourly.seasonNumber = season;
  hourly.season = season.toString();
  hourly.farmerBalance = farmerBalance.id;
  hourly.totalBalance = farmerBalance.totalBalance;
  hourly.walletBalance = farmerBalance.walletBalance;
  hourly.farmBalance = farmerBalance.farmBalance;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaTotalBalance = hourly.totalBalance.minus(baseHourly.totalBalance);
    hourly.deltaWalletBalance = hourly.walletBalance.minus(baseHourly.walletBalance);
    hourly.deltaFarmBalance = hourly.farmBalance.minus(baseHourly.farmBalance);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaTotalBalance = hourly.deltaTotalBalance.plus(baseHourly.deltaTotalBalance);
      hourly.deltaWalletBalance = hourly.deltaWalletBalance.plus(baseHourly.deltaWalletBalance);
      hourly.deltaFarmBalance = hourly.deltaFarmBalance.plus(baseHourly.deltaFarmBalance);
    }
  } else {
    hourly.deltaTotalBalance = hourly.totalBalance;
    hourly.deltaWalletBalance = hourly.walletBalance;
    hourly.deltaFarmBalance = hourly.farmBalance;
  }
  hourly.createdTimestamp = BigInt.fromI32(hour).times(BigInt.fromU32(3600));
  hourly.lastUpdateTimestamp = block.timestamp;
  hourly.lastUpdateBlockNumber = block.number;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.day = day;
  daily.season = season.toString();
  daily.farmerBalance = farmerBalance.id;
  daily.totalBalance = farmerBalance.totalBalance;
  daily.walletBalance = farmerBalance.walletBalance;
  daily.farmBalance = farmerBalance.farmBalance;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaTotalBalance = daily.totalBalance.minus(baseDaily.totalBalance);
    daily.deltaWalletBalance = daily.walletBalance.minus(baseDaily.walletBalance);
    daily.deltaFarmBalance = daily.farmBalance.minus(baseDaily.farmBalance);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaTotalBalance = daily.deltaTotalBalance.plus(baseDaily.deltaTotalBalance);
      daily.deltaWalletBalance = daily.deltaWalletBalance.plus(baseDaily.deltaWalletBalance);
      daily.deltaFarmBalance = daily.deltaFarmBalance.plus(baseDaily.deltaFarmBalance);
    }
  } else {
    daily.deltaTotalBalance = daily.totalBalance;
    daily.deltaWalletBalance = daily.walletBalance;
    daily.deltaFarmBalance = daily.farmBalance;
  }
  daily.createdTimestamp = BigInt.fromI32(daily.day).times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  farmerBalance.lastHourlySnapshotSeason = hourly.seasonNumber;
  farmerBalance.lastDailySnapshotDay = daily.day;
}
