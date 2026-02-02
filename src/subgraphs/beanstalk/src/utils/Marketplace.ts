import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { getPlotEntityId, loadField, loadPlot } from "../entities/Field";
import { BI_10, ZERO_BI } from "../../../../core/utils/Decimals";
import { loadPodFill, loadPodMarketplace } from "../entities/PodMarketplace";
import { createHistoricalPodOrder, loadPodOrder } from "../entities/PodMarketplace";
import { createHistoricalPodListing, loadPodListing, getPodListingEntityId } from "../entities/PodMarketplace";
import {
  Plot,
  PodListing,
  PodListingCreated as PodListingCreatedEvent,
  PodListingFilled as PodListingFilledEvent,
  PodListingCancelled as PodListingCancelledEvent,
  PodOrderCreated as PodOrderCreatedEvent,
  PodOrderFilled as PodOrderFilledEvent,
  PodOrderCancelled as PodOrderCancelledEvent,
  PodOrder
} from "../../generated/schema";
import { getHarvestableIndex, loadFarmer } from "../entities/Beanstalk";
import { takeMarketSnapshots } from "../entities/snapshots/Marketplace";
import { toAddress } from "../../../../core/utils/Bytes";

export enum MarketplaceAction {
  CREATED,
  FILLED_PARTIAL,
  FILLED_FULL,
  CANCELLED,
  EXPIRED
}

class PodListingCreatedParams {
  event: ethereum.Event;
  account: Address;
  fieldId: BigInt = ZERO_BI;
  index: BigInt;
  start: BigInt;
  amount: BigInt;
  pricePerPod: i32;
  maxHarvestableIndex: BigInt;
  mode: i32; // in v1, its called toWallet
  // v2
  minFillAmount: BigInt; // for v1, always 0
  pricingFunction: Bytes | null;
  pricingType: i32; // for v1 or v3, always 0
}

class PodListingCancelledParams {
  event: ethereum.Event;
  account: Address;
  fieldId: BigInt = ZERO_BI;
  index: BigInt;
}

class PodOrderCreatedParams {
  event: ethereum.Event;
  account: Address;
  fieldId: BigInt = ZERO_BI;
  id: Bytes;
  beanAmount: BigInt;
  pricePerPod: i32;
  maxPlaceInLine: BigInt;
  // v2
  minFillAmount: BigInt; // for v1, always 0
  pricingFunction: Bytes | null;
  pricingType: i32; // for v1 or v3, always 0
}

class PodOrderCancelledParams {
  event: ethereum.Event;
  account: Address;
  id: Bytes;
}

// This one is the same for both listing/order fills.
class MarketFillParams {
  event: ethereum.Event;
  from: Address;
  to: Address;
  fieldId: BigInt = ZERO_BI;
  id: Bytes | null; // For pod order
  index: BigInt;
  start: BigInt;
  amount: BigInt;
  // v2; for v1, it can be computed and provided that way
  costInBeans: BigInt;
}

