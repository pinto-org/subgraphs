import { harvest, plotTransfer, sow, temperatureChanged } from "../utils/Field";
import { PintoPI13, Sow, Harvest, PlotTransfer, TemperatureChange } from "../../generated/Beanstalk-ABIs/PintoPI13";
import { legacySowAmount } from "../utils/legacy/LegacyField";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleSow(event: Sow): void {
  const sownOverride = legacySowAmount(event.address, event.params.account, event.params.fieldId);
  const beanstalkContract = PintoPI13.bind(event.address);
  const temperature = beanstalkContract.temperature();
  const maxTemperature = beanstalkContract.maxTemperature();
  sow({
    event,
    account: event.params.account,
    fieldId: event.params.fieldId,
    index: event.params.index,
    beans: sownOverride !== null ? sownOverride : event.params.beans,
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
