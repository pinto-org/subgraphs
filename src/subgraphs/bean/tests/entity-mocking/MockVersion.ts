import { BigInt } from "@graphprotocol/graph-ts";
import { handleInitVersion } from "../../src/utils/constants/Version";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { Version } from "../../generated/schema";

export function initL1Version(): void {
  handleInitVersion(mockBlock(BigInt.fromU32(12974075)));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();
}
