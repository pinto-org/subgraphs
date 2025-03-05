import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { Token, TokenDailySnapshot, TokenHourlySnapshot } from "../../../generated/schema";
import { getCurrentSeason } from "../Season";

export function takeTokenSnapshots(token: Token, block: ethereum.Block): void {
  const season = getCurrentSeason(block).season;
  const hour = hourFromTimestamp(block.timestamp);
  const day = dayFromTimestamp(block.timestamp);

  // Load the snapshot for this season/day
  const hourlyId = token.id.toHexString() + "-" + season.toString();
  const dailyId = token.id.toHexString() + "-" + day.toString();
  let baseHourly = TokenHourlySnapshot.load(hourlyId);
  let baseDaily = TokenDailySnapshot.load(dailyId);
  if (baseHourly == null && token.lastHourlySnapshotSeason !== 0) {
    baseHourly = TokenHourlySnapshot.load(token.id.toHexString() + "-" + token.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && token.lastDailySnapshotDay !== 0) {
    baseDaily = TokenDailySnapshot.load(token.id.toHexString() + "-" + token.lastDailySnapshotDay.toString());
  }
  let hourly = new TokenHourlySnapshot(hourlyId);
  let daily = new TokenDailySnapshot(dailyId);

  // Set current values
  hourly.seasonNumber = season;
  hourly.season = season.toString();
  hourly.token = token.id;
  hourly.name = token.name;
  hourly.decimals = token.decimals;
  hourly.supply = token.supply;
  hourly.walletBalance = token.walletBalance;
  hourly.farmBalance = token.farmBalance;
  hourly.pooledBalance = token.pooledBalance;
  hourly.lastPriceUSD = token.lastPriceUSD;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaSupply = hourly.supply.minus(baseHourly.supply);
    hourly.deltaWalletBalance = hourly.walletBalance.minus(baseHourly.walletBalance);
    hourly.deltaFarmBalance = hourly.farmBalance.minus(baseHourly.farmBalance);
    hourly.deltaPooledBalance = hourly.pooledBalance.minus(baseHourly.pooledBalance);
    hourly.deltaLastPriceUSD = hourly.lastPriceUSD.minus(baseHourly.lastPriceUSD);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaSupply = hourly.deltaSupply.plus(baseHourly.deltaSupply);
      hourly.deltaWalletBalance = hourly.deltaWalletBalance.plus(baseHourly.deltaWalletBalance);
      hourly.deltaFarmBalance = hourly.deltaFarmBalance.plus(baseHourly.deltaFarmBalance);
      hourly.deltaPooledBalance = hourly.deltaPooledBalance.plus(baseHourly.deltaPooledBalance);
      hourly.deltaLastPriceUSD = hourly.deltaLastPriceUSD.plus(baseHourly.deltaLastPriceUSD);
    }
  } else {
    hourly.deltaSupply = hourly.supply;
    hourly.deltaWalletBalance = hourly.walletBalance;
    hourly.deltaFarmBalance = hourly.farmBalance;
    hourly.deltaPooledBalance = hourly.pooledBalance;
    hourly.deltaLastPriceUSD = hourly.lastPriceUSD;
  }
  // Set precision on BigDecimal deltas
  hourly.deltaLastPriceUSD = hourly.deltaLastPriceUSD.truncate(2);

  hourly.createdTimestamp = BigInt.fromI32(hour).times(BigInt.fromU32(3600));
  hourly.lastUpdateTimestamp = block.timestamp;
  hourly.lastUpdateBlockNumber = block.number;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.day = day;
  daily.season = season.toString();
  daily.token = token.id;
  daily.name = token.name;
  daily.decimals = token.decimals;
  daily.supply = token.supply;
  daily.walletBalance = token.walletBalance;
  daily.farmBalance = token.farmBalance;
  daily.pooledBalance = token.pooledBalance;
  daily.lastPriceUSD = token.lastPriceUSD;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaSupply = daily.supply.minus(baseDaily.supply);
    daily.deltaWalletBalance = daily.walletBalance.minus(baseDaily.walletBalance);
    daily.deltaFarmBalance = daily.farmBalance.minus(baseDaily.farmBalance);
    daily.deltaPooledBalance = daily.pooledBalance.minus(baseDaily.pooledBalance);
    daily.deltaLastPriceUSD = daily.lastPriceUSD.minus(baseDaily.lastPriceUSD);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaSupply = daily.deltaSupply.plus(baseDaily.deltaSupply);
      daily.deltaWalletBalance = daily.deltaWalletBalance.plus(baseDaily.deltaWalletBalance);
      daily.deltaFarmBalance = daily.deltaFarmBalance.plus(baseDaily.deltaFarmBalance);
      daily.deltaPooledBalance = daily.deltaPooledBalance.plus(baseDaily.deltaPooledBalance);
      daily.deltaLastPriceUSD = daily.deltaLastPriceUSD.plus(baseDaily.deltaLastPriceUSD);
    }
  } else {
    daily.deltaSupply = daily.supply;
    daily.deltaWalletBalance = daily.walletBalance;
    daily.deltaFarmBalance = daily.farmBalance;
    daily.deltaPooledBalance = daily.pooledBalance;
    daily.deltaLastPriceUSD = daily.lastPriceUSD;
  }
  // Set precision on BigDecimal deltas
  daily.deltaLastPriceUSD = daily.deltaLastPriceUSD.truncate(2);

  daily.createdTimestamp = BigInt.fromI32(daily.day).times(BigInt.fromU32(86400));
  daily.lastUpdateTimestamp = block.timestamp;
  daily.lastUpdateBlockNumber = block.number;
  daily.save();

  token.lastHourlySnapshotSeason = hourly.seasonNumber;
  token.lastDailySnapshotDay = daily.day;
}
