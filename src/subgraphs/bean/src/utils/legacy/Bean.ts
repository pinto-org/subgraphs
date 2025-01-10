import { ethereum, Address } from "@graphprotocol/graph-ts";
import { BEAN_3CRV_V1, BEAN_LUSD_V1, BEAN_WETH_V1 } from "../../../../../core/constants/raw/BeanstalkEthConstants";
import { toDecimal, ZERO_BD } from "../../../../../core/utils/Decimals";
import { Pool } from "../../../generated/schema";
import { loadBean } from "../../entities/Bean";
import { takeBeanSnapshots } from "../../entities/snapshots/Bean";

export function updateBeanSupplyPegPercent_v1(beanToken: Address, block: ethereum.Block): void {
  let bean = loadBean(beanToken);
  let lpSupply = ZERO_BD;

  let pool = Pool.load(BEAN_WETH_V1);
  if (pool != null) {
    lpSupply = lpSupply.plus(toDecimal(pool.reserves[1]));
  }

  pool = Pool.load(BEAN_3CRV_V1);
  if (pool != null) {
    lpSupply = lpSupply.plus(toDecimal(pool.reserves[0]));
  }

  pool = Pool.load(BEAN_LUSD_V1);
  if (pool != null) {
    lpSupply = lpSupply.plus(toDecimal(pool.reserves[0]));
  }

  bean.supplyInPegLP = lpSupply.div(toDecimal(bean.supply));
  takeBeanSnapshots(bean, block);
  bean.save();
}
