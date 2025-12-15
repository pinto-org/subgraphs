import { harvest, plotTransfer, sow, temperatureChanged, sowReferral } from "../utils/Field";
import {
  PintoPI14,
  Sow,
  Harvest,
  PlotTransfer,
  TemperatureChange,
  SowReferral
} from "../../generated/Beanstalk-ABIs/PintoPI14";
import { legacySowAmount } from "../utils/legacy/LegacyField";
import { BigInt } from "@graphprotocol/graph-ts";
import { loadField } from "../entities/Field";

// PI-1+
export function handleSow(event: Sow): void {
  const sownOverride = legacySowAmount(event.address, event.params.account, event.params.fieldId);
  const beanstalkContract = PintoPI14.bind(event.address);
  const temperature = beanstalkContract.temperature();
  const maxTemperature = beanstalkContract.maxTemperature();

  const field = loadField(event.address, event.params.fieldId);
  const remainingSoil = beanstalkContract.initialSoil();
  const soilSown = field.soil.minus(remainingSoil);
  sow({
    event,
    account: event.params.account,
    fieldId: event.params.fieldId,
    index: event.params.index,
    beansSown: sownOverride !== null ? sownOverride : event.params.beans,
    soilSown: soilSown,
    pods: event.params.pods,
    temperature: temperature,
    maxTemperature: maxTemperature
  });
}

export function handleHarvest(event: Harvest): void {
  harvest({
    event,
    account: event.params.account,
    fieldId: event.params.fieldId,
    plots: event.params.plots,
    beans: event.params.beans
  });
}

export function handlePlotTransfer(event: PlotTransfer): void {
  plotTransfer({
    event,
    from: event.params.from,
    to: event.params.to,
    fieldId: event.params.fieldId,
    index: event.params.index,
    amount: event.params.amount
  });
}

export function handleTemperatureChange(event: TemperatureChange): void {
  temperatureChanged({
    event,
    season: event.params.season,
    caseId: event.params.caseId,
    absChange: BigInt.fromI32(event.params.absChange),
    fieldId: event.params.fieldId
  });
}

export function handleSowReferral(event: SowReferral): void {
  sowReferral({
    event,
    referrer: event.params.referrer,
    referrerIndex: event.params.referrerIndex,
    referrerPods: event.params.referrerPods,
    referee: event.params.referee,
    refereeIndex: event.params.refereeIndex,
    refereePods: event.params.refereePods
  });
}
