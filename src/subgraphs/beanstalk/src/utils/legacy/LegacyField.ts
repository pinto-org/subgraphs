import { Address, BigInt } from "@graphprotocol/graph-ts";
import { BEANSTALK_FARMS } from "../../../../../core/constants/raw/BeanstalkEthConstants";
import { loadField } from "../../entities/Field";
import { ZERO_BI } from "../../../../../core/utils/Decimals";

export function legacySowAmount(protocol: Address, sower: Address, fieldId: BigInt = ZERO_BI): BigInt | null {
  if (sower == BEANSTALK_FARMS) {
    return loadField(protocol, fieldId).soil;
  }
  return null;
}
