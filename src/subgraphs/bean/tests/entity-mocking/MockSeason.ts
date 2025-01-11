import { ethereum } from "@graphprotocol/graph-ts";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { handleSunrise } from "../../src/handlers/BeanstalkHandler";
import { createSunriseEvent } from "../event-mocking/Beanstalk";

export function mockSeason(seasonNumber: i32 = 1, block: ethereum.Block = mockBlock()): void {
  handleSunrise(createSunriseEvent(seasonNumber, block));
}

export function mockBeanSeasons(block1: ethereum.Block = mockBlock(), block2: ethereum.Block = mockBlock()): void {
  handleSunrise(createSunriseEvent(1, block1));
  handleSunrise(createSunriseEvent(6074, block2));
}
