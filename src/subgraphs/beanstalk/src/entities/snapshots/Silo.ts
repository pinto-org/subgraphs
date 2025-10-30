import { BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { Silo, SiloDailySnapshot, SiloHourlySnapshot } from "../../../generated/schema";
import { getCurrentSeason } from "../Beanstalk";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../../core/utils/Dates";
import { ZERO_BI } from "../../../../../core/utils/Decimals";

export function takeSiloSnapshots(silo: Silo, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();

  const hour = BigInt.fromI32(hourFromTimestamp(block.timestamp));
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));

  // Load the snapshot for this season/day
  const hourlyId = silo.id.toHexString() + "-" + currentSeason.toString();
  const dailyId = silo.id.toHexString() + "-" + day.toString();
  let baseHourly = SiloHourlySnapshot.load(hourlyId);
  let baseDaily = SiloDailySnapshot.load(dailyId);
  if (baseHourly == null && silo.lastHourlySnapshotSeason !== 0) {
    baseHourly = SiloHourlySnapshot.load(silo.id.toHexString() + "-" + silo.lastHourlySnapshotSeason.toString());
  }
  if (baseDaily == null && silo.lastDailySnapshotDay !== null) {
    baseDaily = SiloDailySnapshot.load(silo.id.toHexString() + "-" + silo.lastDailySnapshotDay!.toString());
  }
  const hourly = new SiloHourlySnapshot(hourlyId);
  const daily = new SiloDailySnapshot(dailyId);

  // Set current values
  hourly.season = currentSeason;
  hourly.silo = silo.id;
  hourly.stalk = silo.stalk;
  hourly.depositedBDV = silo.depositedBDV;
  hourly.plantedBeans = silo.plantedBeans;
  hourly.roots = silo.roots;
  hourly.germinatingStalk = silo.germinatingStalk;
  hourly.penalizedStalkConvertDown = silo.penalizedStalkConvertDown;
  hourly.unpenalizedStalkConvertDown = silo.unpenalizedStalkConvertDown;
  hourly.avgConvertDownPenalty = silo.avgConvertDownPenalty;
  hourly.bonusStalkConvertUp = silo.bonusStalkConvertUp;
  hourly.totalBdvConvertUpBonus = silo.totalBdvConvertUpBonus;
  hourly.totalBdvConvertUp = silo.totalBdvConvertUp;
  hourly.beanMints = silo.beanMints;
  hourly.plantableStalk = silo.plantableStalk;
  hourly.beanToMaxLpGpPerBdvRatio = silo.beanToMaxLpGpPerBdvRatio;
  hourly.cropRatio = silo.cropRatio;
  hourly.avgGrownStalkPerBdvPerSeason = silo.avgGrownStalkPerBdvPerSeason;
  hourly.grownStalkPerSeason = silo.grownStalkPerSeason;
  hourly.activeFarmers = silo.activeFarmers;

  hourly.convertDownPenalty = silo.convertDownPenalty;

  // Set deltas
  if (baseHourly !== null) {
    hourly.deltaStalk = hourly.stalk.minus(baseHourly.stalk);
    hourly.deltaDepositedBDV = hourly.depositedBDV.minus(baseHourly.depositedBDV);
    hourly.deltaPlantedBeans = hourly.plantedBeans.minus(baseHourly.plantedBeans);
    hourly.deltaRoots = hourly.roots.minus(baseHourly.roots);
    hourly.deltaGerminatingStalk = hourly.germinatingStalk.minus(baseHourly.germinatingStalk);
    hourly.deltaPenalizedStalkConvertDown = hourly.penalizedStalkConvertDown.minus(
      baseHourly.penalizedStalkConvertDown
    );
    hourly.deltaUnpenalizedStalkConvertDown = hourly.unpenalizedStalkConvertDown.minus(
      baseHourly.unpenalizedStalkConvertDown
    );
    hourly.deltaAvgConvertDownPenalty = hourly.avgConvertDownPenalty.minus(baseHourly.avgConvertDownPenalty);
    hourly.deltaBonusStalkConvertUp = hourly.bonusStalkConvertUp.minus(baseHourly.bonusStalkConvertUp);
    hourly.deltaTotalBdvConvertUpBonus = hourly.totalBdvConvertUpBonus.minus(baseHourly.totalBdvConvertUpBonus);
    hourly.deltaTotalBdvConvertUp = hourly.totalBdvConvertUp.minus(baseHourly.totalBdvConvertUp);
    hourly.deltaBeanMints = hourly.beanMints.minus(baseHourly.beanMints);
    hourly.deltaPlantableStalk = hourly.plantableStalk.minus(baseHourly.plantableStalk);
    hourly.deltaBeanToMaxLpGpPerBdvRatio = hourly.beanToMaxLpGpPerBdvRatio.minus(baseHourly.beanToMaxLpGpPerBdvRatio);
    hourly.deltaCropRatio = hourly.cropRatio.minus(baseHourly.cropRatio);
    hourly.deltaAvgGrownStalkPerBdvPerSeason = hourly.avgGrownStalkPerBdvPerSeason.minus(
      baseHourly.avgGrownStalkPerBdvPerSeason
    );
    hourly.deltaGrownStalkPerSeason = hourly.grownStalkPerSeason.minus(baseHourly.grownStalkPerSeason);
    hourly.deltaActiveFarmers = hourly.activeFarmers - baseHourly.activeFarmers;

    if (baseHourly.convertDownPenalty !== null) {
      // Implies current is also not null
      hourly.deltaConvertDownPenalty = hourly.convertDownPenalty!.minus(baseHourly.deltaConvertDownPenalty!);
    } else {
      hourly.deltaConvertDownPenalty = hourly.convertDownPenalty;
    }

    if (hourly.id == baseHourly.id) {
      // Add existing deltas
      hourly.deltaStalk = hourly.deltaStalk.plus(baseHourly.deltaStalk);
      hourly.deltaDepositedBDV = hourly.deltaDepositedBDV.plus(baseHourly.deltaDepositedBDV);
      hourly.deltaPlantedBeans = hourly.deltaPlantedBeans.plus(baseHourly.deltaPlantedBeans);
      hourly.deltaRoots = hourly.deltaRoots.plus(baseHourly.deltaRoots);
      hourly.deltaGerminatingStalk = hourly.deltaGerminatingStalk.plus(baseHourly.deltaGerminatingStalk);
      hourly.deltaPenalizedStalkConvertDown = hourly.deltaPenalizedStalkConvertDown.plus(
        baseHourly.deltaPenalizedStalkConvertDown
      );
      hourly.deltaUnpenalizedStalkConvertDown = hourly.deltaUnpenalizedStalkConvertDown.plus(
        baseHourly.deltaUnpenalizedStalkConvertDown
      );
      hourly.deltaAvgConvertDownPenalty = hourly.deltaAvgConvertDownPenalty.plus(baseHourly.deltaAvgConvertDownPenalty);
      hourly.deltaBonusStalkConvertUp = hourly.deltaBonusStalkConvertUp.plus(baseHourly.deltaBonusStalkConvertUp);
      hourly.deltaTotalBdvConvertUpBonus = hourly.deltaTotalBdvConvertUpBonus.plus(
        baseHourly.deltaTotalBdvConvertUpBonus
      );
      hourly.deltaTotalBdvConvertUp = hourly.deltaTotalBdvConvertUp.plus(baseHourly.deltaTotalBdvConvertUp);
      hourly.deltaBeanMints = hourly.deltaBeanMints.plus(baseHourly.deltaBeanMints);
      hourly.deltaPlantableStalk = hourly.deltaPlantableStalk.plus(baseHourly.deltaPlantableStalk);
      hourly.deltaBeanToMaxLpGpPerBdvRatio = hourly.deltaBeanToMaxLpGpPerBdvRatio.plus(
        baseHourly.deltaBeanToMaxLpGpPerBdvRatio
      );
      hourly.deltaCropRatio = hourly.deltaCropRatio.plus(baseHourly.deltaCropRatio);
      hourly.deltaAvgGrownStalkPerBdvPerSeason = hourly.deltaAvgGrownStalkPerBdvPerSeason.plus(
        baseHourly.deltaAvgGrownStalkPerBdvPerSeason
      );
      hourly.deltaGrownStalkPerSeason = hourly.deltaGrownStalkPerSeason.plus(baseHourly.deltaGrownStalkPerSeason);
      hourly.deltaActiveFarmers = hourly.deltaActiveFarmers + baseHourly.deltaActiveFarmers;

      if (baseHourly.deltaConvertDownPenalty !== null) {
        // Implies current is also not null
        hourly.deltaConvertDownPenalty = hourly.deltaConvertDownPenalty!.plus(baseHourly.deltaConvertDownPenalty!);
      }

      // Carry over unset values that would otherwise get erased
      hourly.caseId = baseHourly.caseId;
    }
  } else {
    hourly.deltaStalk = hourly.stalk;
    hourly.deltaDepositedBDV = hourly.depositedBDV;
    hourly.deltaPlantedBeans = hourly.plantedBeans;
    hourly.deltaRoots = hourly.roots;
    hourly.deltaGerminatingStalk = hourly.germinatingStalk;
    hourly.deltaPenalizedStalkConvertDown = hourly.penalizedStalkConvertDown;
    hourly.deltaUnpenalizedStalkConvertDown = hourly.unpenalizedStalkConvertDown;
    hourly.deltaAvgConvertDownPenalty = hourly.avgConvertDownPenalty;
    hourly.deltaBonusStalkConvertUp = hourly.bonusStalkConvertUp;
    hourly.deltaTotalBdvConvertUpBonus = hourly.totalBdvConvertUpBonus;
    hourly.deltaTotalBdvConvertUp = hourly.totalBdvConvertUp;
    hourly.deltaBeanMints = hourly.beanMints;
    hourly.deltaPlantableStalk = hourly.plantableStalk;
    hourly.deltaBeanToMaxLpGpPerBdvRatio = hourly.beanToMaxLpGpPerBdvRatio;
    hourly.deltaCropRatio = hourly.cropRatio;
    hourly.deltaAvgGrownStalkPerBdvPerSeason = hourly.avgGrownStalkPerBdvPerSeason;
    hourly.deltaGrownStalkPerSeason = hourly.grownStalkPerSeason;
    hourly.deltaActiveFarmers = hourly.activeFarmers;

    hourly.deltaConvertDownPenalty = hourly.convertDownPenalty;
  }
  hourly.createdAt = hour.times(BigInt.fromU32(3600));
  hourly.updatedAt = block.timestamp;
  hourly.save();

  // Repeat for daily snapshot.
  // Duplicate code is preferred to type coercion, the codegen doesnt provide a common interface.

  daily.season = currentSeason;
  daily.silo = silo.id;
  daily.stalk = silo.stalk;
  daily.depositedBDV = silo.depositedBDV;
  daily.plantedBeans = silo.plantedBeans;
  daily.roots = silo.roots;
  daily.germinatingStalk = silo.germinatingStalk;
  daily.penalizedStalkConvertDown = silo.penalizedStalkConvertDown;
  daily.unpenalizedStalkConvertDown = silo.unpenalizedStalkConvertDown;
  daily.avgConvertDownPenalty = silo.avgConvertDownPenalty;
  daily.bonusStalkConvertUp = silo.bonusStalkConvertUp;
  daily.totalBdvConvertUpBonus = silo.totalBdvConvertUpBonus;
  daily.totalBdvConvertUp = silo.totalBdvConvertUp;
  daily.beanMints = silo.beanMints;
  daily.plantableStalk = silo.plantableStalk;
  daily.beanToMaxLpGpPerBdvRatio = silo.beanToMaxLpGpPerBdvRatio;
  daily.cropRatio = silo.cropRatio;
  daily.avgGrownStalkPerBdvPerSeason = silo.avgGrownStalkPerBdvPerSeason;
  daily.grownStalkPerSeason = silo.grownStalkPerSeason;
  daily.activeFarmers = silo.activeFarmers;

  daily.convertDownPenalty = silo.convertDownPenalty;

  if (baseDaily !== null) {
    daily.deltaStalk = daily.stalk.minus(baseDaily.stalk);
    daily.deltaDepositedBDV = daily.depositedBDV.minus(baseDaily.depositedBDV);
    daily.deltaPlantedBeans = daily.plantedBeans.minus(baseDaily.plantedBeans);
    daily.deltaRoots = daily.roots.minus(baseDaily.roots);
    daily.deltaGerminatingStalk = daily.germinatingStalk.minus(baseDaily.germinatingStalk);
    daily.deltaPenalizedStalkConvertDown = daily.penalizedStalkConvertDown.minus(baseDaily.penalizedStalkConvertDown);
    daily.deltaUnpenalizedStalkConvertDown = daily.unpenalizedStalkConvertDown.minus(
      baseDaily.unpenalizedStalkConvertDown
    );
    daily.deltaAvgConvertDownPenalty = daily.avgConvertDownPenalty.minus(baseDaily.avgConvertDownPenalty);
    daily.deltaBonusStalkConvertUp = daily.bonusStalkConvertUp.minus(baseDaily.bonusStalkConvertUp);
    daily.deltaTotalBdvConvertUpBonus = daily.totalBdvConvertUpBonus.minus(baseDaily.totalBdvConvertUpBonus);
    daily.deltaTotalBdvConvertUp = daily.totalBdvConvertUp.minus(baseDaily.totalBdvConvertUp);
    daily.deltaBeanMints = daily.beanMints.minus(baseDaily.beanMints);
    daily.deltaPlantableStalk = daily.plantableStalk.minus(baseDaily.plantableStalk);
    daily.deltaBeanToMaxLpGpPerBdvRatio = daily.beanToMaxLpGpPerBdvRatio.minus(baseDaily.beanToMaxLpGpPerBdvRatio);
    daily.deltaCropRatio = daily.cropRatio.minus(baseDaily.cropRatio);
    daily.deltaAvgGrownStalkPerBdvPerSeason = daily.avgGrownStalkPerBdvPerSeason.minus(
      baseDaily.avgGrownStalkPerBdvPerSeason
    );
    daily.deltaGrownStalkPerSeason = daily.grownStalkPerSeason.minus(baseDaily.grownStalkPerSeason);
    daily.deltaActiveFarmers = daily.activeFarmers - baseDaily.activeFarmers;

    if (baseDaily.convertDownPenalty !== null) {
      // Implies current is also not null
      daily.deltaConvertDownPenalty = daily.convertDownPenalty!.minus(baseDaily.deltaConvertDownPenalty!);
    } else {
      daily.deltaConvertDownPenalty = daily.convertDownPenalty;
    }

    if (daily.id == baseDaily.id) {
      // Add existing deltas
      daily.deltaStalk = daily.deltaStalk.plus(baseDaily.deltaStalk);
      daily.deltaDepositedBDV = daily.deltaDepositedBDV.plus(baseDaily.deltaDepositedBDV);
      daily.deltaPlantedBeans = daily.deltaPlantedBeans.plus(baseDaily.deltaPlantedBeans);
      daily.deltaRoots = daily.deltaRoots.plus(baseDaily.deltaRoots);
      daily.deltaGerminatingStalk = daily.deltaGerminatingStalk.plus(baseDaily.deltaGerminatingStalk);
      daily.deltaPenalizedStalkConvertDown = daily.deltaPenalizedStalkConvertDown.plus(
        baseDaily.deltaPenalizedStalkConvertDown
      );
      daily.deltaUnpenalizedStalkConvertDown = daily.deltaUnpenalizedStalkConvertDown.plus(
        baseDaily.deltaUnpenalizedStalkConvertDown
      );
      daily.deltaAvgConvertDownPenalty = daily.deltaAvgConvertDownPenalty.plus(baseDaily.deltaAvgConvertDownPenalty);
      daily.deltaBonusStalkConvertUp = daily.deltaBonusStalkConvertUp.plus(baseDaily.deltaBonusStalkConvertUp);
      daily.deltaTotalBdvConvertUpBonus = daily.deltaTotalBdvConvertUpBonus.plus(baseDaily.deltaTotalBdvConvertUpBonus);
      daily.deltaTotalBdvConvertUp = daily.deltaTotalBdvConvertUp.plus(baseDaily.deltaTotalBdvConvertUp);
      daily.deltaBeanMints = daily.deltaBeanMints.plus(baseDaily.deltaBeanMints);
      daily.deltaPlantableStalk = daily.deltaPlantableStalk.plus(baseDaily.deltaPlantableStalk);
      daily.deltaBeanToMaxLpGpPerBdvRatio = daily.deltaBeanToMaxLpGpPerBdvRatio.plus(
        baseDaily.deltaBeanToMaxLpGpPerBdvRatio
      );
      daily.deltaCropRatio = daily.deltaCropRatio.plus(baseDaily.deltaCropRatio);
      daily.deltaAvgGrownStalkPerBdvPerSeason = daily.deltaAvgGrownStalkPerBdvPerSeason.plus(
        baseDaily.deltaAvgGrownStalkPerBdvPerSeason
      );
      daily.deltaGrownStalkPerSeason = daily.deltaGrownStalkPerSeason.plus(baseDaily.deltaGrownStalkPerSeason);
      daily.deltaActiveFarmers = daily.deltaActiveFarmers + baseDaily.deltaActiveFarmers;

      if (baseDaily.deltaConvertDownPenalty !== null) {
        // Implies current is also not null
        daily.deltaConvertDownPenalty = daily.deltaConvertDownPenalty!.plus(baseDaily.deltaConvertDownPenalty!);
      }
    }
  } else {
    daily.deltaStalk = daily.stalk;
    daily.deltaDepositedBDV = daily.depositedBDV;
    daily.deltaPlantedBeans = daily.plantedBeans;
    daily.deltaRoots = daily.roots;
    daily.deltaGerminatingStalk = daily.germinatingStalk;
    daily.deltaPenalizedStalkConvertDown = daily.penalizedStalkConvertDown;
    daily.deltaUnpenalizedStalkConvertDown = daily.unpenalizedStalkConvertDown;
    daily.deltaAvgConvertDownPenalty = daily.avgConvertDownPenalty;
    daily.deltaBonusStalkConvertUp = daily.bonusStalkConvertUp;
    daily.deltaTotalBdvConvertUpBonus = daily.totalBdvConvertUpBonus;
    daily.deltaTotalBdvConvertUp = daily.totalBdvConvertUp;
    daily.deltaBeanMints = daily.beanMints;
    daily.deltaPlantableStalk = daily.plantableStalk;
    daily.deltaBeanToMaxLpGpPerBdvRatio = daily.beanToMaxLpGpPerBdvRatio;
    daily.deltaCropRatio = daily.cropRatio;
    daily.deltaAvgGrownStalkPerBdvPerSeason = daily.avgGrownStalkPerBdvPerSeason;
    daily.deltaGrownStalkPerSeason = daily.grownStalkPerSeason;
    daily.deltaActiveFarmers = daily.activeFarmers;

    daily.deltaConvertDownPenalty = daily.convertDownPenalty;
  }
  daily.createdAt = day.times(BigInt.fromU32(86400));
  daily.updatedAt = block.timestamp;
  daily.save();

  silo.lastHourlySnapshotSeason = currentSeason;
  silo.lastDailySnapshotDay = day;
}

