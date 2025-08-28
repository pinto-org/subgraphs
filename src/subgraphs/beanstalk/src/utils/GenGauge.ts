import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { AddedGaugeGaugeStruct } from "../../generated/Beanstalk-ABIs/PintoPI8";
import { loadField } from "../entities/Field";
import { v } from "./constants/Version";
import { takeFieldSnapshots } from "../entities/snapshots/Field";
import { toDecimal } from "../../../../core/utils/Decimals";
import { loadSilo } from "../entities/Silo";
import { takeSiloSnapshots } from "../entities/snapshots/Silo";

export function initCultivationFactor(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const initValue = ethereum.decode("int256", initial.value)!.toBigInt();
  setCultivationFactor(toDecimal(initValue, 6), block);
}

export function engagedCultivationFactor(value: Bytes, block: ethereum.Block): void {
  const newValue = ethereum.decode("int256", value)!.toBigInt();
  setCultivationFactor(toDecimal(newValue, 6), block);
}

function setCultivationFactor(value: BigDecimal, block: ethereum.Block): void {
  const field = loadField(v().protocolAddress);
  field.cultivationFactor = value;
  takeFieldSnapshots(field, block);
  field.save();
}

export function initConvertDownPenalty(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const initValue = ethereum.decode("(uint256, uint256)", initial.value)!.toTuple();
  const initPenalty = initValue[0].toBigInt();
  setConvertDownPenalty(toDecimal(initPenalty, 18), block);
}

export function engagedConvertDownPenalty(value: Bytes, block: ethereum.Block): void {
  const newValue = ethereum.decode("(uint256, uint256)", value)!.toTuple();
  const newPenalty = newValue[0].toBigInt();
  setConvertDownPenalty(toDecimal(newPenalty, 18), block);
}

function setConvertDownPenalty(value: BigDecimal, block: ethereum.Block): void {
  const silo = loadSilo(v().protocolAddress);
  silo.convertDownPenalty = value;
  takeSiloSnapshots(silo, block);
  silo.save();
}

export function initConvertUpBonus(initial: AddedGaugeGaugeStruct, block: ethereum.Block) {
  //
}

export function engagedConvertUpBonus(value: Bytes, block: ethereum.Block) {
  //
}

export function engagedDataConvertUpBonus(data: ?, block: ethereum.Block) {
  //
}
