import { BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK as BEANSTALK_ETH } from "../../../../../core/constants/raw/BeanstalkEthConstants";
import { SeedGauge } from "../../../generated/Beanstalk-ABIs/SeedGauge";
import { v } from "../constants/Version";
import { PintoPI14 } from "../../../generated/Beanstalk-ABIs/PintoPI14";

export function Beanstalk_harvestableIndex(fieldId: BigInt): BigInt {
  const version = v();
  if (version.chain == "ethereum" && version.protocolAddress == BEANSTALK_ETH) {
    let beanstalk_contract = SeedGauge.bind(version.protocolAddress);
    return beanstalk_contract.harvestableIndex();
  }
  // Has field id
  let beanstalk_contract = PintoPI14.bind(version.protocolAddress);
  return beanstalk_contract.harvestableIndex(fieldId);
}

export function Beanstalk_isRaining(): boolean {
  const beanstalk_contract = PintoPI14.bind(v().protocolAddress);
  const seasonStruct = beanstalk_contract.getSeasonStruct();
  return seasonStruct.raining;
}
