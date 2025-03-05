import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockContractEvent } from "../../../../core/tests/event-mocking/Util";
import { Update } from "../../generated/Beanstalk-ABIs/WrappedSiloERC20";

export function createUpdateEvent(address: Address, totalAssets: BigInt, totalShares: BigInt): Update {
  let event = changetype<Update>(mockContractEvent(address));
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("totalAssets", ethereum.Value.fromUnsignedBigInt(totalAssets));
  let param2 = new ethereum.EventParam("totalShares", ethereum.Value.fromUnsignedBigInt(totalShares));

  event.parameters.push(param1);
  event.parameters.push(param2);

  return event as Update;
}
