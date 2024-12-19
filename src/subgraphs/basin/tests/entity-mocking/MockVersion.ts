import { BASIN_BLOCK as L1_BASIN_BLOCK } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { BASIN_BLOCK as PINTO_BASIN_BLOCK } from "../../../../core/constants/raw/PintoBaseConstants";
import { mockBlock } from "../../../../core/tests/event-mocking/Block";
import { handleInitVersion } from "../../src/utils/constants/Version";

export function initL1Version(): void {
  handleInitVersion(mockBlock(L1_BASIN_BLOCK));
}

export function initPintoVersion(): void {
  handleInitVersion(mockBlock(PINTO_BASIN_BLOCK));
}
