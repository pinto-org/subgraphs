import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockContractEvent } from "../../../../core/tests/event-mocking/Util";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";

export function createERC20TransferEvent(token: Address, from: Address, to: Address, value: BigInt): Transfer {
  let event = changetype<Transfer>(mockContractEvent(token));
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("from", ethereum.Value.fromAddress(from));
  let param2 = new ethereum.EventParam("to", ethereum.Value.fromAddress(to));
  let param3 = new ethereum.EventParam("value", ethereum.Value.fromSignedBigInt(value));

  event.parameters.push(param1);
  event.parameters.push(param2);
  event.parameters.push(param3);

  return event as Transfer;
}