export function clearSiloDeltas(silo: Silo, block: ethereum.Block): void {
  const currentSeason = getCurrentSeason();
  const day = BigInt.fromI32(dayFromTimestamp(block.timestamp));
  const hourly = SiloHourlySnapshot.load(silo.id.toHexString() + "-" + currentSeason.toString());
  const daily = SiloDailySnapshot.load(silo.id.toHexString() + "-" + day.toString());
  if (hourly != null) {
    hourly.deltaDepositedBDV = ZERO_BI;
    hourly.deltaStalk = ZERO_BI;
    hourly.deltaPlantableStalk = ZERO_BI;
    hourly.deltaPlantedBeans = ZERO_BI;
    hourly.deltaGrownStalkPerSeason = ZERO_BI;
    hourly.deltaRoots = ZERO_BI;
    hourly.deltaGerminatingStalk = ZERO_BI;
    hourly.deltaBeanMints = ZERO_BI;
    hourly.deltaActiveFarmers = 0;
    hourly.save();
  }
  if (daily != null) {
    daily.deltaDepositedBDV = ZERO_BI;
    daily.deltaStalk = ZERO_BI;
    daily.deltaPlantableStalk = ZERO_BI;
    daily.deltaPlantedBeans = ZERO_BI;
    daily.deltaGrownStalkPerSeason = ZERO_BI;
    daily.deltaRoots = ZERO_BI;
    daily.deltaGerminatingStalk = ZERO_BI;
    daily.deltaBeanMints = ZERO_BI;
    daily.deltaActiveFarmers = 0;
    daily.save();
  }
}

// Set case id on hourly snapshot. Snapshot must have already been created.
export function setSiloHourlyCaseId(caseId: BigInt, silo: Silo): void {
  const hourly = SiloHourlySnapshot.load(silo.id.toHexString() + "-" + silo.lastHourlySnapshotSeason.toString())!;
  hourly.caseId = caseId;
  hourly.save();
}
