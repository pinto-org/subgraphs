import { harvest, plotTransfer, sow, temperatureChanged } from "../utils/Field";
import { Sow, Harvest, PlotTransfer, TemperatureChange } from "../../generated/Beanstalk-ABIs/PintoLaunch";
import { legacySowAmount } from "../utils/legacy/LegacyField";
import { ZERO_BI } from "../../../../core/utils/Decimals";

export function handleSow(event: Sow): void {
  if (event.params.fieldId !== ZERO_BI) {
    return;
  }
  let sownOverride = legacySowAmount(event.address, event.params.account);
  sow({
    event,
    account: event.params.account,
    fieldId: null,
    index: event.params.index,
    beans: sownOverride !== null ? sownOverride : event.params.beans,
    pods: event.params.pods
  });
}

export function handleHarvest(event: Harvest): void {
  if (event.params.fieldId !== ZERO_BI) {
    return;
  }
  harvest({
    event,
    account: event.params.account,
    fieldId: null,
    plots: event.params.plots,
    beans: event.params.beans
  });
}

export function handlePlotTransfer(event: PlotTransfer): void {
  if (event.params.fieldId !== ZERO_BI) {
    return;
  }
  plotTransfer({
    event,
    from: event.params.from,
    to: event.params.to,
    fieldId: null,
    index: event.params.index,
    amount: event.params.amount
  });
}

// TODO: Import new PintoPI5
export function handleTemperatureChange(event: TemperatureChange): void {
  if (event.params.fieldId !== ZERO_BI) {
    return;
  }
  temperatureChanged({
    event,
    season: event.params.season,
    caseId: event.params.caseId,
    absChange: event.params.absChange
  });
}
