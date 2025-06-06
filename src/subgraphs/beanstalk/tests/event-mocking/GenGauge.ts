import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { mockContractEvent } from "../../../../core/tests/event-mocking/Util";
import { AddedGauge, Engaged } from "../../generated/Beanstalk-ABIs/PintoPI8";
import { v } from "../../src/utils/constants/Version";

export function createAddedGaugeEvent(
  gaugeId: i32,
  value: Bytes,
  target: Address,
  selector: Bytes,
  data: Bytes
): AddedGauge {
  let event = changetype<AddedGauge>(mockContractEvent(v().protocolAddress));
  event.parameters = new Array();

  let gaugeTuple = new ethereum.Tuple();
  gaugeTuple.push(ethereum.Value.fromBytes(value));
  gaugeTuple.push(ethereum.Value.fromAddress(target));
  gaugeTuple.push(ethereum.Value.fromBytes(selector));
  gaugeTuple.push(ethereum.Value.fromBytes(data));

  let param1 = new ethereum.EventParam("gaugeId", ethereum.Value.fromI32(gaugeId));
  let param2 = new ethereum.EventParam("gauge", ethereum.Value.fromTuple(gaugeTuple));

  event.parameters.push(param1);
  event.parameters.push(param2);

  return event as AddedGauge;
}

export function createEngagedEvent(gaugeId: i32, value: Bytes): Engaged {
  let event = changetype<Engaged>(mockContractEvent(v().protocolAddress));
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("gaugeId", ethereum.Value.fromI32(gaugeId));
  let param2 = new ethereum.EventParam("value", ethereum.Value.fromBytes(value));

  event.parameters.push(param1);
  event.parameters.push(param2);

  return event as Engaged;
}
