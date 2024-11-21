import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  FundFundraiser,
  Harvest,
  PlotTransfer,
  Sow,
  SupplyDecrease,
  SupplyIncrease,
  SupplyNeutral,
  WeatherChange
} from "../generated/Beanstalk-ABIs/PreReplant";
import { Harvest as HarvestEntity } from "../generated/schema";
import { BEANSTALK, BEANSTALK_FARMS } from "../../../core/utils/Constants";
import { BI_10, ZERO_BI } from "../../../core/utils/Decimals";
import { loadFarmer } from "./utils/Farmer";
import { handleRateChange, loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { loadPlot } from "./utils/Plot";
import { savePodTransfer } from "./utils/PodTransfer";
import { getCurrentSeason, getHarvestableIndex, loadSeason } from "./utils/Season";
import { loadBeanstalk } from "./utils/Beanstalk";
import { expirePodListingIfExists } from "./utils/PodListing";

export function handleWeatherChange(event: WeatherChange): void {
  handleRateChange(event.address, event.block, event.params.season, event.params.caseId, event.params.change);
}

export function handleSow(event: Sow): void {
  let beanstalk = loadBeanstalk(event.address);

  let sownBeans = event.params.beans;

  if (event.params.account == BEANSTALK_FARMS) {
    let startingField = loadField(event.address);
    sownBeans = startingField.soil;
  }

  // Update Beanstalk Totals
  updateFieldTotals(
    event.address,
    beanstalk.lastSeason,
    ZERO_BI,
    sownBeans,
    event.params.pods,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  // Update Farmer Totals
  updateFieldTotals(
    event.params.account,
    beanstalk.lastSeason,
    ZERO_BI,
    sownBeans,
    event.params.pods,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  let field = loadField(event.address);
  loadFarmer(event.params.account);
  let plot = loadPlot(event.address, event.params.index);

  let newIndexes = field.plotIndexes;
  newIndexes.push(plot.index);
  field.plotIndexes = newIndexes;
  field.save();

  plot.farmer = event.params.account.toHexString();
  plot.source = "SOW";
  plot.sourceHash = event.transaction.hash.toHexString();
  plot.season = field.season;
  plot.creationHash = event.transaction.hash.toHexString();
  plot.createdAt = event.block.timestamp;
  plot.updatedAt = event.block.timestamp;
  plot.updatedAtBlock = event.block.number;
  plot.pods = event.params.pods;
  plot.beansPerPod = event.params.beans.times(BI_10.pow(6)).div(plot.pods);
  plot.save();

  // Increment protocol amounts
  incrementSows(event.address, field.season, event.block.timestamp);

  // Increment farmer amounts
  incrementSows(event.params.account, field.season, event.block.timestamp);
}

export function handleHarvest(event: Harvest): void {
  let beanstalk = loadBeanstalk(event.address);
  let season = loadSeason(event.address, BigInt.fromI32(beanstalk.lastSeason));

  // Harvest function is only called with a list of plots

  // Update plots and field totals

  let remainingIndex = ZERO_BI;

  for (let i = 0; i < event.params.plots.length; i++) {
    // Plot should exist
    let plot = loadPlot(event.address, event.params.plots[i]);

    expirePodListingIfExists(event.address, plot.farmer, plot.index, event.block.timestamp);

    let harvestablePods = season.harvestableIndex.minus(plot.index);

    if (harvestablePods >= plot.pods) {
      // Plot fully harvests
      updateFieldTotals(
        event.address,
        beanstalk.lastSeason,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        plot.pods,
        event.block.timestamp,
        event.block.number
      );
      updateFieldTotals(
        event.params.account,
        beanstalk.lastSeason,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        plot.pods,
        event.block.timestamp,
        event.block.number
      );

      plot.harvestedPods = plot.pods;
      plot.fullyHarvested = true;
      plot.save();
    } else {
      // Plot partially harvests

      updateFieldTotals(
        event.address,
        beanstalk.lastSeason,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        harvestablePods,
        event.block.timestamp,
        event.block.number
      );
      updateFieldTotals(
        event.params.account,
        beanstalk.lastSeason,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        ZERO_BI,
        harvestablePods,
        event.block.timestamp,
        event.block.number
      );

      remainingIndex = plot.index.plus(harvestablePods);
      let remainingPods = plot.pods.minus(harvestablePods);

      let remainingPlot = loadPlot(event.address, remainingIndex);
      remainingPlot.farmer = plot.farmer;
      remainingPlot.source = plot.source;
      remainingPlot.sourceHash = plot.sourceHash;
      remainingPlot.season = beanstalk.lastSeason;
      remainingPlot.creationHash = event.transaction.hash.toHexString();
      remainingPlot.createdAt = event.block.timestamp;
      remainingPlot.updatedAt = event.block.timestamp;
      remainingPlot.updatedAtBlock = event.block.number;
      remainingPlot.index = remainingIndex;
      remainingPlot.pods = remainingPods;
      remainingPlot.beansPerPod = plot.beansPerPod;
      remainingPlot.save();

      plot.harvestedPods = harvestablePods;
      plot.pods = harvestablePods;
      plot.fullyHarvested = true;
      plot.save();
    }
  }

  // Remove the harvested plot IDs from the field list
  let field = loadField(event.address);
  let newIndexes = field.plotIndexes;
  for (let i = 0; i < event.params.plots.length; i++) {
    let plotIndex = newIndexes.indexOf(event.params.plots[i]);
    newIndexes.splice(plotIndex, 1);
    newIndexes.sort();
  }
  if (remainingIndex !== ZERO_BI) {
    newIndexes.push(remainingIndex);
  }
  field.plotIndexes = newIndexes;
  field.save();

  // Save the low level details for the event.
  let harvest = new HarvestEntity(
    "harvest-" + event.transaction.hash.toHexString() + "-" + event.transactionLogIndex.toString()
  );
  harvest.hash = event.transaction.hash.toHexString();
  harvest.logIndex = event.transactionLogIndex.toI32();
  harvest.protocol = event.address.toHexString();
  harvest.farmer = event.params.account.toHexString();
  harvest.plots = event.params.plots;
  harvest.beans = event.params.beans;
  harvest.blockNumber = event.block.number;
  harvest.createdAt = event.block.timestamp;
  harvest.save();
}

export function handlePlotTransfer(event: PlotTransfer): void {
  const currentSeason = getCurrentSeason(event.address);
  const currentHarvestable = getHarvestableIndex(event.address);

  // Ensure both farmer entites exist
  loadFarmer(event.params.from);
  loadFarmer(event.params.to);

  // Update farmer field data
  updateFieldTotals(
    event.params.from,
    currentSeason,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI.minus(event.params.pods),
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
  updateFieldTotals(
    event.params.to,
    currentSeason,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.params.pods,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );

  let field = loadField(BEANSTALK);
  let sortedPlots = field.plotIndexes.sort();

  let sourceIndex = ZERO_BI;

  for (let i = 0; i < sortedPlots.length; i++) {
    // Handle only single comparison for first value of array
    if (i == 0) {
      if (sortedPlots[i] == event.params.id) {
        sourceIndex = sortedPlots[i];
        break;
      } else {
        continue;
      }
    }
    // Transferred plot matches existing. Start value of zero.
    if (sortedPlots[i] == event.params.id) {
      sourceIndex = sortedPlots[i];
      break;
    }
    // Transferred plot is in the middle of existing plot. Non-zero start value.
    if (sortedPlots[i - 1] < event.params.id && event.params.id < sortedPlots[i]) {
      sourceIndex = sortedPlots[i - 1];
    }
  }

  let sourcePlot = loadPlot(event.address, sourceIndex);
  let sourceEndIndex = sourceIndex.plus(sourcePlot.pods);
  let transferEndIndex = event.params.id.plus(event.params.pods);

  // Determines how many of the pods being transferred are harvestable
  const calcHarvestable = (index: BigInt, pods: BigInt, harvestableIndex: BigInt): BigInt => {
    let harvestable = harvestableIndex.minus(index);
    if (harvestable < ZERO_BI) {
      return ZERO_BI;
    } else {
      return harvestable >= pods ? pods : harvestable;
    }
  };

  let transferredHarvestable = calcHarvestable(event.params.id, event.params.pods, currentHarvestable);

  // log.debug("\nPodTransfer: ===================\n", []);
  // log.debug("\nPodTransfer: Transfer Season - {}\n", [field.season.toString()]);
  // log.debug("\nPodTransfer: Transfer Index - {}\n", [event.params.id.toString()]);
  // log.debug("\nPodTransfer: Transfer Pods - {}\n", [event.params.pods.toString()]);
  // log.debug("\nPodTransfer: Transfer Harvestable Pods - {}\n", [transferredHarvestable.toString()]);
  // log.debug("\nPodTransfer: Transfer Ending Index - {}\n", [event.params.id.plus(event.params.pods).toString()]);
  // log.debug("\nPodTransfer: Source Index - {}\n", [sourceIndex.toString()]);
  // log.debug("\nPodTransfer: Source Ending Index - {}\n", [sourceIndex.plus(sourcePlot.pods).toString()]);
  // log.debug("\nPodTransfer: Source Harvestable Pods - {}\n", [sourcePlot.harvestablePods.toString()]);
  // log.debug("\nPodTransfer: Starting Source Pods - {}\n", [sourcePlot.pods.toString()]);

  // Actually transfer the plots
  if (sourcePlot.pods == event.params.pods) {
    // Sending full plot
    const isMarket = sourcePlot.source == "MARKET" && sourcePlot.sourceHash == event.transaction.hash.toHexString();
    if (!isMarket) {
      sourcePlot.source = "TRANSFER";
      sourcePlot.sourceHash = event.transaction.hash.toHexString();
      sourcePlot.beansPerPod = sourcePlot.beansPerPod;
    }
    sourcePlot.farmer = event.params.to.toHexString();
    sourcePlot.updatedAt = event.block.timestamp;
    sourcePlot.updatedAtBlock = event.block.number;
    sourcePlot.save();
    // log.debug("\nPodTransfer: Sending full plot\n", []);
  } else if (sourceIndex == event.params.id) {
    // We are only needing to split this plot once to send
    // Start value of zero
    let remainderIndex = sourceIndex.plus(event.params.pods);
    let remainderPlot = loadPlot(event.address, remainderIndex);
    sortedPlots.push(remainderIndex);

    const isMarket = sourcePlot.source == "MARKET" && sourcePlot.sourceHash == event.transaction.hash.toHexString();
    if (!isMarket) {
      // When sending the start of the plot via market, these cannot be derived from sourcePlot.
      remainderPlot.source = sourcePlot.source;
      remainderPlot.sourceHash = sourcePlot.sourceHash;
      remainderPlot.beansPerPod = sourcePlot.beansPerPod;

      sourcePlot.source = "TRANSFER";
      sourcePlot.sourceHash = event.transaction.hash.toHexString();
      sourcePlot.beansPerPod = sourcePlot.beansPerPod;
    }
    sourcePlot.farmer = event.params.to.toHexString();
    sourcePlot.updatedAt = event.block.timestamp;
    sourcePlot.updatedAtBlock = event.block.number;
    sourcePlot.pods = event.params.pods;
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    remainderPlot.farmer = event.params.from.toHexString();
    remainderPlot.season = field.season;
    remainderPlot.creationHash = event.transaction.hash.toHexString();
    remainderPlot.createdAt = event.block.timestamp;
    remainderPlot.updatedAt = event.block.timestamp;
    remainderPlot.updatedAtBlock = event.block.number;
    remainderPlot.index = remainderIndex;
    remainderPlot.pods = sourceEndIndex.minus(transferEndIndex);
    remainderPlot.harvestablePods = calcHarvestable(remainderPlot.index, remainderPlot.pods, currentHarvestable);
    remainderPlot.save();

    // log.debug("\nPodTransfer: sourceIndex == transferIndex\n", []);
    // log.debug("\nPodTransfer: Remainder Index - {}\n", [remainderIndex.toString()]);
    // log.debug("\nPodTransfer: Source Pods - {}\n", [sourcePlot.pods.toString()]);
    // log.debug("\nPodTransfer: Remainder Pods - {}\n", [remainderPlot.pods.toString()]);
  } else if (sourceEndIndex == transferEndIndex) {
    // We are only needing to split this plot once to send
    // Non-zero start value. Sending to end of plot
    let toPlot = loadPlot(event.address, event.params.id);
    sortedPlots.push(event.params.id);

    sourcePlot.updatedAt = event.block.timestamp;
    sourcePlot.updatedAtBlock = event.block.number;
    sourcePlot.pods = sourcePlot.pods.minus(event.params.pods);
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    const isMarket = toPlot.source == "MARKET" && toPlot.sourceHash == event.transaction.hash.toHexString();
    if (!isMarket) {
      toPlot.source = "TRANSFER";
      toPlot.sourceHash = event.transaction.hash.toHexString();
      toPlot.beansPerPod = sourcePlot.beansPerPod;
    }
    toPlot.farmer = event.params.to.toHexString();
    toPlot.season = field.season;
    toPlot.creationHash = event.transaction.hash.toHexString();
    toPlot.createdAt = event.block.timestamp;
    toPlot.updatedAt = event.block.timestamp;
    toPlot.updatedAtBlock = event.block.number;
    toPlot.index = event.params.id;
    toPlot.pods = event.params.pods;
    toPlot.harvestablePods = calcHarvestable(toPlot.index, toPlot.pods, currentHarvestable);
    toPlot.save();

    // log.debug("\nPodTransfer: sourceEndIndex == transferEndIndex\n", []);
    // log.debug("\nPodTransfer: Updated Source Pods - {}\n", [sourcePlot.pods.toString()]);
  } else {
    // We have to split this plot twice to send
    let remainderIndex = event.params.id.plus(event.params.pods);
    let toPlot = loadPlot(event.address, event.params.id);
    let remainderPlot = loadPlot(event.address, remainderIndex);

    sortedPlots.push(event.params.id);
    sortedPlots.push(remainderIndex);

    sourcePlot.updatedAt = event.block.timestamp;
    sourcePlot.updatedAtBlock = event.block.number;
    sourcePlot.pods = event.params.id.minus(sourcePlot.index);
    sourcePlot.harvestablePods = calcHarvestable(sourcePlot.index, sourcePlot.pods, currentHarvestable);
    sourcePlot.save();

    const isMarket = toPlot.source == "MARKET" && toPlot.sourceHash == event.transaction.hash.toHexString();
    if (!isMarket) {
      toPlot.source = "TRANSFER";
      toPlot.sourceHash = event.transaction.hash.toHexString();
      toPlot.beansPerPod = sourcePlot.beansPerPod;
    }
    toPlot.farmer = event.params.to.toHexString();
    toPlot.season = field.season;
    toPlot.creationHash = event.transaction.hash.toHexString();
    toPlot.createdAt = event.block.timestamp;
    toPlot.updatedAt = event.block.timestamp;
    toPlot.updatedAtBlock = event.block.number;
    toPlot.index = event.params.id;
    toPlot.pods = event.params.pods;
    toPlot.harvestablePods = calcHarvestable(toPlot.index, toPlot.pods, currentHarvestable);
    toPlot.save();

    remainderPlot.farmer = event.params.from.toHexString();
    remainderPlot.source = sourcePlot.source;
    remainderPlot.sourceHash = sourcePlot.sourceHash;
    remainderPlot.season = field.season;
    remainderPlot.creationHash = event.transaction.hash.toHexString();
    remainderPlot.createdAt = event.block.timestamp;
    remainderPlot.updatedAt = event.block.timestamp;
    remainderPlot.updatedAtBlock = event.block.number;
    remainderPlot.index = remainderIndex;
    remainderPlot.pods = sourceEndIndex.minus(transferEndIndex);
    remainderPlot.harvestablePods = calcHarvestable(remainderPlot.index, remainderPlot.pods, currentHarvestable);
    remainderPlot.beansPerPod = sourcePlot.beansPerPod;
    remainderPlot.save();

    // log.debug("\nPodTransfer: split source twice\n", []);
    // log.debug("\nPodTransfer: Updated Source Pods - {}\n", [sourcePlot.pods.toString()]);
    // log.debug("\nPodTransfer: Transferred Pods - {}\n", [toPlot.pods.toString()]);
    // log.debug("\nPodTransfer: Remainder Pods - {}\n", [remainderPlot.pods.toString()]);
  }
  sortedPlots.sort();
  field.plotIndexes = sortedPlots;
  field.save();

  // Update any harvestable pod amounts
  // No need to shift beanstalk field, only the farmer fields.
  if (transferredHarvestable != ZERO_BI) {
    updateFieldTotals(
      event.params.from,
      currentSeason,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI.minus(transferredHarvestable),
      ZERO_BI,
      event.block.timestamp,
      event.block.number
    );
    updateFieldTotals(
      event.params.to,
      currentSeason,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      transferredHarvestable,
      ZERO_BI,
      event.block.timestamp,
      event.block.number
    );
  }

  // Save the raw event data
  savePodTransfer(event);
}

export function handleSupplyIncrease(event: SupplyIncrease): void {
  updateFieldTotals(
    event.address,
    event.params.season.toI32(),
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

export function handleSupplyDecrease(event: SupplyDecrease): void {
  updateFieldTotals(
    event.address,
    event.params.season.toI32(),
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

export function handleSupplyNeutral(event: SupplyNeutral): void {
  updateFieldTotals(
    event.address,
    event.params.season.toI32(),
    event.params.newSoil,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    ZERO_BI,
    event.block.timestamp,
    event.block.number
  );
}

function updateFieldTotals(
  account: Address,
  season: i32,
  soil: BigInt,
  sownBeans: BigInt,
  sownPods: BigInt,
  transferredPods: BigInt,
  harvestablePods: BigInt,
  harvestedPods: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, season, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  field.season = season;
  field.soil = field.soil.plus(soil).minus(sownBeans);
  field.sownBeans = field.sownBeans.plus(sownBeans);
  field.unharvestablePods = field.unharvestablePods.plus(sownPods).minus(harvestablePods).plus(transferredPods);
  field.harvestablePods = field.harvestablePods.plus(harvestablePods);
  field.harvestedPods = field.harvestedPods.plus(harvestedPods);
  field.podIndex = field.podIndex.plus(sownPods);
  field.save();

  fieldHourly.soil = field.soil;
  fieldHourly.sownBeans = field.sownBeans;
  fieldHourly.unharvestablePods = field.unharvestablePods;
  fieldHourly.harvestablePods = field.harvestablePods;
  fieldHourly.harvestedPods = field.harvestedPods;
  fieldHourly.podIndex = field.podIndex;
  fieldHourly.issuedSoil = fieldHourly.issuedSoil.plus(soil);
  fieldHourly.deltaSownBeans = fieldHourly.deltaSownBeans.plus(sownBeans);
  fieldHourly.deltaUnharvestablePods = fieldHourly.deltaUnharvestablePods
    .plus(sownPods)
    .minus(harvestablePods)
    .plus(transferredPods);
  fieldHourly.deltaHarvestablePods = fieldHourly.deltaHarvestablePods.plus(harvestablePods);
  fieldHourly.deltaHarvestedPods = fieldHourly.deltaHarvestedPods.plus(harvestedPods);
  fieldHourly.blockNumber = fieldHourly.blockNumber == ZERO_BI ? blockNumber : fieldHourly.blockNumber;
  fieldHourly.updatedAt = timestamp;
  if (field.soil == ZERO_BI) {
    fieldHourly.blocksToSoldOutSoil = blockNumber.minus(fieldHourly.blockNumber);
    fieldHourly.soilSoldOut = true;
  }
  fieldHourly.save();

  fieldDaily.soil = field.soil;
  fieldDaily.sownBeans = field.sownBeans;
  fieldDaily.unharvestablePods = field.unharvestablePods;
  fieldDaily.harvestablePods = field.harvestablePods;
  fieldDaily.harvestedPods = field.harvestedPods;
  fieldDaily.podIndex = field.podIndex;
  fieldDaily.issuedSoil = fieldDaily.issuedSoil.plus(soil);
  fieldDaily.deltaSownBeans = fieldDaily.deltaSownBeans.plus(sownBeans);
  fieldDaily.deltaUnharvestablePods = fieldDaily.deltaUnharvestablePods
    .plus(sownPods)
    .minus(harvestablePods)
    .plus(transferredPods);
  fieldDaily.deltaHarvestablePods = fieldDaily.deltaHarvestablePods.plus(harvestablePods);
  fieldDaily.deltaHarvestedPods = fieldDaily.deltaHarvestedPods.plus(harvestedPods);
  fieldDaily.updatedAt = timestamp;
  fieldDaily.save();
}

export function updateHarvestablePlots(harvestableIndex: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
  let field = loadField(BEANSTALK);
  let sortedIndexes = field.plotIndexes.sort();

  for (let i = 0; i < sortedIndexes.length; i++) {
    if (sortedIndexes[i] > harvestableIndex) {
      break;
    }
    let plot = loadPlot(BEANSTALK, sortedIndexes[i]);

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
      BEANSTALK,
      field.season,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      deltaHarvestablePods,
      ZERO_BI,
      timestamp,
      blockNumber
    );
    updateFieldTotals(
      Address.fromString(plot.farmer),
      field.season,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      ZERO_BI,
      deltaHarvestablePods,
      ZERO_BI,
      timestamp,
      blockNumber
    );
  }
}

function incrementSowers(account: Address, season: i32, timestamp: BigInt): void {
  // Increment total number of sowers by one
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, season, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  field.numberOfSowers += 1;
  field.save();

  fieldHourly.numberOfSowers = field.numberOfSowers;
  fieldHourly.deltaNumberOfSowers += 1;
  fieldHourly.save();

  fieldDaily.numberOfSowers = field.numberOfSowers;
  fieldDaily.deltaNumberOfSowers += 1;
  fieldDaily.save();
}

function incrementSows(account: Address, season: i32, timestamp: BigInt): void {
  // Increment total sows by one
  let field = loadField(account);
  let fieldHourly = loadFieldHourly(account, season, timestamp);
  let fieldDaily = loadFieldDaily(account, timestamp);

  // Add to protocol numberOfSowers if needed
  if (account != BEANSTALK && field.numberOfSows == 0) incrementSowers(BEANSTALK, season, timestamp);

  // Update sower counts
  field.numberOfSows += 1;
  field.save();

  fieldHourly.numberOfSows = field.numberOfSows;
  fieldHourly.deltaNumberOfSows += 1;
  fieldHourly.save();

  fieldDaily.numberOfSows = field.numberOfSows;
  fieldDaily.deltaNumberOfSows += 1;
  fieldDaily.save();
}