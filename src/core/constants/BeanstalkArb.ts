import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  BEAN_ERC20,
  UNRIPE_BEAN,
  UNRIPE_LP,
  FERTILIZER,
  BEAN_WETH,
  BEAN_WSTETH,
  BEANSTALK_PRICE,
  RESEED_SEASON,
  BEAN_WEETH,
  BEAN_WBTC,
  BEAN_USDC,
  BEAN_USDT,
  AQUIFER,
  WELL_STABLE2,
  WELL_STABLE2_121,
  POOL_TOKENS,
  TOKEN_INFOS
} from "./raw/BeanstalkArbConstants";
import { Token, PoolTokens } from "./RuntimeConstants";

/// ADDRESSES ///

export function getProtocolToken(): Address {
  return BEAN_ERC20;
}

export function getProtocolFertilizer(): Address {
  return FERTILIZER;
}

export function getAquifer(): Address {
  return AQUIFER;
}

export function getUnripeBeanAddr(): Address {
  return UNRIPE_BEAN;
}

export function getUnripeLpAddr(): Address {
  return UNRIPE_LP;
}

export function isUnripe(token: Address): boolean {
  const unripeTokens = [getUnripeBeanAddr(), getUnripeLpAddr()];
  for (let i = 0; i < unripeTokens.length; ++i) {
    if (unripeTokens[i] == token) {
      return true;
    }
  }
  return false;
}

export function getPoolTokens(): PoolTokens[] {
  return POOL_TOKENS;
}

export function getTokenInfos(): Token[] {
  return TOKEN_INFOS;
}

export function getTokenDecimals(token: Address): i32 {
  if (token == BEAN_ERC20) {
    return 6;
  } else if (token == UNRIPE_BEAN) {
    return 6;
  } else if (token == UNRIPE_LP) {
    return 6;
  } else if (token == BEAN_WETH) {
    return 18;
  } else if (token == BEAN_WSTETH) {
    return 18;
  } else if (token == BEAN_WEETH) {
    return 18;
  } else if (token == BEAN_WBTC) {
    return 18;
  } else if (token == BEAN_USDC) {
    return 18;
  } else if (token == BEAN_USDT) {
    return 18;
  } else {
    for (let i = 0; i < TOKEN_INFOS.length; ++i) {
      if (TOKEN_INFOS[i].address.equals(token)) {
        return TOKEN_INFOS[i].info.decimals.toI32();
      }
    }
  }
  throw new Error("Unsupported token");
}

export function protocolHasUnripe(): boolean {
  return true;
}

export function getWhitelistedWells(): Address[] {
  return [BEAN_WETH, BEAN_WSTETH, BEAN_WEETH, BEAN_WBTC, BEAN_USDC, BEAN_USDT];
}

/// MILESTONE ///

export function isReplanted(): boolean {
  return true;
}

export function isGaugeDeployed(): boolean {
  return true;
}

export function getUnripeUnderlying(unripeToken: Address, blockNumber: BigInt): Address {
  if (unripeToken == UNRIPE_BEAN) {
    return BEAN_ERC20;
  } else if (unripeToken == UNRIPE_LP) {
    return BEAN_WSTETH;
  }
  throw new Error("Unsupported unripe token");
}

export function getBeanstalkPriceAddress(blockNumber: BigInt): Address {
  return BEANSTALK_PRICE;
}

export function minEMASeason(): i32 {
  return RESEED_SEASON.toI32();
}

export function stalkDecimals(): i32 {
  return 16;
}

/// BASIN ///

export function wellFnSupportsRate(wellFnAddress: Address): boolean {
  return true;
}

export function isStable2WellFn(wellFnAddress: Address): boolean {
  return wellFnAddress == WELL_STABLE2 || wellFnAddress == WELL_STABLE2_121;
}
