import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  AQUIFER,
  BEAN_ERC20,
  BEANSTALK_PRICE,
  PINTO_CBBTC,
  PINTO_CBETH,
  PINTO_WSOL,
  PINTO_USDC,
  PINTO_WETH,
  WELL_STABLE2
} from "./raw/PintoBaseConstants";

/// ADDRESSES ///

export function getProtocolToken(): Address {
  return BEAN_ERC20;
}

export function getProtocolFertilizer(): Address | null {
  return null;
}

export function getAquifer(): Address {
  return AQUIFER;
}

export function getUnripeBeanAddr(): Address {
  throw new Error("This protocol does not have unripe");
}

export function getUnripeLpAddr(): Address {
  throw new Error("This protocol does not have unripe");
}

export function isUnripe(token: Address): boolean {
  return false;
}

export function getTokenDecimals(token: Address): i32 {
  if (token == BEAN_ERC20) {
    return 6;
  } else if (token == PINTO_WETH) {
    return 18;
  } else if (token == PINTO_CBETH) {
    return 18;
  } else if (token == PINTO_CBBTC) {
    return 18;
  } else if (token == PINTO_WSOL) {
    return 18;
  } else if (token == PINTO_USDC) {
    return 18;
  }
  throw new Error("Unsupported token");
}

export function protocolHasUnripe(): boolean {
  return false;
}

/// MILESTONE ///

export function isReplanted(): boolean {
  return true;
}

export function isGaugeDeployed(): boolean {
  return true;
}

export function getUnripeUnderlying(unripeToken: Address, blockNumber: BigInt): Address {
  throw new Error("This protocol does not have unripe");
}

export function getBeanstalkPriceAddress(blockNumber: BigInt): Address {
  return BEANSTALK_PRICE;
}

export function minEMASeason(): i32 {
  return 2;
}

export function stalkDecimals(): i32 {
  return 16;
}

/// BASIN ///

export function wellFnSupportsRate(wellFnAddress: Address): boolean {
  return true;
}

export function isStable2WellFn(wellFnAddress: Address): boolean {
  return wellFnAddress == WELL_STABLE2;
}
