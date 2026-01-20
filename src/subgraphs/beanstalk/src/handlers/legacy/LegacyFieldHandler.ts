import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BI_10, toBigInt, toDecimal, ZERO_BI } from "../../../../../core/utils/Decimals";
import {
  WeatherChange,
  SupplyIncrease,
  SupplyDecrease,
  SupplyNeutral,
  FundFundraiser
} from "../../../generated/Beanstalk-ABIs/PreReplant";
import {
  Harvest as Harvest_v1,
  PlotTransfer as PlotTransfer_v1,
  Sow as Sow_v1,
  TemperatureChange as TemperatureChange_v1
} from "../../../generated/Beanstalk-ABIs/SeedGauge";
import { PintoLaunch, TemperatureChange as TemperatureChange_v2 } from "../../../generated/Beanstalk-ABIs/PintoLaunch";
import { harvest, plotTransfer, sow, temperatureChanged, updateFieldTotals } from "../../utils/Field";
import { legacySowAmount } from "../../utils/legacy/LegacyField";
import { Sow as Sow_buggedPinto } from "../../../generated/Beanstalk-ABIs/PintoPI14";

// PreReplant -> SeedGauge
export function handleWeatherChange(event: WeatherChange): void {
  temperatureChanged({
    event,
    season: event.params.season,
    caseId: event.params.caseId,
    absChange: BigInt.fromI32(event.params.change),
    fieldId: ZERO_BI
  });
}

// PreReplant -> Replanted
export function handleSupplyIncrease(event: SupplyIncrease): void {
  updateFieldTotals(
    event.address,
    event.address,
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block
  );
}

// PreReplant -> Replanted
export function handleSupplyDecrease(event: SupplyDecrease): void {
  updateFieldTotals(
    event.address,
    event.address,
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block
  );
}

// PreReplant -> Replanted
export function handleSupplyNeutral(event: SupplyNeutral): void {
  updateFieldTotals(
    event.address,
    event.address,
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block
  );
}

// PreReplant -> Replanted
export function handleFundFundraiser(event: FundFundraiser): void {
  // Account for the fact that fundraiser sow using no soil.
  updateFieldTotals(
    event.address,
    event.address,
    ZERO_BI,
    ZERO_BI.minus(event.params.amount),
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block
  );
}

// PreReplant -> Reseed
export function handleSow_v1(event: Sow_v1): void {
  let sownOverride = legacySowAmount(event.address, event.params.account);
  sow({
    event,
    account: event.params.account,
    fieldId: ZERO_BI,
    index: event.params.index,
    beansSown: sownOverride !== null ? sownOverride : event.params.beans,
    soilSown: sownOverride !== null ? sownOverride : event.params.beans,
    pods: event.params.pods,
    // This will cause indexing beanstalk to crash; this is intended as its not implemented.
    // Will need to be revisited if ever deployed to beanstalk.
    temperature: ZERO_BI,
    maxTemperature: ZERO_BI
  });
}

// PintoLaunch -> PI-1
// There was a bug in the event where the amount of beans emitted was actually the amount of soil reduced.
// This was relevant during morning sows when above peg.
export function handleSow_buggedPinto(event: Sow_buggedPinto): void {
  const beanstalkContract = PintoLaunch.bind(event.address);
  const temperature = beanstalkContract.temperature();
  const maxTemperature = beanstalkContract.maxTemperature();

  // The true amount of beans sown is computed here using the actual temperature.
  const pods_f64: f64 = parseFloat(toDecimal(event.params.pods, 6).toString());
  const temperature_f64: f64 = parseFloat(toDecimal(temperature, 6 + 2).toString());
  const beansSown = toBigInt(BigDecimal.fromString((pods_f64 / (1.0 + temperature_f64)).toString()), 6);

  sow({
    event,
    account: event.params.account,
    fieldId: ZERO_BI,
    index: event.params.index,
    beansSown,
    soilSown: event.params.beans, // beans = soil
    pods: event.params.pods,
    temperature: temperature,
    maxTemperature: maxTemperature
  });
}

// PreReplant -> Reseed
export function handleHarvest_v1(event: Harvest_v1): void {
  harvest({
    event,
    account: event.params.account,
    fieldId: ZERO_BI,
    plots: event.params.plots,
    beans: event.params.beans
  });
}

// PreReplant -> Reseed
export function handlePlotTransfer_v1(event: PlotTransfer_v1): void {
  plotTransfer({
    event,
    from: event.params.from,
    to: event.params.to,
    fieldId: ZERO_BI,
    index: event.params.id,
    amount: event.params.pods
  });
}

// SeedGauge -> Reseed
export function handleTemperatureChange_v1(event: TemperatureChange_v1): void {
  temperatureChanged({
    event,
    season: event.params.season,
    caseId: event.params.caseId,
    absChange: BigInt.fromI32(event.params.absChange).times(BI_10.pow(6)),
    fieldId: ZERO_BI
  });
}

// PintoLaunch -> PintoPI5
export function handleTemperatureChange_v2(event: TemperatureChange_v2): void {
  temperatureChanged({
    event,
    season: event.params.season,
    caseId: event.params.caseId,
    absChange: BigInt.fromI32(event.params.absChange).times(BI_10.pow(6)),
    fieldId: ZERO_BI
  });
}
