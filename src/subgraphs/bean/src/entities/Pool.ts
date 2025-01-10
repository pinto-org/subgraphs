import { BigInt, Address, ethereum, BigDecimal } from "@graphprotocol/graph-ts";
import { loadBean } from "./Bean";
import { getTokensForPool } from "../utils/constants/PooledTokens";
import { Pool } from "../../generated/schema";
import { loadOrCreateToken } from "./Token";
import { emptyBigIntArray, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { toAddress, toBytesArray } from "../../../../core/utils/Bytes";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "../utils/constants/Version";
import { takePoolSnapshots } from "./snapshots/Pool";
import { getSeason } from "./Season";

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
    pool.currentSeason = bean.currentSeason;
    pool.lastPrice = ZERO_BD;
    pool.volume = ZERO_BI;
    pool.volumeUSD = ZERO_BD;
    pool.liquidityUSD = ZERO_BD;
    pool.crosses = 0;
    pool.lastCross = ZERO_BI;
    pool.deltaBeans = ZERO_BI;
    pool.createdTimestamp = ZERO_BI;
    pool.lastUpdateTimestamp = ZERO_BI;
    pool.lastUpdateBlockNumber = ZERO_BI;
    pool.save();

    // Add new pool to the Bean entity
    let pools = bean.pools;
    pools.push(poolAddress);
    bean.pools = pools;
    bean.save();
  }
  return pool as Pool;
}

export function savePool(pool: Pool, block: ethereum.Block): void {
  if (pool.createdTimestamp == ZERO_BI) {
    pool.createdTimestamp = block.timestamp;
  }
  pool.lastUpdateTimestamp = block.timestamp;
  pool.lastUpdateBlockNumber = block.number;
  pool.save();
}

export function getPoolLiquidityUSD(poolAddress: Address, block: ethereum.Block): BigDecimal {
  let pool = loadOrCreatePool(poolAddress, block.number);
  return pool.liquidityUSD;
}

export function updatePoolSeason(poolAddress: Address, season: i32, block: ethereum.Block): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.currentSeason = getSeason(season).id;
  takePoolSnapshots(pool, block);
  savePool(pool, block);
}

export function setPoolReserves(poolAddress: Address, reserves: BigInt[], block: ethereum.Block): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.reserves = reserves;
  takePoolSnapshots(pool, block);
  savePool(pool, block);
}
