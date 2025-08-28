import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { AddedGaugeGaugeStruct } from "../../generated/Beanstalk-ABIs/PintoPI12";
import { loadField } from "../entities/Field";
import { v } from "./constants/Version";
import { takeFieldSnapshots } from "../entities/snapshots/Field";
import { toDecimal } from "../../../../core/utils/Decimals";
import { loadSilo } from "../entities/Silo";
import { takeSiloSnapshots } from "../entities/snapshots/Silo";
import { GaugesInfo } from "../../generated/schema";
import { takeGaugesInfoSnapshots } from "../entities/snapshots/GaugesInfo";

export function loadGaugesInfo(): GaugesInfo {
  let genGauge = GaugesInfo.load("gauges");
  if (genGauge == null) {
    genGauge = new GaugesInfo("gauges");
    genGauge.g0IsActive = false;
    genGauge.g1IsActive = false;
    genGauge.g2IsActive = false;
    genGauge.save();
  }
  return genGauge;
}

export function initCultivationFactor(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  genGauge.g0IsActive = true;
  genGauge.save();
  engagedCultivationFactor(initial.value, block);
}

export function engagedCultivationFactor(value: Bytes, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  const decoded = ethereum.decode("int256", value)!.toBigInt();
  genGauge.g0CultivationFactor = toDecimal(decoded, 6);
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
  // Legacy gauge value location
  setCultivationFactor(genGauge.g0CultivationFactor!, block);
}

export function initConvertDownPenalty(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  genGauge.g1IsActive = true;
  genGauge.save();
  engagedConvertDownPenalty(initial.value, block);
}

export function engagedConvertDownPenalty(value: Bytes, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  const decoded = ethereum.decode("(uint256, uint256)", value)!.toTuple();
  genGauge.g1ConvertDownPenalty = toDecimal(decoded[0].toBigInt(), 18);
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
  // Legacy gauge value location
  setConvertDownPenalty(genGauge.g1ConvertDownPenalty!, block);
}

export function initConvertUpBonus(initial: AddedGaugeGaugeStruct, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  genGauge.g2IsActive = true;
  genGauge.save();
  engagedConvertUpBonus(initial.value, block);
}

export function engagedConvertUpBonus(value: Bytes, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  const decoded = ethereum.decode("(uint256, uint256, uint256)", value)!.toTuple();
  genGauge.g2BonusStalkPerBdv = decoded[0].toBigInt();
  genGauge.g2MaxConvertCapacity = decoded[1].toBigInt();
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
}

export function engagedDataConvertUpBonus(data: Bytes, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  const decoded = ethereum
    .decode("(uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)", data)!
    .toTuple();
  genGauge.g2BdvConvertedThisSeason = decoded[4].toBigInt();
  genGauge.g2MaxTwaDeltaB = decoded[6].toBigInt();
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
}

// * Legacy gauge value save location directly to related entities * //
function setCultivationFactor(value: BigDecimal, block: ethereum.Block): void {
  const field = loadField(v().protocolAddress);
  field.cultivationFactor = value;
  takeFieldSnapshots(field, block);
  field.save();
}

function setConvertDownPenalty(value: BigDecimal, block: ethereum.Block): void {
  const silo = loadSilo(v().protocolAddress);
  silo.convertDownPenalty = value;
  takeSiloSnapshots(silo, block);
  silo.save();
}
