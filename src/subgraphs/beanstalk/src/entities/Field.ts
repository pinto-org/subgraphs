import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Field, Plot } from "../../generated/schema";
import { ONE_BD, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { v } from "../utils/constants/Version";

export function getFieldEntityId(account: Address, fieldId: BigInt = ZERO_BI): string {
  if (fieldId.equals(ZERO_BI)) {
    return account.toHexString();
  }
  return account.toHexString() + "-" + fieldId.toString();
}

export function getPlotEntityId(index: BigInt, fieldId: BigInt = ZERO_BI): string {
  if (fieldId.equals(ZERO_BI)) {
    return index.toString();
  }
  return index.toString() + "-" + fieldId.toString();
}

export function loadField(account: Address, fieldId: BigInt = ZERO_BI): Field {
  const entityId = getFieldEntityId(account, fieldId);
  let field = Field.load(entityId);
  if (field == null) {
    field = new Field(entityId);
    field.beanstalk = "beanstalk";
    if (account !== v().protocolAddress) {
      field.farmer = account;
    }
    field.fieldId = fieldId;
    field.season = 1;
    field.temperature = ONE_BD;
    field.realRateOfReturn = ZERO_BD;
    field.numberOfSowers = 0;
    field.numberOfSows = 0;
    field.sownBeans = ZERO_BI;
    field.plotIndexes = [];
    field.unharvestablePods = ZERO_BI;
    field.harvestablePods = ZERO_BI;
    field.harvestedPods = ZERO_BI;
    field.soil = ZERO_BI;
    field.podIndex = ZERO_BI;
    field.harvestableIndex = ZERO_BI;
    field.podRate = ZERO_BD;
    field.save();
  }
  return field;
}

export function loadPlot(diamondAddress: Address, index: BigInt, fieldId: BigInt = ZERO_BI): Plot {
  const plotId = getPlotEntityId(index, fieldId);
  let plot = Plot.load(plotId);
  if (plot == null) {
    plot = new Plot(plotId);
    plot.field = getFieldEntityId(diamondAddress, fieldId);
    plot.fieldId = fieldId;
    plot.farmer = ADDRESS_ZERO;
    plot.source = "SOW"; // Should be overwritten in case of a transfer creating a new plot
    plot.sourceHash = ADDRESS_ZERO;
    plot.season = 1;
    plot.creationHash = ADDRESS_ZERO;
    plot.createdAt = ZERO_BI;
    plot.updatedAt = ZERO_BI;
    plot.updatedAtBlock = ZERO_BI;
    plot.index = index;
    plot.pods = ZERO_BI;
    plot.beansPerPod = ZERO_BI;
    plot.initialHarvestableIndex = ZERO_BI;
    plot.sownBeansPerPod = ZERO_BI;
    plot.sownInitialHarvestableIndex = ZERO_BI;
    plot.harvestablePods = ZERO_BI;
    plot.harvestedPods = ZERO_BI;
    plot.fullyHarvested = false;
    plot.sowSeason = 1;
    plot.sowHash = ADDRESS_ZERO;
    plot.sowTimestamp = ZERO_BI;
    plot.save();
  }
  return plot;
}
