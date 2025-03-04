import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { handleSunrise } from "../../src/handlers/BeanstalkHandler";
import { createSunriseEvent } from "../event-mocking/Beanstalk";
import { mockPriceBelow } from "./MockBean";
import { BEANSTALK_PRICE } from "../../../../core/constants/raw/PintoBaseConstants";

export function mockSeason(seasonNumber: i32 = 1, block: ethereum.Block = s1Block): void {
  handleSunrise(createSunriseEvent(seasonNumber, block));
}

const s1Block = mockBlock();
s1Block.number = BigInt.fromString("13000000");
const s6074 = mockBlock();
s6074.number = BigInt.fromString("16000000");

export function mockBeanSeasons(block1: ethereum.Block = s1Block, block2: ethereum.Block = s6074): void {
  handleSunrise(createSunriseEvent(1, block1));
  handleSunrise(createSunriseEvent(6074, block2));
}

export function mockPintoSeasons(): void {
  mockPriceBelow(BEANSTALK_PRICE);
  mockSeason();
}
