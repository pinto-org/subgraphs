import { handleInitVersion } from "../../src/utils/constants/Version";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { BEANSTALK_BLOCK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { RESEED_BLOCK } from "../../../../core/constants/raw/BeanstalkArbConstants";

export function initL1Version(): void {
  handleInitVersion(mockBlock(BEANSTALK_BLOCK));
}

export function initL2Version(): void {
  handleInitVersion(mockBlock(RESEED_BLOCK));
}
