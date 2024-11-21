import { BASIN_BLOCK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { handleInitVersion } from "../../src/utils/constants/Version";

export function initL1Version(): void {
  handleInitVersion(mockBlock(BASIN_BLOCK));
}
