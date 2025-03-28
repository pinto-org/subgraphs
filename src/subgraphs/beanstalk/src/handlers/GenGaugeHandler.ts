import { AddedGauge, Engaged } from "../../generated/Beanstalk-ABIs/PintoPI6";
import {
  engagedConvertDownPenalty,
  engagedCultivationFactor,
  initConvertDownPenalty,
  initCultivationFactor
} from "../utils/GenGauge";

// A gauge was newly added
export function handleAddedGauge(event: AddedGauge): void {
  if (event.params.gaugeId == 0) {
    initCultivationFactor(event.params.gauge, event.block);
  } else if (event.params.gaugeId == 1) {
    initConvertDownPenalty(event.params.gauge, event.block);
  }
}

// An active gauge's value was updated
export function handleEngaged(event: Engaged): void {
  if (event.params.gaugeId == 0) {
    engagedCultivationFactor(event.params.value, event.block);
  } else if (event.params.gaugeId == 1) {
    engagedConvertDownPenalty(event.params.value, event.block);
  }
}
