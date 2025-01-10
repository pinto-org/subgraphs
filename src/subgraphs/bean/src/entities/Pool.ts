import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts";
import { loadBean } from "./Bean";
import { getTokensForPool } from "../utils/constants/PooledTokens";
import { Pool } from "../../generated/schema";
import { loadOrCreateToken } from "./Token";
import { emptyBigIntArray, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
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
    pool.currentSeason = bean.currentSeason;
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
