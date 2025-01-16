import { BigDecimal, BigInt, ethereum, Address, log } from "@graphprotocol/graph-ts";
import { checkPoolCross } from "./Cross";
import { loadOrCreatePool, savePool } from "../entities/Pool";
import { setPoolSnapshotInstValues, takePoolSnapshots } from "../entities/snapshots/Pool";
import { toDecimal } from "../../../../core/utils/Decimals";

export function updatePoolValues(
  poolAddress: Address,
  volumeBean: BigInt,
  volumeUSD: BigDecimal,
  deltaLiquidityUSD: BigDecimal,
  instDeltaB: BigInt,
  block: ethereum.Block
): void {
  let pool = loadOrCreatePool(poolAddress, block.number);
  pool.volume = pool.volume.plus(volumeBean);
  pool.volumeUSD = pool.volumeUSD.plus(volumeUSD);
  pool.liquidityUSD = pool.liquidityUSD.plus(deltaLiquidityUSD);

  takePoolSnapshots(pool, block);
  setPoolSnapshotInstValues(pool, toDecimal(instDeltaB));
  savePool(pool, block);
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
  savePool(pool, block);

  if (checkCross) {
    checkPoolCross(poolAddress, oldPrice, price, block);
  }
}
