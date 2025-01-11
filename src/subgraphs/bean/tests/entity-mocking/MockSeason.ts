import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { handleSunrise } from "../../src/handlers/BeanstalkHandler";
import { createSunriseEvent } from "../event-mocking/Beanstalk";
import { setMockBeanPrice } from "../../../../core/tests/event-mocking/Price";
import { ONE_BI } from "../../../../core/utils/Decimals";

export function mockSeason(seasonNumber: i32 = 1, block: ethereum.Block = mockBlock()): void {
  setMockBeanPrice({
    price: BigInt.fromString("1050000"),
    liquidity: BigInt.fromString("123456"),
    deltaB: ONE_BI,
    ps: []
  });
  handleSunrise(createSunriseEvent(seasonNumber, block));
}

export function mockBeanSeasons(block1: ethereum.Block = mockBlock(), block2: ethereum.Block = mockBlock()): void {
  setMockBeanPrice({
    price: BigInt.fromString("1050000"),
    liquidity: BigInt.fromString("123456"),
    deltaB: ONE_BI,
    ps: []
  });
  handleSunrise(createSunriseEvent(1, block1));
  handleSunrise(createSunriseEvent(6074, block2));
}