export function podListingCreated(params: PodListingCreatedParams): void {
  const fieldId = params.fieldId;
  const plotId = getPlotEntityId(params.index, fieldId);
  let plot = Plot.load(plotId);
  if (plot == null) {
    return;
  }
  loadFarmer(params.account, params.event.block);

  /// Upsert PodListing
  let listing = loadPodListing(params.account, params.index, params.fieldId);
  if (listing.createdAt !== ZERO_BI) {
    // Re-listed prior plot with new info
    createHistoricalPodListing(listing);
    listing.fill = null;
    listing.filled = ZERO_BI;
    listing.filledAmount = ZERO_BI;
  }

  listing.historyID =
    listing.id + "-" + params.event.block.timestamp.toString() + "-" + params.event.logIndex.toString();
  listing.plot = plot.id;
  listing.fieldId = fieldId;
  listing.podMarketplace = fieldId.toString();

  listing.start = params.start;
  listing.mode = params.mode;

  listing.minFillAmount = params.minFillAmount;
  listing.maxHarvestableIndex = params.maxHarvestableIndex;

  listing.pricingType = params.pricingType;
  listing.pricePerPod = params.pricePerPod;
  listing.pricingFunction = params.pricingFunction;

  listing.originalIndex = params.index;
  listing.originalPlaceInLine = params.index.plus(params.start).minus(getHarvestableIndex());
  listing.originalAmount = params.amount;

  listing.amount = params.amount;
  listing.remainingAmount = listing.originalAmount;

  listing.status = "ACTIVE";
  listing.createdAt = params.event.block.timestamp;
  listing.updatedAt = params.event.block.timestamp;
  listing.creationHash = params.event.transaction.hash;

  listing.save();

  /// Update plot
  plot.listing = listing.id;
  plot.save();

  /// Update market totals
  updateActiveListings(
    MarketplaceAction.CREATED,
    params.account.toHexString(),
    listing.index,
    listing.maxHarvestableIndex,
    fieldId
  );
  updateMarketListingBalances(params.amount, ZERO_BI, ZERO_BI, ZERO_BI, params.event.block, fieldId);

  /// Save  raw event data
  let id = "podListingCreated-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
  let rawEvent = new PodListingCreatedEvent(id);
  rawEvent.hash = params.event.transaction.hash;
  rawEvent.logIndex = params.event.logIndex.toI32();
  rawEvent.historyID = listing.historyID;
  rawEvent.account = params.account;
  rawEvent.placeInLine = listing.originalPlaceInLine;
  rawEvent.index = params.index;
  rawEvent.start = params.start;
  rawEvent.amount = params.amount;
  rawEvent.pricePerPod = params.pricePerPod;
  rawEvent.maxHarvestableIndex = params.maxHarvestableIndex;
  rawEvent.minFillAmount = params.minFillAmount;
  rawEvent.mode = params.mode;
  rawEvent.pricingFunction = params.pricingFunction;
  rawEvent.pricingType = params.pricingType;
  rawEvent.blockNumber = params.event.block.number;
  rawEvent.createdAt = params.event.block.timestamp;
  rawEvent.save();
}

export function podListingFilled(params: MarketFillParams): void {
  const fieldId = params.fieldId;
  let listing = loadPodListing(params.from, params.index, fieldId);
  loadFarmer(params.to, params.event.block);

  updateMarketListingBalances(ZERO_BI, ZERO_BI, params.amount, params.costInBeans, params.event.block, fieldId);

  listing.filledAmount = params.amount;
  listing.remainingAmount = listing.remainingAmount.minus(params.amount);
  listing.filled = listing.filled.plus(params.amount);
  listing.updatedAt = params.event.block.timestamp;

  let originalHistoryID = listing.historyID;
  if (listing.remainingAmount == ZERO_BI) {
    listing.status = "FILLED";
    updateActiveListings(
      MarketplaceAction.FILLED_FULL,
      params.from.toHexString(),
      listing.index,
      listing.maxHarvestableIndex,
      fieldId
    );
  } else {
    listing.status = "FILLED_PARTIAL";

    const remainingIndex = listing.index.plus(params.amount).plus(listing.start);
    let remainingListing = loadPodListing(toAddress(listing.farmer), remainingIndex, fieldId);
    remainingListing.historyID =
      remainingListing.id + "-" + params.event.block.timestamp.toString() + "-" + params.event.logIndex.toString();
    remainingListing.plot = getPlotEntityId(remainingIndex, fieldId);
    remainingListing.createdAt = listing.createdAt;
    remainingListing.updatedAt = params.event.block.timestamp;
    remainingListing.originalIndex = listing.originalIndex;
    remainingListing.originalPlaceInLine = listing.originalPlaceInLine;
    remainingListing.start = ZERO_BI;
    remainingListing.amount = listing.remainingAmount;
    remainingListing.originalAmount = listing.originalAmount;
    remainingListing.filled = listing.filled;
    remainingListing.remainingAmount = listing.remainingAmount;
    remainingListing.pricePerPod = listing.pricePerPod;
    remainingListing.maxHarvestableIndex = listing.maxHarvestableIndex;
    remainingListing.mode = listing.mode;
    remainingListing.creationHash = params.event.transaction.hash;
    remainingListing.minFillAmount = listing.minFillAmount;
    remainingListing.save();

    // Process the partial fill on the prev listing, and the new listing
    updateActiveListings(
      MarketplaceAction.FILLED_PARTIAL,
      params.from.toHexString(),
      listing.index,
      listing.maxHarvestableIndex,
      fieldId
    );
    updateActiveListings(
      MarketplaceAction.CREATED,
      params.from.toHexString(),
      remainingListing.index,
      remainingListing.maxHarvestableIndex,
      fieldId
    );
  }

  let fill = loadPodFill(
    params.event.address,
    params.index,
    params.event.transaction.hash.toHexString()
  );
  fill.createdAt = params.event.block.timestamp;
  fill.listing = listing.id;
  fill.fromFarmer = params.from;
  fill.toFarmer = params.to;
  fill.amount = params.amount;
  fill.placeInLine = params.index.plus(params.start).minus(getHarvestableIndex());
  fill.index = params.index;
  fill.start = params.start;
  fill.costInBeans = params.costInBeans;
  fill.save();

  listing.fill = fill.id;
  listing.save();

  setBeansPerPodAfterFill(params.event, fill.index, fill.start, fill.amount, fill.costInBeans, fieldId);

  // Save the raw event data
  let id = "podListingFilled-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
  let rawEvent = new PodListingFilledEvent(id);
  rawEvent.hash = params.event.transaction.hash;
  rawEvent.logIndex = params.event.logIndex.toI32();
  rawEvent.historyID = originalHistoryID;
  rawEvent.fromFarmer = params.from;
  rawEvent.toFarmer = params.to;
  rawEvent.placeInLine = fill.placeInLine;
  rawEvent.index = params.index;
  rawEvent.start = params.start;
  rawEvent.amount = params.amount;
  rawEvent.costInBeans = params.costInBeans;
  rawEvent.blockNumber = params.event.block.number;
  rawEvent.createdAt = params.event.block.timestamp;
  rawEvent.save();
}

