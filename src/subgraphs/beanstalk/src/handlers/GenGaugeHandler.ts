import { AddedGauge, Engaged } from "../../generated/Beanstalk-ABIs/PintoPI8";
import {
  engagedConvertDownPenalty,
  engagedConvertUpBonus,
  engagedCultivationFactor,
  engagedDataConvertUpBonus,
  initConvertDownPenalty,
  initConvertUpBonus,
  initCultivationFactor
} from "../utils/GenGauge";

// A gauge was newly added
export function handleAddedGauge(event: AddedGauge): void {
  if (event.params.gaugeId == 0) {
    initCultivationFactor(event.params.gauge, event.block);
  } else if (event.params.gaugeId == 1) {
    initConvertDownPenalty(event.params.gauge, event.block);
  } else if (event.params.gaugeId == 2) {
    initConvertUpBonus(event.params.gauge, event.block);
  }
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

export function handleEngagedData(event: EngagedData): void {
  if (event.params.gaugeId == 2) {
    engagedDataConvertUpBonus(event.params.data, event.block);
  }
}
