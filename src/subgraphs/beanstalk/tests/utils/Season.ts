import { Address, ethereum } from "@graphprotocol/graph-ts";
import { createMockedFunction } from "matchstick-as/assembly/index";
import { loadBeanstalk } from "../../src/entities/Beanstalk";
import { ZERO_BI } from "../../../../core/utils/Decimals";

export function setSeason(season: u32): void {
  let beanstalk = loadBeanstalk();
  beanstalk.lastSeason = season;
  beanstalk.save();
}

// Currently isRaining is the only value used by the subgraph in this call
export function mockSeasonStruct(protocol: Address, isRaining: boolean = false): void {
  let retval = new ethereum.Tuple();
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromBoolean(isRaining));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromBoolean(false));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromUnsignedBigInt(ZERO_BI));
  retval.push(ethereum.Value.fromBytesArray([]));

  createMockedFunction(
    protocol,
    "getSeasonStruct",
    "getSeasonStruct():((uint32,uint32,uint32,uint32,bool,uint64,bool,uint256,uint256,uint256,uint256,bytes32[8]))"
  ).returns([ethereum.Value.fromTuple(retval)]);
}