export function podListingCancelled(params: PodListingCancelledParams): void {
  let listing = PodListing.load(getPodListingEntityId(params.account, params.index, params.fieldId));
  if (listing !== null && listing.status == "ACTIVE") {
    updateActiveListings(
      MarketplaceAction.CANCELLED,
      params.account.toHexString(),
      listing.index,
      listing.maxHarvestableIndex,
      params.fieldId
    );
    updateMarketListingBalances(ZERO_BI, listing.remainingAmount, ZERO_BI, ZERO_BI, params.event.block, params.fieldId);

    listing.status = listing.filled == ZERO_BI ? "CANCELLED" : "CANCELLED_PARTIAL";
    listing.updatedAt = params.event.block.timestamp;
    listing.save();

    // Save the raw event data
    let id =
      "podListingCancelled-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
    let rawEvent = new PodListingCancelledEvent(id);
    rawEvent.hash = params.event.transaction.hash;
    rawEvent.logIndex = params.event.logIndex.toI32();
    rawEvent.historyID = listing.historyID;
    rawEvent.account = params.account;
    rawEvent.placeInLine = params.index.plus(listing.start).minus(getHarvestableIndex());
    rawEvent.index = params.index;
    rawEvent.blockNumber = params.event.block.number;
    rawEvent.createdAt = params.event.block.timestamp;
    rawEvent.save();
  }
}

export function podOrderCreated(params: PodOrderCreatedParams): void {
  let order = loadPodOrder(params.id);
  loadFarmer(params.account, params.event.block);

  if (order.status != "") {
    createHistoricalPodOrder(order);
  }

  order.historyID = order.id + "-" + params.event.block.timestamp.toString() + "-" + params.event.logIndex.toString();
  order.farmer = params.account;
  order.fieldId = params.fieldId;
  order.podMarketplace = params.fieldId.toString();
  order.createdAt = params.event.block.timestamp;
  order.updatedAt = params.event.block.timestamp;
  order.status = "ACTIVE";
  order.beanAmount = params.beanAmount;
  order.beanAmountFilled = ZERO_BI;
  order.podAmountFilled = ZERO_BI;
  order.minFillAmount = params.minFillAmount;
  order.maxPlaceInLine = params.maxPlaceInLine;
  order.pricePerPod = params.pricePerPod;
  order.pricingFunction = params.pricingFunction;
  order.pricingType = params.pricingType;
  order.creationHash = params.event.transaction.hash;
  order.fills = [];
  order.save();

  updateActiveOrders(MarketplaceAction.CREATED, order.id, order.maxPlaceInLine, params.fieldId);
  updateMarketOrderBalances(params.beanAmount, ZERO_BI, ZERO_BI, ZERO_BI, params.event.block, params.fieldId);

  // Save the raw event data
  let id = "podOrderCreated-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
  let rawEvent = new PodOrderCreatedEvent(id);
  rawEvent.hash = params.event.transaction.hash;
  rawEvent.logIndex = params.event.logIndex.toI32();
  rawEvent.historyID = order.historyID;
  rawEvent.account = params.account;
  rawEvent.orderId = params.id.toHexString();
  rawEvent.amount = params.beanAmount;
  rawEvent.pricePerPod = params.pricePerPod;
  rawEvent.maxPlaceInLine = params.maxPlaceInLine;
  rawEvent.pricingFunction = params.pricingFunction;
  rawEvent.pricingType = params.pricingType;
  rawEvent.blockNumber = params.event.block.number;
  rawEvent.createdAt = params.event.block.timestamp;
  rawEvent.save();
}

