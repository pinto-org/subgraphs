import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Incentivization, Sunrise } from "../../generated/Beanstalk-ABIs/PintoPI13";
import { mockBeanstalkEvent } from "../../../../core/tests/event-mocking/Util";

export function createSunriseEvent(season: i32, block: ethereum.Block | null = null): Sunrise {
  let event = changetype<Sunrise>(mockBeanstalkEvent());
  event.parameters = new Array();
  if (block !== null) {
    event.block = block;
  }
  let param1 = new ethereum.EventParam("season", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(season)));
  event.parameters.push(param1);
  return event as Sunrise;
}

export function createSeasonSnapshotEvent(
  season: i32,
  price: BigInt,
  supply: BigInt,
  stalk: BigInt,
  seeds: BigInt,
  podIndex: BigInt,
  harvestableIndex: BigInt
): void {}
export function createIncentivizationEvent(account: string, beans: BigInt): Incentivization {
  let event = changetype<Incentivization>(mockBeanstalkEvent());
  event.parameters = new Array();

  let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)));
  let param2 = new ethereum.EventParam("beans", ethereum.Value.fromUnsignedBigInt(beans));

  event.parameters.push(param1);
  event.parameters.push(param2);

  return event as Incentivization;
}

/** ===== Replant Events ===== */

export function createRewardEvent(season: BigInt, toField: BigInt, toSilo: BigInt, toFertilizer: BigInt): void {}
export function createMetapoolOracleEvent(season: BigInt, deltaB: BigInt, balances: BigInt[]): void {}
export function createSoilEvent(season: BigInt, soil: BigInt): void {}
