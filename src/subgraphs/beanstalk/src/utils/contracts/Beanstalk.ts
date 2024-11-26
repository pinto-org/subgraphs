import { BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK as BEANSTALK_ETH } from "../../../../../core/constants/raw/BeanstalkEthConstants";
import { SeedGauge } from "../../../generated/Beanstalk-ABIs/SeedGauge";
import { v } from "../constants/Version";
import { PintoLaunch } from "../../../generated/Beanstalk-ABIs/PintoLaunch";

export function Beanstalk_harvestableIndex(fieldId: BigInt): BigInt {
  const version = v();
  if (version.chain == "ethereum" && version.protocolAddress == BEANSTALK_ETH) {
    let beanstalk_contract = SeedGauge.bind(version.protocolAddress);
    return beanstalk_contract.harvestableIndex();
  }
  // Has field id
  let beanstalk_contract = PintoLaunch.bind(version.protocolAddress);
  return beanstalk_contract.harvestableIndex(fieldId);
}

export function Beanstalk_isRaining(): boolean {
  // TODO
  return false;
}