export function podOrderFilled(params: MarketFillParams): void {
  let order = loadPodOrder(params.id!);
  let fill = loadPodFill(
    params.event.address,
    params.index,
    params.event.transaction.hash.toHexString()
  );
  loadFarmer(params.to, params.event.block);

  order.updatedAt = params.event.block.timestamp;
  order.beanAmountFilled = order.beanAmountFilled.plus(params.costInBeans);
  order.podAmountFilled = order.podAmountFilled.plus(params.amount);
  order.status = order.beanAmount == order.beanAmountFilled ? "FILLED" : "ACTIVE";
  let newFills = order.fills;
  newFills.push(fill.id);
  order.fills = newFills;
  order.save();

  fill.createdAt = params.event.block.timestamp;
  fill.order = order.id;
  fill.fromFarmer = params.from;
  fill.toFarmer = params.to;
  fill.amount = params.amount;
  fill.placeInLine = params.index.plus(params.start).minus(getHarvestableIndex());
  fill.index = params.index;
  fill.start = params.start;
  fill.costInBeans = params.costInBeans;
  fill.save();

  setBeansPerPodAfterFill(params.event, fill.index, fill.start, fill.amount, fill.costInBeans, params.fieldId);

  if (order.status == "FILLED") {
    updateActiveOrders(MarketplaceAction.FILLED_FULL, order.id, order.maxPlaceInLine, params.fieldId);
  }

  updateMarketOrderBalances(ZERO_BI, ZERO_BI, params.amount, params.costInBeans, params.event.block, params.fieldId);

  // Save the raw event data
  let id = "podOrderFilled-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
  let rawEvent = new PodOrderFilledEvent(id);
  rawEvent.hash = params.event.transaction.hash;
  rawEvent.logIndex = params.event.logIndex.toI32();
  rawEvent.historyID = order.historyID;
  rawEvent.fromFarmer = params.from;
  rawEvent.toFarmer = params.to;
  rawEvent.placeInLine = params.index.plus(params.start).minus(getHarvestableIndex());
  rawEvent.index = params.index;
  rawEvent.start = params.start;
  rawEvent.amount = params.amount;
  rawEvent.costInBeans = params.costInBeans;
  rawEvent.blockNumber = params.event.block.number;
  rawEvent.createdAt = params.event.block.timestamp;
  rawEvent.save();
}

export function podOrderCancelled(params: PodOrderCancelledParams): void {
  let order = PodOrder.load(params.id.toHexString());
  if (order !== null && order.status == "ACTIVE") {
    order.status = order.podAmountFilled == ZERO_BI ? "CANCELLED" : "CANCELLED_PARTIAL";
    order.updatedAt = params.event.block.timestamp;
    order.save();

    updateActiveOrders(MarketplaceAction.CANCELLED, order.id, order.maxPlaceInLine, order.fieldId);
    updateMarketOrderBalances(
      ZERO_BI,
      order.beanAmount.minus(order.beanAmountFilled),
      ZERO_BI,
      ZERO_BI,
      params.event.block,
      order.fieldId
    );

    // Save the raw event data
    let id =
      "podOrderCancelled-" + params.event.transaction.hash.toHexString() + "-" + params.event.logIndex.toString();
    let rawEvent = new PodOrderCancelledEvent(id);
    rawEvent.hash = params.event.transaction.hash;
    rawEvent.logIndex = params.event.logIndex.toI32();
    rawEvent.historyID = order.historyID;
    rawEvent.account = params.account;
    rawEvent.orderId = params.id.toHexString();
    rawEvent.blockNumber = params.event.block.number;
    rawEvent.createdAt = params.event.block.timestamp;
    rawEvent.save();
  }
}

