import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts";
import { loadBean } from "./Bean";
import { getTokensForPool } from "../utils/constants/PooledTokens";
import { Pool, PoolDailySnapshot, PoolHourlySnapshot } from "../../generated/schema";
import { loadOrCreateToken } from "./Token";
import { emptyBigIntArray, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { dayFromTimestamp, hourFromTimestamp } from "../../../../core/utils/Dates";
import { toAddress, toBytesArray } from "../../../../core/utils/Bytes";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";

export function loadOrCreatePool(poolAddress: Address, blockNumber: BigInt): Pool {
  let pool = Pool.load(poolAddress);
  if (pool == null) {
    let beanAddress = getProtocolToken(v(), blockNumber);
    let bean = loadBean(beanAddress);

    pool = new Pool(poolAddress);
    pool.tokens = toBytesArray(getTokensForPool(poolAddress));
    for (let i = 0; i < pool.tokens.length; ++i) {
      loadOrCreateToken(toAddress(pool.tokens[i]));
    }
    pool.bean = beanAddress;
    pool.reserves = emptyBigIntArray(2);
    pool.lastSeason = bean.lastSeason;
    pool.lastPrice = ZERO_BD;
    pool.volume = ZERO_BI;
    pool.volumeUSD = ZERO_BD;
    pool.liquidityUSD = ZERO_BD;
    pool.crosses = 0;
    pool.lastCross = ZERO_BI;
    pool.deltaBeans = ZERO_BI;
    pool.save();

    // Add new pool to the Bean entity
    let pools = bean.pools;
    pools.push(poolAddress);
    bean.pools = pools;
    bean.save();
  }
  return pool as Pool;
}

export function loadOrCreatePoolHourlySnapshot(pool: Address, block: ethereum.Block): PoolHourlySnapshot {
  const poolEntity = loadOrCreatePool(pool, block.number);
  let beanAddress = toAddress(poolEntity.bean);
  let id = pool.toHexString() + "-" + loadBean(beanAddress).lastSeason;
  let snapshot = PoolHourlySnapshot.load(id);
  if (snapshot == null) {
    snapshot = new PoolHourlySnapshot(id);
    snapshot.pool = pool;
    snapshot.reserves = poolEntity.reserves;
    snapshot.lastPrice = poolEntity.lastPrice;
    snapshot.twaPrice = ZERO_BD;
    snapshot.volume = poolEntity.volume;
    snapshot.volumeUSD = poolEntity.volumeUSD;
    snapshot.liquidityUSD = poolEntity.liquidityUSD;
    snapshot.crosses = poolEntity.crosses;
    snapshot.utilization = ZERO_BD;
    snapshot.deltaBeans = ZERO_BI;
    snapshot.twaDeltaBeans = ZERO_BI;
    snapshot.deltaReserves = emptyBigIntArray(2);
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.season = poolEntity.lastSeason;
    snapshot.createdAt = block.timestamp;
    snapshot.updatedAt = block.timestamp;
    snapshot.save();
  }
  return snapshot as PoolHourlySnapshot;
}

export function loadOrCreatePoolDailySnapshot(pool: Address, block: ethereum.Block): PoolDailySnapshot {
  let day = dayFromTimestamp(block.timestamp).toString();

  let id = pool.toHexString() + "-" + day;
  let snapshot = PoolDailySnapshot.load(id);
  if (snapshot == null) {
    let poolEntity = loadOrCreatePool(pool, block.number);
    snapshot = new PoolDailySnapshot(id);
    snapshot.pool = pool;
    snapshot.reserves = poolEntity.reserves;
    snapshot.lastPrice = poolEntity.lastPrice;
    snapshot.twaPrice = ZERO_BD;
    snapshot.volume = poolEntity.volume;
    snapshot.volumeUSD = poolEntity.volumeUSD;
    snapshot.liquidityUSD = poolEntity.liquidityUSD;
    snapshot.crosses = poolEntity.crosses;
    snapshot.utilization = ZERO_BD;
    snapshot.deltaBeans = ZERO_BI;
    snapshot.twaDeltaBeans = ZERO_BI;
    snapshot.deltaReserves = emptyBigIntArray(2);
    snapshot.deltaVolume = ZERO_BI;
    snapshot.deltaVolumeUSD = ZERO_BD;
    snapshot.deltaLiquidityUSD = ZERO_BD;
    snapshot.deltaCrosses = 0;
    snapshot.season = poolEntity.lastSeason;
    snapshot.createdAt = block.timestamp;
    snapshot.updatedAt = block.timestamp;
    snapshot.save();
  }
  return snapshot as PoolDailySnapshot;
}
