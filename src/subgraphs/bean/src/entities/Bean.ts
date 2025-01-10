import { BigDecimal, Address, ethereum } from "@graphprotocol/graph-ts";
import { BEAN_ERC20 } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { Bean } from "../../generated/schema";
import { getV1Crosses } from "../utils/Cross";
import { getSeason } from "./Season";

export function loadBean(token: Address): Bean {
  let bean = Bean.load(token);
  if (bean == null) {
    bean = new Bean(token);
    bean.supply = ZERO_BI;
    bean.marketCap = ZERO_BD;
    bean.lockedBeans = ZERO_BI;
    bean.supplyInPegLP = ZERO_BD;
    bean.volume = ZERO_BI;
    bean.volumeUSD = ZERO_BD;
    bean.liquidityUSD = ZERO_BD;
    bean.price = BigDecimal.fromString(token == BEAN_ERC20 ? "1.072" : "1.0");
    bean.crosses = token == BEAN_ERC20 ? getV1Crosses() : 0;
    bean.lastCross = ZERO_BI;
    bean.currentSeason = getSeason(token == BEAN_ERC20 ? 6074 : 1).id;
    bean.pools = [];
    bean.dewhitelistedPools = [];
    bean.createdTimestamp = ZERO_BI;
    bean.lastUpdateTimestamp = ZERO_BI;
    bean.lastUpdateBlockNumber = ZERO_BI;
  }
  return bean as Bean;
}

export function saveBean(bean: Bean, block: ethereum.Block): void {
  if (bean.createdTimestamp == ZERO_BI) {
    bean.createdTimestamp = block.timestamp;
  }
  bean.lastUpdateTimestamp = block.timestamp;
  bean.lastUpdateBlockNumber = block.number;
  bean.save();
}
