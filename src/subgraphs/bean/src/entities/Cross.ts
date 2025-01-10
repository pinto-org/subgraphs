import { BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { Bean, BeanCross, Pool, PoolCross } from "../../generated/schema";
import { toAddress } from "../../../../core/utils/Bytes";

export function createBeanCross(
  bean: Bean,
  newPrice: BigDecimal,
  crossedAbove: boolean,
  block: ethereum.Block
): BeanCross {
  const cross = new BeanCross(bean.crosses.toString());
  cross.bean = bean.id;
  cross.price = newPrice;
  cross.blockNumber = block.number;
  cross.timestamp = block.timestamp;
  cross.timeSinceLastCross = block.timestamp.minus(bean.lastCross);
  cross.above = crossedAbove;
  cross.beanHourlySnapshot = loadOrCreateBeanHourlySnapshot(bean, block).id;
  cross.beanDailySnapshot = loadOrCreateBeanDailySnapshot(bean, block).id;
  return cross;
}

export function createPoolCross(
  pool: Pool,
  newPrice: BigDecimal,
  crossedAbove: boolean,
  block: ethereum.Block
): PoolCross {
  const cross = new PoolCross(pool.id.toHexString() + "-" + pool.crosses.toString());
  cross.pool = pool.id;
  cross.price = newPrice;
  cross.blockNumber = block.number;
  cross.timestamp = block.timestamp;
  cross.timeSinceLastCross = block.timestamp.minus(pool.lastCross);
  cross.above = crossedAbove;
  cross.poolHourlySnapshot = loadOrCreatePoolHourlySnapshot(toAddress(pool.id), block).id;
  cross.poolDailySnapshot = loadOrCreatePoolDailySnapshot(toAddress(pool.id), block).id;
  return cross;
}