export function updateMarketListingBalances(
  newPodAmount: BigInt,
  cancelledPodAmount: BigInt,
  filledPodAmount: BigInt,
  filledBeanAmount: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI
): void {
  let market = loadPodMarketplace(fieldId);

  const netListingChange = newPodAmount.minus(cancelledPodAmount).minus(filledPodAmount);

  market.listedPods = market.listedPods.plus(newPodAmount);
  market.availableListedPods = market.availableListedPods.plus(netListingChange);
  market.cancelledListedPods = market.cancelledListedPods.plus(cancelledPodAmount);
  market.filledListedPods = market.filledListedPods.plus(filledPodAmount);
  market.podVolume = market.podVolume.plus(filledPodAmount);
  market.beanVolume = market.beanVolume.plus(filledBeanAmount);

  takeMarketSnapshots(market, block);
  market.save();
}

export function updateMarketOrderBalances(
  newBeanAmount: BigInt,
  cancelledBeanAmount: BigInt,
  filledPodAmount: BigInt,
  filledBeanAmount: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI
): void {
  let market = loadPodMarketplace(fieldId);

  const netOrderChange = newBeanAmount.minus(cancelledBeanAmount).minus(filledBeanAmount);

  market.orderBeans = market.orderBeans.plus(newBeanAmount);
  market.availableOrderBeans = market.availableOrderBeans.plus(netOrderChange);
  market.filledOrderedPods = market.filledOrderedPods.plus(filledPodAmount);
  market.filledOrderBeans = market.filledOrderBeans.plus(filledBeanAmount);
  market.podVolume = market.podVolume.plus(filledPodAmount);
  market.beanVolume = market.beanVolume.plus(filledBeanAmount);
  market.cancelledOrderBeans = market.cancelledOrderBeans.plus(cancelledBeanAmount);

  takeMarketSnapshots(market, block);
  market.save();
}

export function updateExpiredPlots(
  harvestableIndex: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI
): void {
  let market = loadPodMarketplace(fieldId);
  let remainingListings = market.activeListings;

  // Cancel any pod marketplace listings beyond the index
  for (let i = 0; i < remainingListings.length; i++) {
    const destructured = remainingListings[i].split("-");
    const maxHarvestableIndex = BigInt.fromString(destructured[2]);
    if (harvestableIndex > maxHarvestableIndex) {
      // This method updates the marketplace entity, so it will perform the splice.
      expirePodListingIfExists(
        Address.fromString(destructured[0]),
        BigInt.fromString(destructured[1]),
        block,
        fieldId,
        i
      );
      // A similar splice is done here also to track the updated index on the underlying array.
      remainingListings.splice(i--, 1);
    }
  }
}

function setBeansPerPodAfterFill(
  event: ethereum.Event,
  plotIndex: BigInt,
  start: BigInt,
  length: BigInt,
  costInBeans: BigInt,
  fieldId: BigInt = ZERO_BI
): void {
  const protocolField = loadField(event.address, fieldId);
  // Load the plot that is being sent. It may or may not have been created already, depending
  // on whether the PlotTransfer event has already been processed (sometims its emitted after the market transfer).
  let fillPlot = loadPlot(event.address, plotIndex.plus(start), fieldId);

  if (start == ZERO_BI && length < fillPlot.pods) {
    // When sending the start of a plot via market, these cannot be set in any subsequent transfer,
    // since the start plot has already been modified.
    let remainderPlot = loadPlot(event.address, plotIndex.plus(length), fieldId);
    // If the transfer event came prior to the market event, no need to assign these again
    const transferEvtWasFirst = fillPlot.source == "TRANSFER" && fillPlot.sourceHash == event.transaction.hash;
    if (!transferEvtWasFirst) {
      remainderPlot.source = fillPlot.source;
      remainderPlot.sourceHash = fillPlot.sourceHash;
      remainderPlot.beansPerPod = fillPlot.beansPerPod;
      remainderPlot.initialHarvestableIndex = fillPlot.initialHarvestableIndex;
      remainderPlot.preTransferSource = fillPlot.preTransferSource;
      remainderPlot.preTransferOwner = fillPlot.preTransferOwner;
      remainderPlot.save();
    }
  }

  // Update values on the sold plot
  fillPlot.beansPerPod = costInBeans.times(BI_10.pow(6)).div(length);
  fillPlot.initialHarvestableIndex = protocolField.harvestableIndex;
  fillPlot.source = "MARKET";
  fillPlot.sourceHash = event.transaction.hash;
  fillPlot.preTransferSource = null;
  fillPlot.preTransferOwner = null;
  fillPlot.save();
}

