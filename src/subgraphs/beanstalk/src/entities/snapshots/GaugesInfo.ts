import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { GaugesInfo, GaugesInfoDailySnapshot, GaugesInfoHourlySnapshot } from "../../../generated/schema";
import { getCurrentSeason } from "../Beanstalk";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";

export function takeGaugesInfoSnapshots(gaugesInfo: GaugesInfo, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this season/day
  const hourlyId = gaugesInfo.id + "-" + currentSeason.toString();
  const dailyId = gaugesInfo.id + "-" + day.toString();
  let baseHourly = GaugesInfoHourlySnapshot.load(hourlyId);
  let baseDaily = GaugesInfoDailySnapshot.load(dailyId);
  if (baseHourly == null && gaugesInfo.lastHourlySnapshotSeason !== 0) {
    baseHourly = GaugesInfoHourlySnapshot.load(gaugesInfo.id + "-" + gaugesInfo.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && gaugesInfo.lastDailySnapshotDay !== null) {
    baseDaily = GaugesInfoDailySnapshot.load(gaugesInfo.id + "-" + gaugesInfo.lastDailySnapshotDay!.toString());
  }
  const hourly = new GaugesInfoHourlySnapshot(hourlyId);
  const daily = new GaugesInfoDailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.gaugesInfo = gaugesInfo.id;
  hourly.g0IsActive = gaugesInfo.g0IsActive;
  hourly.g1IsActive = gaugesInfo.g1IsActive;
  hourly.g2IsActive = gaugesInfo.g2IsActive;
  hourly.g0CultivationFactor = gaugesInfo.g0CultivationFactor;
  hourly.g1ConvertDownPenalty = gaugesInfo.g1ConvertDownPenalty;
  hourly.g2BonusStalkPerBdv = gaugesInfo.g2BonusStalkPerBdv;
  hourly.g2MaxConvertCapacity = gaugesInfo.g2MaxConvertCapacity;
  hourly.g2BdvConvertedThisSeason = gaugesInfo.g2BdvConvertedThisSeason;
  hourly.g2MaxTwaDeltaB = gaugesInfo.g2MaxTwaDeltaB;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaG0IsActive = hourly.g0IsActive != baseHourly.g0IsActive;
    hourly.deltaG1IsActive = hourly.g1IsActive != baseHourly.g1IsActive;
    hourly.deltaG2IsActive = hourly.g2IsActive != baseHourly.g2IsActive;
    if (hourly.g0CultivationFactor !== null) {
      if (baseHourly.g0CultivationFactor !== null) {
        hourly.deltaG0CultivationFactor = hourly.g0CultivationFactor!.minus(baseHourly.g0CultivationFactor!);
      } else {
        hourly.deltaG0CultivationFactor = hourly.g0CultivationFactor;
      }
    }
    if (hourly.g1ConvertDownPenalty !== null) {
      if (baseHourly.g1ConvertDownPenalty !== null) {
        hourly.deltaG1ConvertDownPenalty = hourly.g1ConvertDownPenalty!.minus(baseHourly.g1ConvertDownPenalty!);
      } else {
        hourly.deltaG1ConvertDownPenalty = hourly.g1ConvertDownPenalty;
      }
    }
    if (hourly.g2BonusStalkPerBdv !== null) {
      if (baseHourly.g2BonusStalkPerBdv !== null) {
        hourly.deltaG2BonusStalkPerBdv = hourly.g2BonusStalkPerBdv!.minus(baseHourly.g2BonusStalkPerBdv!);
      } else {
        hourly.deltaG2BonusStalkPerBdv = hourly.g2BonusStalkPerBdv;
      }
    }
    if (hourly.g2MaxConvertCapacity !== null) {
      if (baseHourly.g2MaxConvertCapacity !== null) {
        hourly.deltaG2MaxConvertCapacity = hourly.g2MaxConvertCapacity!.minus(baseHourly.g2MaxConvertCapacity!);
      } else {
        hourly.deltaG2MaxConvertCapacity = hourly.g2MaxConvertCapacity;
      }
    }
    if (hourly.g2BdvConvertedThisSeason !== null) {
      if (baseHourly.g2BdvConvertedThisSeason !== null) {
        hourly.deltaG2BdvConvertedThisSeason = hourly.g2BdvConvertedThisSeason!.minus(
          baseHourly.g2BdvConvertedThisSeason!
        );
      } else {
        hourly.deltaG2BdvConvertedThisSeason = hourly.g2BdvConvertedThisSeason;
      }
    }
    if (hourly.g2MaxTwaDeltaB !== null) {
      if (baseHourly.g2MaxTwaDeltaB !== null) {
        hourly.deltaG2MaxTwaDeltaB = hourly.g2MaxTwaDeltaB!.minus(baseHourly.g2MaxTwaDeltaB!);
      } else {
        hourly.deltaG2MaxTwaDeltaB = hourly.g2MaxTwaDeltaB;
      }
    }

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaG0IsActive = hourly.deltaG0IsActive != baseHourly.deltaG0IsActive;
      hourly.deltaG1IsActive = hourly.deltaG1IsActive != baseHourly.deltaG1IsActive;
      hourly.deltaG2IsActive = hourly.deltaG2IsActive != baseHourly.deltaG2IsActive;
      if (hourly.deltaG0CultivationFactor !== null && baseHourly.deltaG0CultivationFactor !== null) {
        hourly.deltaG0CultivationFactor = hourly.deltaG0CultivationFactor!.plus(baseHourly.deltaG0CultivationFactor!);
      }
      if (hourly.deltaG1ConvertDownPenalty !== null && baseHourly.deltaG1ConvertDownPenalty !== null) {
        hourly.deltaG1ConvertDownPenalty = hourly.deltaG1ConvertDownPenalty!.plus(
          baseHourly.deltaG1ConvertDownPenalty!
        );
      }
      if (hourly.deltaG2BonusStalkPerBdv !== null && baseHourly.deltaG2BonusStalkPerBdv !== null) {
        hourly.deltaG2BonusStalkPerBdv = hourly.deltaG2BonusStalkPerBdv!.plus(baseHourly.deltaG2BonusStalkPerBdv!);
      }
      if (hourly.deltaG2MaxConvertCapacity !== null && baseHourly.deltaG2MaxConvertCapacity !== null) {
        hourly.deltaG2MaxConvertCapacity = hourly.deltaG2MaxConvertCapacity!.plus(
          baseHourly.deltaG2MaxConvertCapacity!
        );
      }
      if (hourly.deltaG2BdvConvertedThisSeason !== null && baseHourly.deltaG2BdvConvertedThisSeason !== null) {
        hourly.deltaG2BdvConvertedThisSeason = hourly.deltaG2BdvConvertedThisSeason!.plus(
          baseHourly.deltaG2BdvConvertedThisSeason!
        );
      }
      if (hourly.deltaG2MaxTwaDeltaB !== null && baseHourly.deltaG2MaxTwaDeltaB !== null) {
        hourly.deltaG2MaxTwaDeltaB = hourly.deltaG2MaxTwaDeltaB!.plus(baseHourly.deltaG2MaxTwaDeltaB!);
      }
    }
  } else {
    hourly.deltaG0IsActive = hourly.g0IsActive;
    hourly.deltaG1IsActive = hourly.g1IsActive;
    hourly.deltaG2IsActive = hourly.g2IsActive;
    hourly.deltaG0CultivationFactor = hourly.g0CultivationFactor;
    hourly.deltaG1ConvertDownPenalty = hourly.g1ConvertDownPenalty;
    hourly.deltaG2BonusStalkPerBdv = hourly.g2BonusStalkPerBdv;
    hourly.deltaG2MaxConvertCapacity = hourly.g2MaxConvertCapacity;
    hourly.deltaG2BdvConvertedThisSeason = hourly.g2BdvConvertedThisSeason;
    hourly.deltaG2MaxTwaDeltaB = hourly.g2MaxTwaDeltaB;
  }
  hourly.createdAt = hour.times(BigInt.fromU32(3600));
  hourly.updatedAt = block.timestamp;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.season = currentSeason;
  daily.gaugesInfo = gaugesInfo.id;
  daily.g0IsActive = gaugesInfo.g0IsActive;
  daily.g1IsActive = gaugesInfo.g1IsActive;
  daily.g2IsActive = gaugesInfo.g2IsActive;
  daily.g0CultivationFactor = gaugesInfo.g0CultivationFactor;
  daily.g1ConvertDownPenalty = gaugesInfo.g1ConvertDownPenalty;
  daily.g2BonusStalkPerBdv = gaugesInfo.g2BonusStalkPerBdv;
  daily.g2MaxConvertCapacity = gaugesInfo.g2MaxConvertCapacity;
  daily.g2BdvConvertedThisSeason = gaugesInfo.g2BdvConvertedThisSeason;
  daily.g2MaxTwaDeltaB = gaugesInfo.g2MaxTwaDeltaB;

  // Set deltas
  if (baseDaily !== null) {
    daily.deltaG0IsActive = daily.g0IsActive != baseDaily.g0IsActive;
    daily.deltaG1IsActive = daily.g1IsActive != baseDaily.g1IsActive;
    daily.deltaG2IsActive = daily.g2IsActive != baseDaily.g2IsActive;
    if (daily.g0CultivationFactor !== null) {
      if (baseDaily.g0CultivationFactor !== null) {
        daily.deltaG0CultivationFactor = daily.g0CultivationFactor!.minus(baseDaily.g0CultivationFactor!);
      } else {
        daily.deltaG0CultivationFactor = daily.g0CultivationFactor;
      }
    }
    if (daily.g1ConvertDownPenalty !== null) {
      if (baseDaily.g1ConvertDownPenalty !== null) {
        daily.deltaG1ConvertDownPenalty = daily.g1ConvertDownPenalty!.minus(baseDaily.g1ConvertDownPenalty!);
      } else {
        daily.deltaG1ConvertDownPenalty = daily.g1ConvertDownPenalty;
      }
    }
    if (daily.g2BonusStalkPerBdv !== null) {
      if (baseDaily.g2BonusStalkPerBdv !== null) {
        daily.deltaG2BonusStalkPerBdv = daily.g2BonusStalkPerBdv!.minus(baseDaily.g2BonusStalkPerBdv!);
      } else {
        daily.deltaG2BonusStalkPerBdv = daily.g2BonusStalkPerBdv;
      }
    }
    if (daily.g2MaxConvertCapacity !== null) {
      if (baseDaily.g2MaxConvertCapacity !== null) {
        daily.deltaG2MaxConvertCapacity = daily.g2MaxConvertCapacity!.minus(baseDaily.g2MaxConvertCapacity!);
      } else {
        daily.deltaG2MaxConvertCapacity = daily.g2MaxConvertCapacity;
      }
    }
    if (daily.g2BdvConvertedThisSeason !== null) {
      if (baseDaily.g2BdvConvertedThisSeason !== null) {
        daily.deltaG2BdvConvertedThisSeason = daily.g2BdvConvertedThisSeason!.minus(
          baseDaily.g2BdvConvertedThisSeason!
        );
      } else {
        daily.deltaG2BdvConvertedThisSeason = daily.g2BdvConvertedThisSeason;
      }
    }
    if (daily.g2MaxTwaDeltaB !== null) {
      if (baseDaily.g2MaxTwaDeltaB !== null) {
        daily.deltaG2MaxTwaDeltaB = daily.g2MaxTwaDeltaB!.minus(baseDaily.g2MaxTwaDeltaB!);
      } else {
        daily.deltaG2MaxTwaDeltaB = daily.g2MaxTwaDeltaB;
      }
    }

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaG0IsActive = daily.deltaG0IsActive != baseDaily.deltaG0IsActive;
      daily.deltaG1IsActive = daily.deltaG1IsActive != baseDaily.deltaG1IsActive;
      daily.deltaG2IsActive = daily.deltaG2IsActive != baseDaily.deltaG2IsActive;
      if (daily.deltaG0CultivationFactor !== null && baseDaily.deltaG0CultivationFactor !== null) {
        daily.deltaG0CultivationFactor = daily.deltaG0CultivationFactor!.plus(baseDaily.deltaG0CultivationFactor!);
      }
      if (daily.deltaG1ConvertDownPenalty !== null && baseDaily.deltaG1ConvertDownPenalty !== null) {
        daily.deltaG1ConvertDownPenalty = daily.deltaG1ConvertDownPenalty!.plus(baseDaily.deltaG1ConvertDownPenalty!);
      }
      if (daily.deltaG2BonusStalkPerBdv !== null && baseDaily.deltaG2BonusStalkPerBdv !== null) {
        daily.deltaG2BonusStalkPerBdv = daily.deltaG2BonusStalkPerBdv!.plus(baseDaily.deltaG2BonusStalkPerBdv!);
      }
      if (daily.deltaG2MaxConvertCapacity !== null && baseDaily.deltaG2MaxConvertCapacity !== null) {
        daily.deltaG2MaxConvertCapacity = daily.deltaG2MaxConvertCapacity!.plus(baseDaily.deltaG2MaxConvertCapacity!);
      }
      if (daily.deltaG2BdvConvertedThisSeason !== null && baseDaily.deltaG2BdvConvertedThisSeason !== null) {
        daily.deltaG2BdvConvertedThisSeason = daily.deltaG2BdvConvertedThisSeason!.plus(
          baseDaily.deltaG2BdvConvertedThisSeason!
        );
      }
      if (daily.deltaG2MaxTwaDeltaB !== null && baseDaily.deltaG2MaxTwaDeltaB !== null) {
        daily.deltaG2MaxTwaDeltaB = daily.deltaG2MaxTwaDeltaB!.plus(baseDaily.deltaG2MaxTwaDeltaB!);
      }
    }
  } else {
    daily.deltaG0IsActive = daily.g0IsActive;
    daily.deltaG1IsActive = daily.g1IsActive;
    daily.deltaG2IsActive = daily.g2IsActive;
    daily.deltaG0CultivationFactor = daily.g0CultivationFactor;
    daily.deltaG1ConvertDownPenalty = daily.g1ConvertDownPenalty;
    daily.deltaG2BonusStalkPerBdv = daily.g2BonusStalkPerBdv;
    daily.deltaG2MaxConvertCapacity = daily.g2MaxConvertCapacity;
    daily.deltaG2BdvConvertedThisSeason = daily.g2BdvConvertedThisSeason;
    daily.deltaG2MaxTwaDeltaB = daily.g2MaxTwaDeltaB;
  }
  daily.createdAt = day.times(BigInt.fromU32(86400));
  daily.updatedAt = block.timestamp;
  daily.save();

  gaugesInfo.lastHourlySnapshotSeason = currentSeason;
  gaugesInfo.lastDailySnapshotDay = day;
}
