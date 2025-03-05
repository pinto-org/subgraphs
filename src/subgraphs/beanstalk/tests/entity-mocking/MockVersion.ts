import { handleInitVersion } from "../../src/utils/constants/Version";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { BEANSTALK_BLOCK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { RESEED_BLOCK } from "../../../../core/constants/raw/BeanstalkArbConstants";
import { PINTOSTALK_BLOCK } from "../../../../core/constants/raw/PintoBaseConstants";
import { Version } from "../../generated/schema";

export function initL1Version(): void {
  handleInitVersion(mockBlock(BEANSTALK_BLOCK));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();
}

export function initL2Version(): void {
  handleInitVersion(mockBlock(RESEED_BLOCK));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();
}

export function initPintoVersion(): void {
  handleInitVersion(mockBlock(PINTOSTALK_BLOCK));
  const versionEntity = Version.load("subgraph")!;
  versionEntity.versionNumber = "TESTING";
  versionEntity.save();
}
