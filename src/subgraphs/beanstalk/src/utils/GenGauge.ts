import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { AddedGaugeGaugeStruct } from "../../generated/Beanstalk-ABIs/PintoPI14";
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

export function toggleGaugeActive(gaugeId: i32, isActive: boolean, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  if (gaugeId == 0) {
    genGauge.g0IsActive = isActive;
  } else if (gaugeId == 1) {
    genGauge.g1IsActive = isActive;
  } else if (gaugeId == 2) {
    genGauge.g2IsActive = isActive;
  }
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
}

export function engaged(gaugeId: i32, value: Bytes, block: ethereum.Block): void {
  if (gaugeId == 0) {
    engagedCultivationFactor(value, block);
  } else if (gaugeId == 1) {
    engagedConvertDownPenalty(value, block);
  } else if (gaugeId == 2) {
    engagedConvertUpBonus(value, block);
  }
}

export function engagedData(gaugeId: i32, data: Bytes, block: ethereum.Block): void {
  if (gaugeId == 2) {
    engagedDataConvertUpBonus(data, block);
  }
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

export function engagedConvertDownPenalty(value: Bytes, block: ethereum.Block): void {
  const genGauge = loadGaugesInfo();
  const decoded = ethereum.decode("(uint256, uint256)", value)!.toTuple();
  genGauge.g1ConvertDownPenalty = toDecimal(decoded[0].toBigInt(), 18);
  genGauge.g1BlightFactor = decoded[1].toBigInt();
  takeGaugesInfoSnapshots(genGauge, block);
  genGauge.save();
  // Legacy gauge value location
  setConvertDownPenalty(genGauge.g1ConvertDownPenalty!, block);
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
    .decode("(uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)", data)!
    .toTuple();
  genGauge.g2BdvConvertedThisSeason = decoded[5].toBigInt();
  genGauge.g2MaxTwaDeltaB = decoded[7].toBigInt();
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
