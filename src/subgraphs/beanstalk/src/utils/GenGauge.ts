import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import { AddedGaugeGaugeStruct } from "../../generated/Beanstalk-ABIs/PintoPI6";
import { loadField } from "../entities/Field";
import { v } from "./constants/Version";
import { takeFieldSnapshots } from "../entities/snapshots/Field";
import { toDecimal } from "../../../../core/utils/Decimals";

export function initCultivationFactor(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const initValue = ethereum.decode("int256", initial.value)!.toBigInt();

  const field = loadField(v().protocolAddress);
  field.cultivationFactor = toDecimal(initValue, 6);
  takeFieldSnapshots(field, block);
  field.save();
}

export function engagedCultivationFactor(value: Bytes, block: ethereum.Block): void {
  const newValue = ethereum.decode("int256", value)!.toBigInt();

  const field = loadField(v().protocolAddress);
  field.cultivationFactor = toDecimal(newValue, 6);
  takeFieldSnapshots(field, block);
  field.save();
}
