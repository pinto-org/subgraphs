import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockBeanstalkEvent } from "../../../../core/tests/event-mocking/Util";
import { Convert, DewhitelistToken } from "../../generated/Basin-ABIs/PintoPI14";

export function createConvertEvent(
  account: Address,
  fromToken: Address,
  toToken: Address,
  fromAmount: BigInt,
  toAmount: BigInt,
  fromBdv: BigInt,
  toBdv: BigInt
): Convert {
  let event = changetype<Convert>(mockBeanstalkEvent());
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(account));
  let param2 = new ethereum.EventParam("fromToken", ethereum.Value.fromAddress(fromToken));
  let param3 = new ethereum.EventParam("toToken", ethereum.Value.fromAddress(toToken));
  let param4 = new ethereum.EventParam("fromAmount", ethereum.Value.fromUnsignedBigInt(fromAmount));
  let param5 = new ethereum.EventParam("toAmount", ethereum.Value.fromUnsignedBigInt(toAmount));
  let param6 = new ethereum.EventParam("fromBdv", ethereum.Value.fromUnsignedBigInt(fromBdv));
  let param7 = new ethereum.EventParam("toBdv", ethereum.Value.fromUnsignedBigInt(toBdv));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);
  event.parameters.push(param4);
  event.parameters.push(param5);
  event.parameters.push(param6);
  event.parameters.push(param7);

  return event as Convert;
}

export function createDewhitelistTokenEvent(token: Address): DewhitelistToken {
  let event = changetype<DewhitelistToken>(mockBeanstalkEvent());
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("token", ethereum.Value.fromAddress(token));

  event.parameters.push(param1);
  return event as DewhitelistToken;
}
