import { Bytes, BigInt, Address, BigDecimal, ethereum, log } from "@graphprotocol/graph-ts";
import { getTWAPrices } from "./TwaOracle";
import { ABDK_toUInt, pow2toX } from "../../../../../core/utils/ABDKMathQuad";
import { calcLiquidity, TwaResults, TWAType } from "./PoolStats";
import { ONE_BI, toDecimal, ZERO_BI } from "../../../../../core/utils/Decimals";
import { loadOrCreateTwaOracle } from "../../entities/TwaOracle";
import { setPoolSnapshotTwa } from "../../entities/snapshots/Pool";
import { PintoLaunch } from "../../../generated/Bean-ABIs/PintoLaunch";
import { WellFunction } from "../../../generated/Bean-ABIs/WellFunction";
import { v } from "../constants/Version";
import { getLastSeasonDuration } from "../../entities/Season";
import {
  getProtocolToken,
  getTokenDecimals,
  getTokensForPool,
  isStable2WellFn,
  wellFnInfoForWell
} from "../../../../../core/constants/RuntimeConstants";

// Cumulative Well reserves are abi encoded as a bytes16[]. This decodes into BigInt[] in uint format
export function decodeCumulativeWellReserves(data: Bytes): BigInt[] {
  let dataString = data.toHexString().substring(2);

  let dataStartOffset = <i32>parseInt(dataString.substring(0, <i32>64), 16) * 2;
  let arrayLength = <i32>parseInt(dataString.substring(dataStartOffset, dataStartOffset + <i32>64), 16);
  let cumulativeReserves: BigInt[] = new Array<BigInt>(arrayLength);
  let dataOffset = dataStartOffset + <i32>64;

  for (let i = 0; i < arrayLength; i++) {
    let elementOffset = dataOffset + i * 64;
    let littleEndian = Bytes.fromHexString("0x" + dataString.substring(elementOffset, elementOffset + 32)).reverse();
    let element = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(littleEndian));
    // Convert from ABDK format
    cumulativeReserves[i] = ABDK_toUInt(element);
  }

  return cumulativeReserves;
}

// This gets set from WellOracle event
export function wellCumulativePrices(pool: Address, timestamp: BigInt): BigInt[] {
  let twaOracle = loadOrCreateTwaOracle(pool);
  if (twaOracle.lastUpdated != timestamp) {
    // If this becomes an issue, could call into the pump
    throw new Error("Attempted to access updated Well cumulative prices when they were not available.");
  }
  return twaOracle.priceCumulativeLast;
}

export function wellTwaReserves(currentReserves: BigInt[], pastReserves: BigInt[], timeElapsed: BigDecimal): BigInt[] {
  if (pastReserves[0] == ZERO_BI) {
    return [ONE_BI, ONE_BI];
  }
  return [
    pow2toX(new BigDecimal(currentReserves[0].minus(pastReserves[0])).div(timeElapsed)),
    pow2toX(new BigDecimal(currentReserves[1].minus(pastReserves[1])).div(timeElapsed))
  ];
}

export function setWellTwa(wellAddress: Address, twaDeltaB: BigInt, block: ethereum.Block): void {
  const twaBalances = getTWAPrices(wellAddress, TWAType.WELL_PUMP, block.timestamp);
  const twaResult = wellTwaResults(wellAddress, twaBalances, twaDeltaB, block);

  setPoolSnapshotTwa(wellAddress, twaResult);
}

function wellTwaResults(
  wellAddress: Address,
  twaBalances: BigInt[],
  twaDeltaB: BigInt,
  block: ethereum.Block
): TwaResults {
  const poolTokens = getTokensForPool(v(), wellAddress);
  const token2Idx = poolTokens[0] == getProtocolToken(v(), block.number) ? 1 : 0;
  const decimals = poolTokens.map<i32>((a) => getTokenDecimals(v(), a));

  const seasonDuration = getLastSeasonDuration();
  const twaToken2Price = toDecimal(
    PintoLaunch.bind(v().protocolAddress).getTokenUsdTwap(poolTokens[token2Idx], BigInt.fromI32(seasonDuration))
  );

  const wellFnInfo = wellFnInfoForWell(v(), wellAddress);
  const beanRate = WellFunction.bind(wellFnInfo.address).calcRate(
    twaBalances,
    BigInt.fromI32(token2Idx),
    BigInt.fromI32(1 - token2Idx),
    wellFnInfo.data
  );
  // For CP wells, the given rate precision is quoteToken + 18 - baseToken
  const beanRateAdjusted = toDecimal(
    beanRate,
    isStable2WellFn(v(), wellFnInfo.address) ? 6 : decimals[token2Idx] + 18 - decimals[1 - token2Idx]
  );
  const twaBeanPrice = beanRateAdjusted.times(twaToken2Price);

  return {
    reserves: twaBalances,
    deltaB: toDecimal(twaDeltaB),
    beanPrice: twaBeanPrice.truncate(6),
    token2Price: twaToken2Price.truncate(6),
    liquidity: calcLiquidity(twaBalances, [twaBeanPrice, twaToken2Price], decimals, 1 - token2Idx)
  };
}
