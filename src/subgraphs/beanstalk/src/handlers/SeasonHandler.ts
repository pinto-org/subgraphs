import { BigInt } from "@graphprotocol/graph-ts";
import {
  Soil,
  WellOracle,
  Sunrise,
  Incentivization,
  Receipt,
  Shipped,
  SeasonOfPlentyField,
  SeasonOfPlentyWell
} from "../../generated/Beanstalk-ABIs/PintoPI8";
import { toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { getCurrentSeason, loadBeanstalk, loadSeason } from "../entities/Beanstalk";
import { getBeanstalkPrice } from "../utils/contracts/BeanstalkPrice";
import { takeFieldSnapshots } from "../entities/snapshots/Field";
import { loadField } from "../entities/Field";
import { updateBeanEMA } from "../utils/Yield";
import { updateExpiredPlots } from "../utils/Marketplace";
import { updateHarvestablePlots } from "../utils/Field";
import { plentyWell, siloReceipt, sunrise } from "../utils/Season";
import { isGaugeDeployed, isReplanted } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";
import { Beanstalk_harvestableIndex, Beanstalk_isRaining } from "../utils/contracts/Beanstalk";
import { updateAllWrappedDeposits } from "../utils/WrappedSilo";

export function handleSunrise(event: Sunrise): void {
  sunrise(event.address, event.params.season, event.block);
}

// Overall reward mint
export function handleShipped(event: Shipped): void {
  let season = loadSeason(event.params.season);
  season.rewardBeans = event.params.shipmentAmount;
  season.save();
}

// Reward mint to each shipment
export function handleReceipt(event: Receipt): void {
  if (event.params.recipient == 1) {
    siloReceipt(event.params.receivedAmount, event.block);
  }
}

export function handleWellOracle(event: WellOracle): void {
  let season = loadSeason(event.params.season);
  season.deltaB = season.deltaB.plus(event.params.deltaB);
  if (isGaugeDeployed(v(), event.block.number) && season.price == ZERO_BD) {
    let beanstalkPrice = getBeanstalkPrice(event.block.number);
    let beanstalkQuery = beanstalkPrice.price();
    season.price = toDecimal(beanstalkQuery.price);
  }
  season.save();
}

export function handleSoil(event: Soil): void {
  let field = loadField(event.address);
  field.season = event.params.season.toI32();
  field.soil = event.params.soil;

  takeFieldSnapshots(field, event.block);
  field.save();

  // Pintostalk subgraph does not calculate any apys. They are instead found in the api.
  if (isReplanted(v(), event.block.number) && v().subgraphName == "beanstalk") {
    updateBeanEMA(event.address, event.block.timestamp);
  }
}

export function handlePlentyField(event: SeasonOfPlentyField): void {
  const season = loadSeason(BigInt.fromU32(getCurrentSeason()));
  season.floodFieldBeans = event.params.toField;
  season.save();
}

export function handlePlentyWell(event: SeasonOfPlentyWell): void {
  plentyWell(event.params.token, event.params.amount);
}

// This is the final function to be called during sunrise both pre and post replant
export function handleIncentive(event: Incentivization): void {
  // Update market cap for season
  let beanstalk = loadBeanstalk();
  let season = loadSeason(BigInt.fromI32(beanstalk.lastSeason));

  season.marketCap = season.price.times(toDecimal(season.beans));
  season.incentiveBeans = event.params.beans;
  season.raining = Beanstalk_isRaining();
  season.save();

  let field = loadField(v().protocolAddress);
  field.harvestableIndex = Beanstalk_harvestableIndex(ZERO_BI);
  takeFieldSnapshots(field, event.block);
  field.save();

  updateExpiredPlots(field.harvestableIndex, event.block);
  updateHarvestablePlots(event.address, field.harvestableIndex, event.block);

  updateAllWrappedDeposits(event.block);
}
