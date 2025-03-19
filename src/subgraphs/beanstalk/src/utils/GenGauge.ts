import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { AddedGaugeGaugeStruct } from "../../generated/Beanstalk-ABIs/PintoPI6";

export function initCultivationFactor(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const initValue = ethereum.decode("int256", initial.value)!.toBigInt();
}

export function engagedCultivationFactor(value: Bytes, block: ethereum.Block): void {
  const newValue = ethereum.decode("int256", value)!.toBigInt();
}
