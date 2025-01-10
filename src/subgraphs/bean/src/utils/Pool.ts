import { BigDecimal, BigInt, ethereum, Address, log } from "@graphprotocol/graph-ts";
import { updateInstDeltaB } from "./Bean";
import { checkPoolCross } from "./Cross";
import { DeltaBAndPrice } from "./price/Types";
import { loadOrCreatePool } from "../entities/Pool";
import { toAddress } from "../../../../core/utils/Bytes";
import { getSeason } from "../entities/Season";
import { takePoolSnapshots } from "../entities/snapshots/Pool";

export function updatePoolValues(
  poolAddress: Address,
  volumeBean: BigInt,
  volumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal,
  deltaBeans: BigInt,
  block: ethereum.Block
): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.volume = pool.volume.plus(volumeBean);
  pool.volumeUSD = pool.volumeUSD.plus(volumeUSD);
  pool.liquidityUSD = pool.liquidityUSD.plus(deltaLiquidityUSD);
  pool.deltaBeans = deltaBeans;

  takePoolSnapshots(pool, block);
  pool.save();

  updateInstDeltaB(toAddress(pool.bean), block);
}

export function updatePoolSeason(poolAddress: Address, season: i32, block: ethereum.Block): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.currentSeason = getSeason(season).id;
  takePoolSnapshots(pool, block);
  pool.save();
}

export function updatePoolPrice(
  poolAddress: Address,
  price: BigDecimal,
  block: ethereum.Block,
  checkCross: boolean = true
): void {
  const pool = loadOrCreatePool(poolAddress, block.number);
  const oldPrice = pool.lastPrice;
  pool.lastPrice = price;

  takePoolSnapshots(pool, block);
  pool.save();

  if (checkCross) {
    checkPoolCross(poolAddress, oldPrice, price, block);
  }
}

export function setPoolReserves(poolAddress: Address, reserves: BigInt[], block: ethereum.Block): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.reserves = reserves;
  takePoolSnapshots(pool, block);
  pool.save();
}

export function getPoolLiquidityUSD(poolAddress: Address, block: ethereum.Block): BigDecimal {
  let pool = loadOrCreatePool(poolAddress, block.number);
  return pool.liquidityUSD;
}
