import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import * as ConstantsEth from "./raw/BeanstalkEthConstants";
import * as BeanstalkEth from "./BeanstalkEth";
import * as ConstantsArb from "./raw/BeanstalkArbConstants";
import * as BeanstalkArb from "./BeanstalkArb";
import * as ConstantsPintoBase from "./raw/PintoBaseConstants";
import * as PintoBase from "./PintoBase";

/// Used to determine the appropriate constants for subgraphs at runtime ///

export class VersionDto {
  subgraphName: string;
  versionNumber: string;
  protocolAddress: Address;
  chain: string;
}

export function getProtocolToken(v: VersionDto, blockNumber: BigInt): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getProtocolToken(blockNumber);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getProtocolToken();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getProtocolToken();
  }
  throw new Error("Unsupported protocol");
}

export function getProtocolFertilizer(v: VersionDto): Address | null {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getProtocolFertilizer();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getProtocolFertilizer();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getProtocolFertilizer();
  }
  throw new Error("Unsupported protocol");
}

export function getAquifer(v: VersionDto): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getAquifer();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getAquifer();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getAquifer();
  }
  throw new Error("Unsupported protocol");
}

export function getUnripeBeanAddr(v: VersionDto): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getUnripeBeanAddr();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getUnripeBeanAddr();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getUnripeBeanAddr();
  }
  throw new Error("Unsupported protocol");
}

export function getUnripeLpAddr(v: VersionDto): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getUnripeLpAddr();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getUnripeLpAddr();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getUnripeLpAddr();
  }
  throw new Error("Unsupported protocol");
}

export function isUnripe(v: VersionDto, token: Address): boolean {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.isUnripe(token);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.isUnripe(token);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.isUnripe(token);
  }
  throw new Error("Unsupported protocol");
}

export function getTokenDecimals(v: VersionDto, token: Address): i32 {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getTokenDecimals(token);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getTokenDecimals(token);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getTokenDecimals(token);
  }
  throw new Error("Unsupported protocol");
}

export function protocolHasUnripe(v: VersionDto): boolean {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.protocolHasUnripe();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.protocolHasUnripe();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.protocolHasUnripe();
  }
  throw new Error("Unsupported protocol");
}

export function getWhitelistedWells(v: VersionDto): Address[] {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getWhitelistedWells();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getWhitelistedWells();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getWhitelistedWells();
  }
  throw new Error("Unsupported protocol");
}

/// MILESTONE ///

export function isReplanted(v: VersionDto, blockNumber: BigInt): boolean {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.isReplanted(blockNumber);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.isReplanted();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.isReplanted();
  }
  throw new Error("Unsupported protocol");
}

export function isGaugeDeployed(v: VersionDto, blockNumber: BigInt): boolean {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.isGaugeDeployed(blockNumber);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.isGaugeDeployed();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.isGaugeDeployed();
  }
  throw new Error("Unsupported protocol");
}

export function getUnripeUnderlying(v: VersionDto, unripeToken: Address, blockNumber: BigInt): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getUnripeUnderlying(unripeToken, blockNumber);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getUnripeUnderlying(unripeToken, blockNumber);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getUnripeUnderlying(unripeToken, blockNumber);
  }
  throw new Error("Unsupported protocol");
}

export function getBeanstalkPriceAddress(v: VersionDto, blockNumber: BigInt): Address {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getBeanstalkPriceAddress(blockNumber);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getBeanstalkPriceAddress(blockNumber);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getBeanstalkPriceAddress(blockNumber);
  }
  throw new Error("Unsupported protocol");
}

export function minEMASeason(v: VersionDto): i32 {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.minEMASeason();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.minEMASeason();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.minEMASeason();
  }
  throw new Error("Unsupported protocol");
}

export function stalkDecimals(v: VersionDto): i32 {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.stalkDecimals();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.stalkDecimals();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.stalkDecimals();
  }
  throw new Error("Unsupported protocol");
}

export function beanDecimals(): i32 {
  return 6;
}

export class PoolTokens {
  pool: Address;
  tokens: Address[];
}
export function getTokensForPool(v: VersionDto, pool: Address): Address[] {
  const poolTokens = getPoolTokens(v);
  for (let i = 0; i < poolTokens.length; ++i) {
    if (poolTokens[i].pool == pool) {
      return poolTokens[i].tokens;
    }
  }
  throw new Error("Pool has not been configured");
}

export class Token {
  address: Address;
  info: TokenInfo;
}

export class TokenInfo {
  name: string;
  decimals: BigInt;
}
export function getTokenInfo(v: VersionDto, token: Address): TokenInfo {
  const tokens = getTokenInfos(v);
  for (let i = 0; i < tokens.length; ++i) {
    if (tokens[i].address == token) {
      return tokens[i].info;
    }
  }
  throw new Error("Token has not been configured");
}

/// BASIN ///

export function wellMinimumBeanBalance(v: VersionDto): BigInt {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.wellMinimumBeanBalance();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.wellMinimumBeanBalance();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.wellMinimumBeanBalance();
  }
  throw new Error("Unsupported protocol");
}

export function wellFnSupportsRate(v: VersionDto, wellFnAddress: Address): boolean {
  if (v.versionNumber == "TESTING") {
    return false;
  }
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.wellFnSupportsRate(wellFnAddress);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.wellFnSupportsRate(wellFnAddress);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.wellFnSupportsRate(wellFnAddress);
  }
  throw new Error("Unsupported protocol");
}

export function isStable2WellFn(v: VersionDto, wellFnAddress: Address): boolean {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.isStable2WellFn(wellFnAddress);
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.isStable2WellFn(wellFnAddress);
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.isStable2WellFn(wellFnAddress);
  }
  throw new Error("Unsupported protocol");
}

export class WellFnInfo {
  address: Address;
  data: Bytes;
}
export function wellFnInfoForWell(v: VersionDto, wellAddress: Address): WellFnInfo {
  if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.wellFnInfoForWell(wellAddress);
  }
  throw new Error("Unsupported protocol");
}

export function getPoolTokens(v: VersionDto): PoolTokens[] {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getPoolTokens();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getPoolTokens();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getPoolTokens();
  }
  throw new Error("Unsupported protocol");
}

function getTokenInfos(v: VersionDto): Token[] {
  if (v.chain == "ethereum" && v.protocolAddress == ConstantsEth.BEANSTALK) {
    return BeanstalkEth.getTokenInfos();
  } else if (v.chain == "arbitrum" && v.protocolAddress == ConstantsArb.BEANSTALK) {
    return BeanstalkArb.getTokenInfos();
  } else if (v.chain == "base" && v.protocolAddress == ConstantsPintoBase.BEANSTALK) {
    return PintoBase.getTokenInfos();
  }
  throw new Error("Unsupported protocol");
}
