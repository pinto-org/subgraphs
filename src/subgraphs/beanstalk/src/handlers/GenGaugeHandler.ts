import {
  AddedGauge,
  Engaged,
  EngagedData,
  RemovedGauge,
  UpdatedGauge,
  UpdatedGaugeData,
  UpdatedGaugeValue
} from "../../generated/Beanstalk-ABIs/PintoPI12";
import { takeGaugesInfoSnapshots } from "../entities/snapshots/GaugesInfo";
import {
  engaged,
  engagedConvertDownPenalty,
  engagedConvertUpBonus,
  engagedCultivationFactor,
  engagedData,
  engagedDataConvertUpBonus,
  loadGaugesInfo
} from "../utils/GenGauge";

// A gauge was newly added
export function handleAddedGauge(event: AddedGauge): void {
  const genGauge = loadGaugesInfo();
  if (event.params.gaugeId == 0) {
    genGauge.g0IsActive = true;
  } else if (event.params.gaugeId == 1) {
    genGauge.g1IsActive = true;
  } else if (event.params.gaugeId == 2) {
    genGauge.g2IsActive = true;
  }
  genGauge.save();

  engaged(event.params.gaugeId, event.params.gauge.value, event.block);
  engagedData(event.params.gaugeId, event.params.gauge.data, event.block);
}

// An active gauge's value was updated
export function handleEngaged(event: Engaged): void {
  if (event.params.gaugeId == 0) {
    engagedCultivationFactor(event.params.value, event.block);
  } else if (event.params.gaugeId == 1) {
    engagedConvertDownPenalty(event.params.value, event.block);
  } else if (event.params.gaugeId == 2) {
    engagedConvertUpBonus(event.params.value, event.block);
  }
}
// An active gauge's data was updated
export function handleEngagedData(event: EngagedData): void {
  if (event.params.gaugeId == 2) {
    engagedDataConvertUpBonus(event.params.data, event.block);
  }
}

// TODO(pp): add these to manifest
export function handleRemovedGauge(event: RemovedGauge): void {
  const genGauge = loadGaugesInfo();
  if (event.params.gaugeId == 0) {
    genGauge.g0IsActive = false;
  } else if (event.params.gaugeId == 1) {
    genGauge.g1IsActive = false;
  } else if (event.params.gaugeId == 2) {
    genGauge.g2IsActive = false;
  }
  takeGaugesInfoSnapshots(genGauge, event.block);
  genGauge.save();
}

export function handleUpdatedGauge(event: UpdatedGauge): void {
  engaged(event.params.gaugeId, event.params.gauge.value, event.block);
  engagedData(event.params.gaugeId, event.params.gauge.data, event.block);
}

export function handleUpdatedGaugeValue(event: UpdatedGaugeValue): void {
  //
}

export function handleUpdatedGaugeData(event: UpdatedGaugeData): void {
  //
}
