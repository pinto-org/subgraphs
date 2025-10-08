import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { assert, createMockedFunction } from "matchstick-as/assembly/index";
import {
  createHarvestEvent,
  createPlotCombinedEvent,
  createPlotTransferEvent,
  createSowEvent
} from "../event-mocking/Field";
import { createIncentivizationEvent } from "../event-mocking/Season";
import { handleIncentive } from "../../src/handlers/SeasonHandler";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { BEANSTALK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { handleHarvest, handlePlotCombined, handlePlotTransfer, handleSow } from "../../src/handlers/FieldHandler";
import { loadPlot } from "../../src/entities/Field";

const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

export function sow(account: string, index: BigInt, beans: BigInt, pods: BigInt): void {
  createMockedFunction(BEANSTALK, "getDeltaPodDemand", "getDeltaPodDemand():(uint256)").returns([
    ethereum.Value.fromUnsignedBigInt(ZERO_BI)
  ]);
  handleSow(createSowEvent(account, index, beans, pods));
}

export function harvest(account: string, plotIndexex: BigInt[], beans: BigInt): void {
  handleHarvest(createHarvestEvent(account, plotIndexex, beans));
}

export function transferPlot(from: string, to: string, id: BigInt, amount: BigInt): void {
  handlePlotTransfer(createPlotTransferEvent(from, to, id, amount));
}

export function combinePlots(
  account: string,
  indexes: BigInt[],
  totalPods: BigInt,
  blockNumber: BigInt = BigInt.fromI32(1),
  fieldId: BigInt = ZERO_BI
): void {
  handlePlotCombined(createPlotCombinedEvent(account, fieldId, indexes, totalPods, blockNumber));
}

export class PlotSeedScenario {
  index: BigInt;
  pods: BigInt;
  harvestable: BigInt;
  harvested: BigInt;
  combine: bool;

  constructor(index: BigInt, pods: BigInt, harvestable: BigInt, harvested: BigInt, combine: bool) {
    this.index = index;
    this.pods = pods;
    this.harvestable = harvestable;
    this.harvested = harvested;
    this.combine = combine;
  }
}

export function seedPlotWithHarvests(
  account: string,
  index: BigInt,
  beans: BigInt,
  pods: BigInt,
  harvestablePods: BigInt,
  harvestedPods: BigInt
): void {
  sow(account, index, beans, pods);

  const plot = loadPlot(BEANSTALK, index);
  plot.harvestablePods = harvestablePods;
  plot.harvestedPods = harvestedPods;
  plot.save();
}

export function setHarvestable(harvestableIndex: BigInt): BigInt {
  createMockedFunction(BEANSTALK, "harvestableIndex", "harvestableIndex():(uint256)").returns([
    ethereum.Value.fromUnsignedBigInt(harvestableIndex)
  ]);

  // Incentivization event triggers update of harvestable amount of each plot
  handleIncentive(createIncentivizationEvent(account, BigInt.fromI32(123456)));

  return harvestableIndex;
}
export function mockHarvestableIndexWithFieldId(
  protocolAddress: Address,
  harvestableIndex: BigInt,
  fieldId: BigInt
): void {
  createMockedFunction(protocolAddress, "harvestableIndex", "harvestableIndex(uint256):(uint256)")
    .withArgs([ethereum.Value.fromUnsignedBigInt(fieldId)])
    .returns([ethereum.Value.fromUnsignedBigInt(harvestableIndex)]);
}

export function assertFarmerHasPlot(
  farmer: string,
  index: BigInt,
  numPods: BigInt,
  numHarvestable: BigInt = ZERO_BI,
  debug: boolean = false
): void {
  if (debug) {
    log.debug("about to assert plot {}", [farmer]);
  }
  assert.fieldEquals("Plot", index.toString(), "farmer", farmer);
  assert.fieldEquals("Plot", index.toString(), "pods", numPods.toString());
  // log.debug("about to assert harvestable {}", [numHarvestable.toString()]);
  assert.fieldEquals("Plot", index.toString(), "harvestablePods", numHarvestable.toString());
}

// Field can be either a farmer or beanstalk address
export function assertFieldHas(
  field: string,
  unharvestable: BigInt,
  harvestable: BigInt,
  debug: boolean = false
): void {
  if (debug) {
    log.debug("about to assert field {}", [field]);
  }
  assert.fieldEquals("Field", field, "unharvestablePods", unharvestable.toString());
  assert.fieldEquals("Field", field, "harvestablePods", harvestable.toString());
}
