import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BASIN_BLOCK, BEAN_ERC20, WETH } from "../../../../core/constants/raw/BeanstalkEthConstants";
import { handleShift, handleSwap } from "../../src/handlers/WellHandler";
import { BEAN_SWAP_AMOUNT, SWAP_ACCOUNT, WELL, WETH_SWAP_AMOUNT } from "./Constants";
import { createContractCallMocks } from "./Functions";
import { createShiftEvent, createSwapEvent } from "./Well";
import { ONE_BD } from "../../../../core/utils/Decimals";
import { Shift, Swap } from "../../generated/Basin-ABIs/Well";

export function mockSwap(beanPriceMultiple: BigDecimal = ONE_BD): Swap {
  createContractCallMocks(beanPriceMultiple);
  const event = createSwapEvent(WELL, SWAP_ACCOUNT, BEAN_ERC20, WETH, BEAN_SWAP_AMOUNT, WETH_SWAP_AMOUNT);
  event.block.number = BASIN_BLOCK;
  handleSwap(event);
  return event;
}

export function mockShift(
  newReserves: BigInt[],
  toToken: Address,
  amountOut: BigInt,
  beanPriceMultiple: BigDecimal = ONE_BD
): Shift {
  createContractCallMocks(beanPriceMultiple);
  const event = createShiftEvent(WELL, SWAP_ACCOUNT, newReserves, toToken, amountOut);
  event.block.number = BASIN_BLOCK;
  handleShift(event);
  return event;
}
