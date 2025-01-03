import { Address } from "@graphprotocol/graph-ts";
import { BEAN_ERC20 } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { loadBean } from "../../src/entities/Bean";
import { toBytesArray } from "../../../../core/utils/Bytes";

export function setWhitelistedPools(pools: Address[]): void {
  let bean = loadBean(BEAN_ERC20);
  bean.pools = toBytesArray(pools);
  bean.save();
}
