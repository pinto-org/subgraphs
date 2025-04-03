import { BigInt, Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { mockContractEvent } from "../../../../core/tests/event-mocking/Util";
import { Tractor } from "../../generated/Beanstalk-ABIs/PintoPI8";
import { v } from "../../src/utils/constants/Version";
import { OperatorReward } from "../../generated/Beanstalk-ABIs/SiloHelpers";

export function createTractorEvent(operator: Address, publisher: Address, blueprintHash: Bytes): Tractor {
  let event = changetype<Tractor>(mockContractEvent(v().protocolAddress));
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator));
  let param2 = new ethereum.EventParam("publisher", ethereum.Value.fromAddress(publisher));
  let param3 = new ethereum.EventParam("blueprintHash", ethereum.Value.fromBytes(blueprintHash));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);

  return event as Tractor;
}

export function createOperatorRewardEvent(
  rewardType: i32,
  publisher: Address,
  operator: Address,
  token: Address,
  amount: BigInt
): OperatorReward {
  let event = changetype<OperatorReward>(mockContractEvent(v().protocolAddress));
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("rewardType", ethereum.Value.fromI32(rewardType));
  let param2 = new ethereum.EventParam("publisher", ethereum.Value.fromAddress(publisher));
  let param3 = new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator));
  let param4 = new ethereum.EventParam("token", ethereum.Value.fromAddress(token));
  let param5 = new ethereum.EventParam("amount", ethereum.Value.fromSignedBigInt(amount));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);
  event.parameters.push(param4);
  event.parameters.push(param5);

  return event as OperatorReward;
}
