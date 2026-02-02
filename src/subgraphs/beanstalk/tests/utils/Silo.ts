import { BigInt, Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { BI_10 } from "../../../../core/utils/Decimals";
import { createMockedFunction } from "matchstick-as/assembly/index";

export function mockCropRatio(protocolAddress: Address, cropRatio: BigDecimal): void {
  const bigIntCropRatio = BigInt.fromString(
    cropRatio
      .times(new BigDecimal(BI_10.pow(18)))
      .truncate(0)
      .toString()
  );
  createMockedFunction(
    protocolAddress,
    "getBeanToMaxLpGpPerBdvRatioScaled",
    "getBeanToMaxLpGpPerBdvRatioScaled():(uint256)"
  ).returns([ethereum.Value.fromUnsignedBigInt(bigIntCropRatio)]);
}
