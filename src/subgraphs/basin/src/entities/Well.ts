import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Well, WellUpgradeHistory } from "../../generated/schema";
import { ERC20 } from "../../generated/Basin-ABIs/ERC20";
import { emptyBigDecimalArray, emptyBigIntArray, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";

export function loadOrCreateWell(wellAddress: Address, inputTokens: Address[], block: ethereum.Block): Well {
  let well = Well.load(wellAddress);
  if (well !== null) {
    return well as Well;
  }

  well = new Well(wellAddress);

  let wellContract = ERC20.bind(wellAddress);

  let nameCall = wellContract.try_name();
  if (nameCall.reverted) {
    well.name = "";
  } else {
    well.name = nameCall.value;
  }

  let symbolCall = wellContract.try_symbol();
  if (symbolCall.reverted) {
    well.symbol = "";
  } else {
    well.symbol = symbolCall.value;
  }

  well.boredWell = Bytes.empty();
  well.aquifer = Bytes.empty();
  well.implementation = Bytes.empty();
  well.pumps = [];
  well.pumpData = [];
  well.wellFunction = Bytes.empty();
  well.wellFunctionData = Bytes.empty();
  well.tokens = [];
  well.tokenOrder = [];
  well.createdTimestamp = block.timestamp;
  well.createdBlockNumber = block.number;
  well.lpTokenSupply = ZERO_BI;
  well.totalLiquidityUSD = ZERO_BD;
  well.tokenPrice = [ZERO_BI, ZERO_BI];
  well.reserves = emptyBigIntArray(inputTokens.length);
  well.reservesUSD = emptyBigDecimalArray(inputTokens.length);

  well.cumulativeTradeVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingDailyTradeVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingWeeklyTradeVolumeReserves = emptyBigIntArray(inputTokens.length);

  well.cumulativeTradeVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingDailyTradeVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingWeeklyTradeVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);

  well.cumulativeTradeVolumeUSD = ZERO_BD;
  well.rollingDailyTradeVolumeUSD = ZERO_BD;
  well.rollingWeeklyTradeVolumeUSD = ZERO_BD;

  well.cumulativeBiTradeVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingDailyBiTradeVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingWeeklyBiTradeVolumeReserves = emptyBigIntArray(inputTokens.length);

  well.cumulativeTransferVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingDailyTransferVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingWeeklyTransferVolumeReserves = emptyBigIntArray(inputTokens.length);

  well.cumulativeTransferVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingDailyTransferVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingWeeklyTransferVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);

  well.cumulativeTransferVolumeUSD = ZERO_BD;
  well.rollingDailyTransferVolumeUSD = ZERO_BD;
  well.rollingWeeklyTransferVolumeUSD = ZERO_BD;

  well.convertVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingDailyConvertVolumeReserves = emptyBigIntArray(inputTokens.length);
  well.rollingWeeklyConvertVolumeReserves = emptyBigIntArray(inputTokens.length);

  well.convertVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingDailyConvertVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);
  well.rollingWeeklyConvertVolumeReservesUSD = emptyBigDecimalArray(inputTokens.length);

  well.convertVolumeUSD = ZERO_BD;
  well.rollingDailyConvertVolumeUSD = ZERO_BD;
  well.rollingWeeklyConvertVolumeUSD = ZERO_BD;

  well.lastSnapshotDayID = 0;
  well.lastSnapshotHourID = 0;
  well.lastUpdateTimestamp = ZERO_BI;
  well.lastUpdateBlockNumber = ZERO_BI;
  well.save();

  return well as Well;
}

export function loadWell(wellAddress: Address): Well {
  return Well.load(wellAddress) as Well;
}

export function createWellUpgradeHistoryEntry(well: Well, block: ethereum.Block): void {
  const historyCount = well.upgradeHistory.load().length;
  const history = new WellUpgradeHistory(well.id.toHexString() + "-" + historyCount.toString());
  history.well = well.id;
  history.effectiveBlock = block.number;
  history.effectiveTimestamp = block.timestamp;
  history.boredWell = well.boredWell;
  history.aquifer = well.aquifer;
  history.implementation = well.implementation;
  history.pumps = well.pumps;
  history.pumpData = well.pumpData;
  history.wellFunction = well.wellFunction;
  history.wellFunctionData = well.wellFunctionData;
  history.save();
}

export function updateWellReserves(wellAddress: Address, additiveAmounts: BigInt[], block: ethereum.Block): void {
  let well = loadWell(wellAddress);
  let balances = well.reserves;

  for (let i = 0; i < balances.length; i++) {
    balances[i] = balances[i].plus(additiveAmounts[i]);
  }

  well.reserves = balances;
  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
  well.save();
}

export function updateWellLiquidityTokenBalance(
  wellAddress: Address,
  deltaAmount: BigInt,
  block: ethereum.Block
): void {
  let well = loadWell(wellAddress);
  well.lpTokenSupply = well.lpTokenSupply.plus(deltaAmount);
  well.lastUpdateTimestamp = block.timestamp;
  well.lastUpdateBlockNumber = block.number;
  well.save();
}