export function expirePodListingIfExists(
  farmer: Address,
  listedPlotIndex: BigInt,
  block: ethereum.Block,
  fieldId: BigInt = ZERO_BI,
  activeListingIndex: i32 = -1, // If provided, avoids having to lookup the index
): void {
  let listing = PodListing.load(getPodListingEntityId(farmer, listedPlotIndex, fieldId));
  if (listing == null || listing.status != "ACTIVE") {
    return;
  }
  listing.status = "EXPIRED";
  listing.save();

  let market = loadPodMarketplace(fieldId);

  if (activeListingIndex == -1) {
    // There should always be a matching entry in this list because it is verified that the listing is ACTIVE
    for (let i = 0; i < market.activeListings.length; i++) {
      const destructured = market.activeListings[i].split("-");
      // Unnecessary to check if the account matches.
      if (destructured[1] == listedPlotIndex.toString()) {
        activeListingIndex = i;
        break;
      }
    }
  }

  market.expiredListedPods = market.expiredListedPods.plus(listing.remainingAmount);
  market.availableListedPods = market.availableListedPods.minus(listing.remainingAmount);
  let activeListings = market.activeListings;
  activeListings.splice(activeListingIndex, 1);
  market.activeListings = activeListings;

  takeMarketSnapshots(market, block);
  market.save();
}

export function updateActiveListings(
  action: MarketplaceAction,
  farmer: string,
  plotIndex: BigInt,
  expiryIndex: BigInt,
  fieldId: BigInt = ZERO_BI
): void {
  let market = loadPodMarketplace(fieldId);
  let listings = market.activeListings;

  if (action == MarketplaceAction.CREATED) {
    listings.push(farmer + "-" + plotIndex.toString() + "-" + expiryIndex.toString());
  }
  if (
    [
      MarketplaceAction.CANCELLED,
      MarketplaceAction.FILLED_PARTIAL,
      MarketplaceAction.FILLED_FULL,
      MarketplaceAction.EXPIRED
    ].includes(action)
  ) {
    listings.splice(Marketplace_findIndex_listing(listings, plotIndex), 1);
  }

  market.activeListings = listings;
  market.save();
}

export function updateActiveOrders(
  action: MarketplaceAction,
  orderId: string,
  maxPlaceInLine: BigInt,
  fieldId: BigInt = ZERO_BI
): void {
  let market = loadPodMarketplace(fieldId);
  let orders = market.activeOrders;

  if (action == MarketplaceAction.CREATED) {
    orders.push(orderId + "-" + maxPlaceInLine.toString());
  }
  if ([MarketplaceAction.CANCELLED, MarketplaceAction.FILLED_FULL, MarketplaceAction.EXPIRED].includes(action)) {
    orders.splice(Marketplace_findIndex_order(orders, orderId), 1);
  }

  market.activeOrders = orders;
  market.save();
}

function Marketplace_findIndex_listing(listings: string[], plotIndex: BigInt): i32 {
  for (let i = 0; i < listings.length; i++) {
    const values = listings[i].split("-");
    if (BigInt.fromString(values[1]) == plotIndex) {
      return i;
    }
  }
  return -1;
}

function Marketplace_findIndex_order(orders: string[], orderId: string): i32 {
  for (let i = 0; i < orders.length; i++) {
    const values = orders[i].split("-");
    if (values[0] == orderId) {
      return i;
    }
  }
  return -1;
}
