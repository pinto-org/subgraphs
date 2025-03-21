import { Address, BigDecimal, store } from "@graphprotocol/graph-ts";
import { toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { Germinating } from "../../generated/schema";

export function loadOrCreateGerminating(address: Address, season: i32, isFarmer: boolean): Germinating {
  const type = germinationSeasonCategory(season);
  const id = address.toHexString() + "-" + type;
  let germinating = Germinating.load(id);
  if (germinating == null) {
    germinating = new Germinating(id);
    germinating.address = address;
    germinating.type = type;
    germinating.isFarmer = isFarmer;
    germinating.season = season;
    germinating.stalk = ZERO_BI;
    germinating.tokenAmount = ZERO_BI;
    germinating.bdv = ZERO_BI;
    germinating.save();
  }
  return germinating as Germinating;
}

export function loadGerminating(address: Address, enumValue: i32): Germinating {
  const id = address.toHexString() + "-" + germinationEnumCategory(enumValue);
  let germinating = Germinating.load(id);
  return germinating as Germinating;
}

export function tryLoadBothGerminating(address: Address): Array<Germinating | null> {
  return [Germinating.load(address.toHexString() + "-ODD"), Germinating.load(address.toHexString() + "-EVEN")];
}

export function getGerminatingBdvs(address: Address): Array<BigDecimal> {
  const germinatingState = tryLoadBothGerminating(address);
  return [
    germinatingState[0] !== null ? toDecimal(germinatingState[0]!.bdv) : ZERO_BD,
    germinatingState[1] !== null ? toDecimal(germinatingState[1]!.bdv) : ZERO_BD
  ];
}

export function deleteGerminating(germinating: Germinating): void {
  store.remove("Germinating", germinating.id);
}

export function germinationSeasonCategory(season: i32): string {
  return season % 2 == 0 ? "EVEN" : "ODD";
}

export function germinationEnumCategory(enumValue: i32): string {
  return enumValue == 0 ? "ODD" : "EVEN";
}
