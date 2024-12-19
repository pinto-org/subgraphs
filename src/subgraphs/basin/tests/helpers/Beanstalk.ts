import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockBeanstalkEvent } from "../../../../core/tests/event-mocking/Util";
import { Convert } from "../../generated/Basin-ABIs/PintoLaunch";

export function createConvertEvent(
  account: Address,
  fromToken: Address,
  toToken: Address,
  fromAmount: BigInt,
  toAmount: BigInt
): Convert {
  let event = changetype<Convert>(mockBeanstalkEvent());
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(account));
  let param2 = new ethereum.EventParam("fromToken", ethereum.Value.fromAddress(fromToken));
  let param3 = new ethereum.EventParam("toToken", ethereum.Value.fromAddress(toToken));
  let param4 = new ethereum.EventParam("fromAmount", ethereum.Value.fromUnsignedBigInt(fromAmount));
  let param5 = new ethereum.EventParam("toAmount", ethereum.Value.fromUnsignedBigInt(toAmount));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);
  event.parameters.push(param4);
  event.parameters.push(param5);

  return event as Convert;
}
