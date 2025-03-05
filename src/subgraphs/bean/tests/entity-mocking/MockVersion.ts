import { BigInt } from "@graphprotocol/graph-ts";
import { handleInitVersion } from "../../src/utils/constants/Version";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { Version } from "../../generated/schema";
import { PINTOSTALK_BLOCK } from "../../../../core/constants/raw/PintoBaseConstants";
import { mockPintoSeasons } from "./MockSeason";

export function initL1Version(): void {
  handleInitVersion(mockBlock(BigInt.fromU32(12974075)));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();
}

export function initPintoVersion(): void {
  handleInitVersion(mockBlock(PINTOSTALK_BLOCK));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();

  mockPintoSeasons();
}
