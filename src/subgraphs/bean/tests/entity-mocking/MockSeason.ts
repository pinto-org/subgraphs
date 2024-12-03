import { ethereum } from "@graphprotocol/graph-ts";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { createNewSeason } from "../../src/entities/Season";

export function mockSeason(seasonNumber: u32 = 1, block: ethereum.Block = mockBlock()): void {
  createNewSeason(seasonNumber, block);
}

export function mockBeanSeasons(block1: ethereum.Block = mockBlock(), block2: ethereum.Block = mockBlock()): void {
  createNewSeason(1, block1);
  createNewSeason(6074, block2);
}
