import { Address, BigInt } from "@graphprotocol/graph-ts";
import { BEAN_ERC20 } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { loadBean } from "../../src/entities/Bean";
import { toBytesArray } from "../../../../core/utils/Bytes";
import { setMockBeanPrice } from "../../../../core/tests/event-mocking/Price";
import { ONE_BI } from "../../../../core/utils/Decimals";

export function mockWhitelistedPools(pools: Address[]): void {
  let bean = loadBean(BEAN_ERC20);
  bean.pools = toBytesArray(pools);
  bean.save();
}

export function mockPriceBelow(): void {
  setMockBeanPrice({
    price: BigInt.fromString("950000"),
    liquidity: BigInt.fromString("123456"),
    deltaB: ONE_BI,
    ps: []
  });
}
