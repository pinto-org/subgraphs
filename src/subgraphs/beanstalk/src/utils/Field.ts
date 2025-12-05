import { Address, BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { BeanstalkPrice_priceOnly } from "./contracts/BeanstalkPrice";
import { BI_10, ONE_BD, toBigInt, toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import {
  calculateCultivationTemperature,
  setDeltaPodDemand,
  setFieldHourlyCaseId,
  setHourlySoilSoldOut,
  takeFieldSnapshots
} from "../entities/snapshots/Field";
import { getCurrentSeason, getHarvestableIndex, loadBeanstalk, loadFarmer, loadSeason } from "../entities/Beanstalk";
import { loadField, loadPlot } from "../entities/Field";
import { expirePodListingIfExists } from "./Marketplace";
import { toAddress } from "../../../../core/utils/Bytes";
import { PintoPI13 } from "../../generated/Beanstalk-ABIs/PintoPI13";

class SowParams {
  event: ethereum.Event;
  account: Address;
  fieldId: BigInt = ZERO_BI;
  index: BigInt;
  beansSown: BigInt;
  soilSown: BigInt;
  pods: BigInt;
  temperature: BigInt;
  maxTemperature: BigInt;
}

class HarvestParams {
  event: ethereum.Event;
  account: Address;
  fieldId: BigInt = ZERO_BI;
  plots: BigInt[];
  beans: BigInt;
}

class PlotTransferParams {
  event: ethereum.Event;
  from: Address;
  to: Address;
  fieldId: BigInt = ZERO_BI;
  index: BigInt;
  amount: BigInt;
}

class TemperatureChangedParams {
  event: ethereum.Event;
  season: BigInt;
  caseId: BigInt;
  absChange: BigInt;
  fieldId: BigInt = ZERO_BI;
}

class SowReferralParams {
  event: ethereum.Event;
  referrer: Address;
  referrerIndex: BigInt;
  referrerPods: BigInt;
  referee: Address;
  refereeIndex: BigInt;
  refereePods: BigInt;
}

export function sow(params: SowParams): void {
  const protocol = params.event.address;

  updateFieldTotals(
    protocol,
    params.account,
    params.soilSown.neg(),
    params.beansSown,
    params.pods,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    params.event.block,
    params.fieldId
  );

  const protocolField = loadField(protocol, params.fieldId);
  loadFarmer(params.account, params.event.block);
  const plot = loadPlot(protocol, params.index, params.fieldId);

  const newIndexes = protocolField.plotIndexes;
  newIndexes.push(plot.index);
  protocolField.plotIndexes = newIndexes;
  protocolField.save();

  plot.farmer = params.account;
  plot.source = "SOW";
  plot.sourceHash = params.event.transaction.hash;
  plot.season = protocolField.season;
  plot.creationHash = params.event.transaction.hash;
  plot.createdAt = params.event.block.timestamp;
  plot.sowSeason = plot.season;
  plot.sowHash = plot.creationHash;
  plot.sowTimestamp = plot.createdAt;
  plot.updatedAt = params.event.block.timestamp;
  plot.updatedAtBlock = params.event.block.number;
  plot.pods = params.pods;
  plot.isMorning = params.temperature.notEqual(params.maxTemperature);
  plot.beansPerPod = params.beansSown.times(BI_10.pow(6)).div(plot.pods);
  plot.sownBeansPerPod = plot.beansPerPod;
  plot.initialHarvestableIndex = protocolField.harvestableIndex;
  plot.sownInitialHarvestableIndex = plot.initialHarvestableIndex;
  plot.save();

  incrementSows(protocol, params.account, params.event.block, params.fieldId);

  const beanstalk = PintoPI13.bind(protocol);
  const deltaPodDemand = beanstalk.getDeltaPodDemand();
  setDeltaPodDemand(deltaPodDemand, protocolField);
}

export function sowReferral(params: SowReferralParams): void {
  const protocol = params.event.address;

  // Plots were already created via SOW event, update source to REFERRAL
  const referrerBonusPlot = loadPlot(protocol, params.referrerIndex);
  referrerBonusPlot.source = "REFERRAL";
  referrerBonusPlot.save();

  const refereeBonusPlot = loadPlot(protocol, params.refereeIndex);
  refereeBonusPlot.source = "REFERRAL";
  refereeBonusPlot.save();

  const referrerFarmer = loadFarmer(params.referrer, params.event.block);
  referrerFarmer.refereeCount += 1;
  referrerFarmer.totalReferralRewardPodsReceived = referrerFarmer.totalReferralRewardPodsReceived.plus(
    params.referrerPods
  );
  referrerFarmer.save();
}

export function harvest(params: HarvestParams): void {
  const protocol = params.event.address;
  const fieldId = params.fieldId;
  let beanstalk = loadBeanstalk();
  loadFarmer(params.account, params.event.block);

  let remainingIndex = ZERO_BI;
  for (let i = 0; i < params.plots.length; i++) {
    let plot = loadPlot(protocol, params.plots[i], fieldId);
    plot.fullyHarvested = true;
    plot.updatedAt = params.event.block.timestamp;
    plot.harvestAt = params.event.block.timestamp;
    plot.harvestHash = params.event.transaction.hash;

    expirePodListingIfExists(toAddress(plot.farmer), plot.index, params.event.block);

    let harvestablePods = getHarvestableIndex().minus(plot.index);

    if (harvestablePods >= plot.pods) {
      // Plot fully harvests
      updateFieldTotals(
        protocol,
        params.account,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        plot.pods,
        params.event.block,
        fieldId
      );

      plot.harvestedPods = plot.pods;
      plot.save();
    } else {
      // Plot partially harvests
      updateFieldTotals(
        protocol,
        params.account,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        harvestablePods,
        params.event.block,
        fieldId
      );

      remainingIndex = plot.index.plus(harvestablePods);
      let remainingPods = plot.pods.minus(harvestablePods);

      let remainingPlot = loadPlot(protocol, remainingIndex, fieldId);
      remainingPlot.farmer = plot.farmer;
      remainingPlot.source = plot.source;
      remainingPlot.sourceHash = plot.sourceHash;
      remainingPlot.preTransferSource = plot.preTransferSource;
      remainingPlot.preTransferOwner = plot.preTransferOwner;
      remainingPlot.season = beanstalk.lastSeason;
      remainingPlot.creationHash = params.event.transaction.hash;
      remainingPlot.createdAt = params.event.block.timestamp;
      remainingPlot.sowSeason = plot.sowSeason;
      remainingPlot.sowHash = plot.sowHash;
      remainingPlot.sowTimestamp = plot.sowTimestamp;
      remainingPlot.updatedAt = params.event.block.timestamp;
      remainingPlot.updatedAtBlock = params.event.block.number;
      remainingPlot.index = remainingIndex;
      remainingPlot.pods = remainingPods;
      remainingPlot.beansPerPod = plot.beansPerPod;
      remainingPlot.sownBeansPerPod = plot.sownBeansPerPod;
      remainingPlot.initialHarvestableIndex = plot.initialHarvestableIndex;
      remainingPlot.sownInitialHarvestableIndex = plot.sownInitialHarvestableIndex;
      remainingPlot.save();

      plot.harvestedPods = harvestablePods;
      plot.pods = harvestablePods;
      plot.save();
    }
  }

  // Remove the harvested plot IDs from the field list
  let field = loadField(protocol, fieldId);
  let newIndexes = field.plotIndexes;
  for (let i = 0; i < params.plots.length; i++) {
    let plotIndex = newIndexes.indexOf(params.plots[i]);
    newIndexes.splice(plotIndex, 1);
    newIndexes.sort();
  }
  if (remainingIndex !== ZERO_BI) {
    newIndexes.push(remainingIndex);
  }
  field.plotIndexes = newIndexes;
  field.save();
}

export function plotTransfer(params: PlotTransferParams): void {
  const protocol = params.event.address;
  const fieldId = params.fieldId;
  const currentHarvestable = getHarvestableIndex();

  // Ensure both farmer entites exist
  loadFarmer(params.from, params.event.block);
  loadFarmer(params.to, params.event.block);

  let field = loadField(protocol, fieldId);
  let sortedPlots = field.plotIndexes.sort();

  let sourceIndex = ZERO_BI;

  for (let i = 0; i < sortedPlots.length; i++) {
    // Handle only single comparison for first value of array
    if (i == 0) {
      if (sortedPlots[i] == params.index) {
        sourceIndex = sortedPlots[i];
        break;
      } else {
        continue;
      }
    }
    // Transferred plot matches existing. Start value of zero.
    if (sortedPlots[i] == params.index) {
      sourceIndex = sortedPlots[i];
      break;
    }
    // Transferred plot is in the middle of existing plot. Non-zero start value.
    if (sortedPlots[i - 1] < params.index && params.index < sortedPlots[i]) {
      sourceIndex = sortedPlots[i - 1];
    }
  }

  let sourcePlot = loadPlot(protocol, sourceIndex, fieldId);
  let sourceEndIndex = sourceIndex.plus(sourcePlot.pods);
  let transferEndIndex = params.index.plus(params.amount);

  // Determines how many of the pods being transferred are harvestable
  const calcHarvestable = (index: BigInt, pods: BigInt, harvestableIndex: BigInt): BigInt => {
    let harvestable = harvestableIndex.minus(index);
    if (harvestable < ZERO_BI) {
      return ZERO_BI;
    } else {
      return harvestable >= pods ? pods : harvestable;
    }
  };

  let transferredHarvestable = calcHarvestable(params.index, params.amount, currentHarvestable);

  // Actually transfer the plots
  if (sourcePlot.pods == params.amount) {
    // Sending full plot
    const isMarket = sourcePlot.source == "MARKET" && sourcePlot.sourceHash == params.event.transaction.hash;
    if (!isMarket) {
      if (sourcePlot.preTransferSource == null) {
        sourcePlot.preTransferSource = sourcePlot.source;
        sourcePlot.preTransferOwner = sourcePlot.farmer;
      }
      sourcePlot.source = "TRANSFER";
      sourcePlot.sourceHash = params.event.transaction.hash;
      sourcePlot.beansPerPod = sourcePlot.beansPerPod;
      sourcePlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
    }
    sourcePlot.farmer = params.to;
    sourcePlot.updatedAt = params.event.block.timestamp;
    sourcePlot.updatedAtBlock = params.event.block.number;
    sourcePlot.save();
  } else if (sourceIndex == params.index) {
    // We are only needing to split this plot once to send
    // Start value of zero
    let remainderIndex = sourceIndex.plus(params.amount);
    let remainderPlot = loadPlot(protocol, remainderIndex, fieldId);
    sortedPlots.push(remainderIndex);

    const isMarket = sourcePlot.source == "MARKET" && sourcePlot.sourceHash == params.event.transaction.hash;
    if (!isMarket) {
      // When sending the start of the plot via market, these cannot be derived from sourcePlot.
      // If market, all of these will be set in `setBeansPerPodAfterFill`
      remainderPlot.source = sourcePlot.source;
      remainderPlot.sourceHash = sourcePlot.sourceHash;
      remainderPlot.beansPerPod = sourcePlot.beansPerPod;
      remainderPlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
      remainderPlot.preTransferSource = sourcePlot.preTransferSource;
      remainderPlot.preTransferOwner = sourcePlot.preTransferOwner;

      if (sourcePlot.preTransferSource == null) {
        sourcePlot.preTransferSource = sourcePlot.source;
        sourcePlot.preTransferOwner = sourcePlot.farmer;
      }
      sourcePlot.source = "TRANSFER";
      sourcePlot.sourceHash = params.event.transaction.hash;
      sourcePlot.beansPerPod = sourcePlot.beansPerPod;
      sourcePlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
    }
    sourcePlot.farmer = params.to;
    sourcePlot.updatedAt = params.event.block.timestamp;
    sourcePlot.updatedAtBlock = params.event.block.number;
    sourcePlot.pods = params.amount;
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    remainderPlot.farmer = params.from;
    remainderPlot.season = field.season;
    remainderPlot.creationHash = params.event.transaction.hash;
    remainderPlot.createdAt = params.event.block.timestamp;
    remainderPlot.sowSeason = sourcePlot.sowSeason;
    remainderPlot.sowHash = sourcePlot.sowHash;
    remainderPlot.sowTimestamp = sourcePlot.sowTimestamp;
    remainderPlot.updatedAt = params.event.block.timestamp;
    remainderPlot.updatedAtBlock = params.event.block.number;
    remainderPlot.index = remainderIndex;
    remainderPlot.pods = sourceEndIndex.minus(transferEndIndex);
    remainderPlot.harvestablePods = calcHarvestable(remainderPlot.index, remainderPlot.pods, currentHarvestable);
    remainderPlot.sownBeansPerPod = sourcePlot.sownBeansPerPod;
    remainderPlot.sownInitialHarvestableIndex = sourcePlot.sownInitialHarvestableIndex;
    remainderPlot.save();
  } else if (sourceEndIndex == transferEndIndex) {
    // We are only needing to split this plot once to send
    // Non-zero start value. Sending to end of plot
    let toPlot = loadPlot(protocol, params.index, fieldId);
    sortedPlots.push(params.index);

    sourcePlot.updatedAt = params.event.block.timestamp;
    sourcePlot.updatedAtBlock = params.event.block.number;
    sourcePlot.pods = sourcePlot.pods.minus(params.amount);
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    const isMarket = toPlot.source == "MARKET" && toPlot.sourceHash == params.event.transaction.hash;
    if (!isMarket) {
      toPlot.source = "TRANSFER";
      toPlot.sourceHash = params.event.transaction.hash;
      toPlot.beansPerPod = sourcePlot.beansPerPod;
      toPlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
      // Passthrough if possible, otherwise init
      toPlot.preTransferSource =
        sourcePlot.preTransferSource !== null ? sourcePlot.preTransferSource : sourcePlot.source;
      toPlot.preTransferOwner = sourcePlot.preTransferOwner !== null ? sourcePlot.preTransferOwner : sourcePlot.farmer;
    }
    toPlot.farmer = params.to;
    toPlot.season = field.season;
    toPlot.creationHash = params.event.transaction.hash;
    toPlot.createdAt = params.event.block.timestamp;
    toPlot.sowSeason = sourcePlot.sowSeason;
    toPlot.sowHash = sourcePlot.sowHash;
    toPlot.sowTimestamp = sourcePlot.sowTimestamp;
    toPlot.updatedAt = params.event.block.timestamp;
    toPlot.updatedAtBlock = params.event.block.number;
    toPlot.index = params.index;
    toPlot.pods = params.amount;
    toPlot.harvestablePods = calcHarvestable(toPlot.index, toPlot.pods, currentHarvestable);
    toPlot.sownBeansPerPod = sourcePlot.sownBeansPerPod;
    toPlot.sownInitialHarvestableIndex = sourcePlot.sownInitialHarvestableIndex;
    toPlot.save();
  } else {
    // We have to split this plot twice to send
    let remainderIndex = params.index.plus(params.amount);
    let toPlot = loadPlot(protocol, params.index, fieldId);
    let remainderPlot = loadPlot(protocol, remainderIndex, fieldId);

    sortedPlots.push(params.index);
    sortedPlots.push(remainderIndex);

    sourcePlot.updatedAt = params.event.block.timestamp;
    sourcePlot.updatedAtBlock = params.event.block.number;
    sourcePlot.pods = params.index.minus(sourcePlot.index);
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    const isMarket = toPlot.source == "MARKET" && toPlot.sourceHash == params.event.transaction.hash;
    if (!isMarket) {
      toPlot.source = "TRANSFER";
      toPlot.sourceHash = params.event.transaction.hash;
      toPlot.beansPerPod = sourcePlot.beansPerPod;
      toPlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
      // Passthrough if possible, otherwise init
      toPlot.preTransferSource =
        sourcePlot.preTransferSource !== null ? sourcePlot.preTransferSource : sourcePlot.source;
      toPlot.preTransferOwner = sourcePlot.preTransferOwner !== null ? sourcePlot.preTransferOwner : sourcePlot.farmer;
    }
    toPlot.farmer = params.to;
    toPlot.season = field.season;
    toPlot.creationHash = params.event.transaction.hash;
    toPlot.createdAt = params.event.block.timestamp;
    toPlot.sowSeason = sourcePlot.sowSeason;
    toPlot.sowHash = sourcePlot.sowHash;
    toPlot.sowTimestamp = sourcePlot.sowTimestamp;
    toPlot.updatedAt = params.event.block.timestamp;
    toPlot.updatedAtBlock = params.event.block.number;
    toPlot.index = params.index;
    toPlot.pods = params.amount;
    toPlot.harvestablePods = calcHarvestable(toPlot.index, toPlot.pods, currentHarvestable);
    toPlot.sownBeansPerPod = sourcePlot.sownBeansPerPod;
    toPlot.sownInitialHarvestableIndex = sourcePlot.sownInitialHarvestableIndex;
    toPlot.save();

    remainderPlot.farmer = params.from;
    remainderPlot.source = sourcePlot.source;
    remainderPlot.sourceHash = sourcePlot.sourceHash;
    remainderPlot.preTransferSource = sourcePlot.preTransferSource;
    remainderPlot.preTransferOwner = sourcePlot.preTransferOwner;
    remainderPlot.season = field.season;
    remainderPlot.creationHash = params.event.transaction.hash;
    remainderPlot.createdAt = params.event.block.timestamp;
    remainderPlot.sowSeason = sourcePlot.sowSeason;
    remainderPlot.sowHash = sourcePlot.sowHash;
    remainderPlot.sowTimestamp = sourcePlot.sowTimestamp;
    remainderPlot.updatedAt = params.event.block.timestamp;
    remainderPlot.updatedAtBlock = params.event.block.number;
    remainderPlot.index = remainderIndex;
    remainderPlot.pods = sourceEndIndex.minus(transferEndIndex);
    remainderPlot.harvestablePods = calcHarvestable(remainderPlot.index, remainderPlot.pods, currentHarvestable);
    remainderPlot.beansPerPod = sourcePlot.beansPerPod;
    remainderPlot.sownBeansPerPod = sourcePlot.sownBeansPerPod;
    remainderPlot.initialHarvestableIndex = sourcePlot.initialHarvestableIndex;
    remainderPlot.sownInitialHarvestableIndex = sourcePlot.sownInitialHarvestableIndex;
    remainderPlot.save();
  }
  sortedPlots.sort();
  field.plotIndexes = sortedPlots;
  field.save();

  // Decrements the sender's unharvestable/harvestable and adds the same values to the receiver's field.
  // No need to shift beanstalk field, only the farmer fields.
  updateFieldTotals(
    protocol,
    params.from,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI.minus(params.amount),
    ZERO_BI.minus(transferredHarvestable),
    ZERO_BI,
    params.event.block,
    fieldId,
    false
  );
  updateFieldTotals(
    protocol,
    params.to,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    params.amount,
    transferredHarvestable,
    ZERO_BI,
    params.event.block,
    fieldId,
    false
  );
}

// This function is for handling both the WeatherChange and TemperatureChange events.
// The logic is the same for both, this is intended to accommodate the renamed event and fields.
export function temperatureChanged(params: TemperatureChangedParams): void {
  const protocol = params.event.address;
  const fieldId = params.fieldId;
  let field = loadField(protocol, fieldId);
  field.temperature = field.temperature.plus(toDecimal(params.absChange, 6));

  let seasonEntity = loadSeason(params.season);
  let currentPrice = ZERO_BD;
  if (seasonEntity.price != ZERO_BD) {
    currentPrice = seasonEntity.price;
  } else {
    currentPrice = toDecimal(BeanstalkPrice_priceOnly(params.event.block.number));
  }

  field.realRateOfReturn = ONE_BD.plus(field.temperature.div(BigDecimal.fromString("100"))).div(currentPrice);

  field.cultivationTemperature = calculateCultivationTemperature(params.caseId, field);

  takeFieldSnapshots(field, params.event.block);
  field.save();

  // Set caseId on the hourly snapshot
  setFieldHourlyCaseId(params.caseId, field);
}

// Harvestable pods are removed from field.unharvestablePods and harvested pods are removed from field.harvestablePods
export function updateFieldTotals(
  protocol: Address,
  account: Address,
  soil: BigInt,
  sownBeans: BigInt,
  sownPods: BigInt,
  transferredPods: BigInt,
  harvestablePods: BigInt,
  harvestedPods: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI,
  recurs: boolean = true
): void {
  if (recurs && account != protocol) {
    updateFieldTotals(
      protocol,
      protocol,
      soil,
      sownBeans,
      sownPods,
      transferredPods,
      harvestablePods,
      harvestedPods,
      block,
      fieldId
    );
  }
  let field = loadField(account, fieldId);

  field.season = getCurrentSeason();
  field.sownBeans = field.sownBeans.plus(sownBeans);
  field.unharvestablePods = field.unharvestablePods.plus(sownPods).minus(harvestablePods).plus(transferredPods);
  field.harvestablePods = field.harvestablePods.plus(harvestablePods).minus(harvestedPods);
  field.harvestedPods = field.harvestedPods.plus(harvestedPods);
  if (account == protocol) {
    field.soil = field.soil.plus(soil);
    field.podIndex = field.podIndex.plus(sownPods);
  }

  takeFieldSnapshots(field, block);
  field.save();

  // Set extra info on the hourly snapshot
  if (account == protocol && field.soil == ZERO_BI && sownBeans > ZERO_BI) {
    setHourlySoilSoldOut(block.number, field);
  }
}

export function updateHarvestablePlots(
  protocol: Address,
  harvestableIndex: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI
): void {
  let field = loadField(protocol, fieldId);
  let sortedIndexes = field.plotIndexes.sort();

  for (let i = 0; i < sortedIndexes.length; i++) {
    if (sortedIndexes[i] > harvestableIndex) {
      break;
    }
    let plot = loadPlot(protocol, sortedIndexes[i], fieldId);

    // Plot is fully harvestable, but hasn't been harvested yet
    if (plot.harvestablePods == plot.pods) {
      continue;
    }

    let harvestablePods = harvestableIndex.minus(plot.index);
    let oldHarvestablePods = plot.harvestablePods;
    plot.harvestablePods = harvestablePods >= plot.pods ? plot.pods : harvestablePods;
    plot.save();

    let deltaHarvestablePods =
      oldHarvestablePods == ZERO_BI ? plot.harvestablePods : plot.harvestablePods.minus(oldHarvestablePods);

    updateFieldTotals(
      protocol,
      toAddress(plot.farmer),
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      deltaHarvestablePods,
      ZERO_BI,
      block,
      fieldId
    );
  }
}

// Increment number of unique sowers (protocol only)
function incrementSowers(protocol: Address, block: ethereum.Block, fieldId: BigInt = ZERO_BI): void {
  let field = loadField(protocol, fieldId);
  field.numberOfSowers += 1;
  takeFieldSnapshots(field, block);
  field.save();
}

// Increment total number of sows for either an account or the protocol
function incrementSows(
  protocol: Address,
  account: Address,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI,
  recurs: boolean = true
): void {
  if (recurs && account != protocol) {
    incrementSows(protocol, protocol, block, fieldId);
  }

  let field = loadField(account, fieldId);
  field.numberOfSows += 1;
  takeFieldSnapshots(field, block);
  field.save();

  // Add to protocol numberOfSowers if this is the first time this account has sown
  if (account != protocol && field.numberOfSows == 1) {
    incrementSowers(protocol, block, fieldId);
  }
}
