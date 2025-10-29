import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { assert, createMockedFunction } from "matchstick-as/assembly/index";
import { createHarvestEvent, createPlotTransferEvent, createSowEvent } from "../event-mocking/Field";
import { createIncentivizationEvent } from "../event-mocking/Season";
import { handleIncentive } from "../../src/handlers/SeasonHandler";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { BEANSTALK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { handleHarvest, handlePlotTransfer, handleSow } from "../../src/handlers/FieldHandler";
import { getFieldEntityId, getPlotEntityId } from "../../src/entities/Field";

const account = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

export function sow(account: string, index: BigInt, beans: BigInt, pods: BigInt, fieldId: BigInt = ZERO_BI): void {
  createMockedFunction(BEANSTALK, "getDeltaPodDemand", "getDeltaPodDemand():(uint256)").returns([
    ethereum.Value.fromUnsignedBigInt(ZERO_BI)
  ]);
  handleSow(createSowEvent(account, index, beans, pods, fieldId));
}

export function harvest(account: string, plotIndexex: BigInt[], beans: BigInt, fieldId: BigInt = ZERO_BI): void {
  handleHarvest(createHarvestEvent(account, plotIndexex, beans, fieldId));
}

export function transferPlot(
  from: string,
  to: string,
  id: BigInt,
  amount: BigInt,
  fieldId: BigInt = ZERO_BI
): void {
  handlePlotTransfer(createPlotTransferEvent(from, to, id, amount, fieldId));
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
  fieldId: BigInt = ZERO_BI,
  debug: boolean = false
): void {
  if (debug) {
    log.debug("about to assert plot {}", [farmer]);
  }
  const plotId = getPlotEntityId(index, fieldId);
  assert.fieldEquals("Plot", plotId, "farmer", farmer);
  assert.fieldEquals("Plot", plotId, "pods", numPods.toString());
  // log.debug("about to assert harvestable {}", [numHarvestable.toString()]);
  assert.fieldEquals("Plot", plotId, "harvestablePods", numHarvestable.toString());
}

// Field can be either a farmer or beanstalk address
export function assertFieldHas(
  field: string,
  unharvestable: BigInt,
  harvestable: BigInt,
  fieldId: BigInt = ZERO_BI,
  debug: boolean = false
): void {
  if (debug) {
    log.debug("about to assert field {}", [field]);
  }
  const fieldEntityId = getFieldEntityId(Address.fromString(field), fieldId);
  assert.fieldEquals("Field", fieldEntityId, "unharvestablePods", unharvestable.toString());
  assert.fieldEquals("Field", fieldEntityId, "harvestablePods", harvestable.toString());
}
