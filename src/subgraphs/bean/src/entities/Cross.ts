import { BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { Bean, BeanCross, Pool, PoolCross } from "../../generated/schema";

export function createBeanCross(
  bean: Bean,
  newPrice: BigDecimal,
  crossedAbove: boolean,
  block: ethereum.Block
): BeanCross {
  const cross = new BeanCross(bean.crosses.toString());
  cross.cross = bean.crosses;
  cross.bean = bean.id;
  cross.price = newPrice;
  cross.blockNumber = block.number;
  cross.timestamp = block.timestamp;
  cross.timeSinceLastCross = block.timestamp.minus(bean.lastCross);
  cross.above = crossedAbove;
  cross.beanHourlySnapshot = bean.id.toHexString() + "-" + bean.lastHourlySnapshotSeason.toString();
  cross.beanDailySnapshot = bean.id.toHexString() + "-" + bean.lastDailySnapshotDay.toString();
  cross.save();
  return cross;
}

export function createPoolCross(
  pool: Pool,
  newPrice: BigDecimal,
  crossedAbove: boolean,
  block: ethereum.Block
): PoolCross {
  const cross = new PoolCross(pool.id.toHexString() + "-" + pool.crosses.toString());
  cross.cross = pool.crosses;
  cross.pool = pool.id;
  cross.price = newPrice;
  cross.blockNumber = block.number;
  cross.timestamp = block.timestamp;
  cross.timeSinceLastCross = block.timestamp.minus(pool.lastCross);
  cross.above = crossedAbove;
  cross.poolHourlySnapshot = pool.id.toHexString() + "-" + pool.lastHourlySnapshotSeason.toString();
  cross.poolDailySnapshot = pool.id.toHexString() + "-" + pool.lastDailySnapshotDay.toString();
  cross.save();
  return cross;
}
