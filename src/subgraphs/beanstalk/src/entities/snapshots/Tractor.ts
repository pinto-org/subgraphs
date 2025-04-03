import { BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { Tractor, TractorDailySnapshot, TractorHourlySnapshot } from "../../../generated/schema";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { getCurrentSeason } from "../Beanstalk";

export function takeTractorSnapshots(tractor: Tractor, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this season/day
  const hourlyId = tractor.id + "-" + currentSeason.toString();
  const dailyId = tractor.id + "-" + day.toString();
  let baseHourly = TractorHourlySnapshot.load(hourlyId);
  let baseDaily = TractorDailySnapshot.load(dailyId);
  if (baseHourly == null && tractor.lastHourlySnapshotSeason !== 0) {
    baseHourly = TractorHourlySnapshot.load(tractor.id + "-" + tractor.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && tractor.lastDailySnapshotDay !== null) {
    baseDaily = TractorDailySnapshot.load(tractor.id + "-" + tractor.lastDailySnapshotDay!.toString());
  }
  const hourly = new TractorHourlySnapshot(hourlyId);
  const daily = new TractorDailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.tractor = tractor.id;
  hourly.totalExecutions = tractor.totalExecutions;
  hourly.totalPosBeanTips = tractor.totalPosBeanTips;
  hourly.totalNegBeanTips = tractor.totalNegBeanTips;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaTotalExecutions = hourly.totalExecutions - baseHourly.totalExecutions;
    hourly.deltaTotalPosBeanTips = hourly.totalPosBeanTips.minus(baseHourly.totalPosBeanTips);
    hourly.deltaTotalNegBeanTips = hourly.totalNegBeanTips.minus(baseHourly.totalNegBeanTips);

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaTotalExecutions = hourly.deltaTotalExecutions + baseHourly.deltaTotalExecutions;
      hourly.deltaTotalPosBeanTips = hourly.deltaTotalPosBeanTips.plus(baseHourly.deltaTotalPosBeanTips);
      hourly.deltaTotalNegBeanTips = hourly.deltaTotalNegBeanTips.plus(baseHourly.deltaTotalNegBeanTips);
    }
  } else {
    hourly.deltaTotalExecutions = hourly.totalExecutions;
    hourly.deltaTotalPosBeanTips = hourly.totalPosBeanTips;
    hourly.deltaTotalNegBeanTips = hourly.totalNegBeanTips;
  }
  hourly.createdAt = hour.times(BigInt.fromU32(3600));
  hourly.updatedAt = block.timestamp;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.season = currentSeason;
  daily.tractor = tractor.id;
  daily.totalExecutions = tractor.totalExecutions;
  daily.totalPosBeanTips = tractor.totalPosBeanTips;
  daily.totalNegBeanTips = tractor.totalNegBeanTips;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaTotalExecutions = daily.totalExecutions - baseDaily.totalExecutions;
    daily.deltaTotalPosBeanTips = daily.totalPosBeanTips.minus(baseDaily.totalPosBeanTips);
    daily.deltaTotalNegBeanTips = daily.totalNegBeanTips.minus(baseDaily.totalNegBeanTips);

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaTotalExecutions = daily.deltaTotalExecutions + baseDaily.deltaTotalExecutions;
      daily.deltaTotalPosBeanTips = daily.deltaTotalPosBeanTips.plus(baseDaily.deltaTotalPosBeanTips);
      daily.deltaTotalNegBeanTips = daily.deltaTotalNegBeanTips.plus(baseDaily.deltaTotalNegBeanTips);
    }
  } else {
    daily.deltaTotalExecutions = daily.totalExecutions;
    daily.deltaTotalPosBeanTips = daily.totalPosBeanTips;
    daily.deltaTotalNegBeanTips = daily.totalNegBeanTips;
  }
  daily.createdAt = day.times(BigInt.fromU32(86400));
  daily.updatedAt = block.timestamp;
  daily.save();

  tractor.lastHourlySnapshotSeason = currentSeason;
  tractor.lastDailySnapshotDay = day;
}
