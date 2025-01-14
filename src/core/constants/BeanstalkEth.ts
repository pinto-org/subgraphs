import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  AQUIFER,
  BEAN_3CRV,
  BEAN_3CRV_V1,
  BEAN_ERC20,
  BEAN_ERC20_V1,
  BEAN_LUSD_V1,
  BEAN_WETH_CP2_WELL,
  BEAN_WETH_UNRIPE_MIGRATION_BLOCK,
  BEAN_WETH_V1,
  BEAN_WSTETH_CP2_WELL,
  BEAN_WSTETH_UNRIPE_MIGRATION_BLOCK,
  BEANSTALK_PRICE_1,
  BEANSTALK_PRICE_2,
  FERTILIZER,
  GAUGE_BIP45_BLOCK,
  NEW_BEAN_TOKEN_BLOCK,
  POOL_TOKENS,
  PRICE_2_BLOCK,
  REPLANT_BLOCK,
  REPLANT_SEASON,
  TOKEN_INFOS,
  UNRIPE_BEAN,
  UNRIPE_LP,
  WELL_CP2_1_0
} from "./raw/BeanstalkEthConstants";
import { Token, PoolTokens } from "./RuntimeConstants";

/// ADDRESSES ///

export function getProtocolToken(blockNumber: BigInt): Address {
  if (blockNumber < NEW_BEAN_TOKEN_BLOCK) {
    return BEAN_ERC20_V1;
  } else {
    return BEAN_ERC20;
  }
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
  } else if (token == BEAN_3CRV) {
    return 18;
  } else if (token == BEAN_WETH_CP2_WELL) {
    return 18;
  } else if (token == BEAN_WSTETH_CP2_WELL) {
    return 18;
  } else if (token == BEAN_ERC20_V1) {
    return 6;
  } else if (token == BEAN_WETH_V1) {
    return 18;
  } else if (token == BEAN_3CRV_V1) {
    return 18;
  } else if (token == BEAN_LUSD_V1) {
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
  return [BEAN_WETH_CP2_WELL, BEAN_WSTETH_CP2_WELL];
}

/// MILESTONE ///

export function isReplanted(blockNumber: BigInt): boolean {
  return blockNumber >= REPLANT_BLOCK;
}

export function isGaugeDeployed(blockNumber: BigInt): boolean {
  return blockNumber >= GAUGE_BIP45_BLOCK;
}

export function getUnripeUnderlying(unripeToken: Address, blockNumber: BigInt): Address {
  if (unripeToken == UNRIPE_BEAN) {
    return BEAN_ERC20;
  } else if (unripeToken == UNRIPE_LP) {
    if (blockNumber < BEAN_WETH_UNRIPE_MIGRATION_BLOCK) {
      return BEAN_3CRV;
    } else if (blockNumber < BEAN_WSTETH_UNRIPE_MIGRATION_BLOCK) {
      return BEAN_WETH_CP2_WELL;
    } else {
      return BEAN_WSTETH_CP2_WELL;
    }
  }
  throw new Error("Unsupported unripe token");
}

export function getBeanstalkPriceAddress(blockNumber: BigInt): Address {
  if (blockNumber < PRICE_2_BLOCK) {
    return BEANSTALK_PRICE_1;
  } else {
    return BEANSTALK_PRICE_2;
  }
}

export function minEMASeason(): i32 {
  return REPLANT_SEASON.toI32();
}

export function stalkDecimals(): i32 {
  return 10;
}

/// BASIN ///

export function wellFnSupportsRate(wellFnAddress: Address): boolean {
  return wellFnAddress != WELL_CP2_1_0;
}

export function isStable2WellFn(wellFnAddress: Address): boolean {
  return false;
}
