import {
  AddedGauge,
  Engaged,
  EngagedData,
  RemovedGauge,
  UpdatedGauge,
  UpdatedGaugeData,
  UpdatedGaugeValue
} from "../../generated/Beanstalk-ABIs/PintoPI14";
import { engaged, engagedData, toggleGaugeActive } from "../utils/GenGauge";

// A gauge was newly added
export function handleAddedGauge(event: AddedGauge): void {
  toggleGaugeActive(event.params.gaugeId, true, event.block);
  engaged(event.params.gaugeId, event.params.gauge.value, event.block);
  engagedData(event.params.gaugeId, event.params.gauge.data, event.block);
}

// An active gauge's value was updated
export function handleEngaged(event: Engaged): void {
  engaged(event.params.gaugeId, event.params.value, event.block);
}

// An active gauge's data was updated
export function handleEngagedData(event: EngagedData): void {
  engagedData(event.params.gaugeId, event.params.data, event.block);
}

export function handleRemovedGauge(event: RemovedGauge): void {
  toggleGaugeActive(event.params.gaugeId, false, event.block);
}

export function handleUpdatedGauge(event: UpdatedGauge): void {
  engaged(event.params.gaugeId, event.params.gauge.value, event.block);
  engagedData(event.params.gaugeId, event.params.gauge.data, event.block);
}

export function handleUpdatedGaugeValue(event: UpdatedGaugeValue): void {
  engaged(event.params.gaugeId, event.params.value, event.block);
}

export function handleUpdatedGaugeData(event: UpdatedGaugeData): void {
  engagedData(event.params.gaugeId, event.params.data, event.block);
}
