import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AQUIFER,
  BEAN_ERC20,
  PINTO_CBBTC,
  PINTO_CBETH,
  PINTO_WSOL,
  PINTO_USDC,
  PINTO_WETH,
  WELL_STABLE2,
  POOL_TOKENS,
  TOKEN_INFOS,
  PRICE_2_BLOCK,
  BEANSTALK_PRICE_1,
  BEANSTALK_PRICE_2
} from "./raw/PintoBaseConstants";
import { beanDecimals, PoolTokens, Token, WellFnInfo } from "./RuntimeConstants";
import { BI_10 } from "../utils/Decimals";

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

export function getPoolTokens(): PoolTokens[] {
  return POOL_TOKENS;
}

export function getTokenInfos(): Token[] {
  return TOKEN_INFOS;
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
  return false;
}

export function getWhitelistedWells(): Address[] {
  return [PINTO_WETH, PINTO_CBETH, PINTO_CBBTC, PINTO_WSOL, PINTO_USDC];
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
  if (blockNumber < PRICE_2_BLOCK) {
    return BEANSTALK_PRICE_1;
  } else {
    return BEANSTALK_PRICE_2;
  }
}

export function minEMASeason(): i32 {
  return 2;
}

export function stalkDecimals(): i32 {
  return 16;
}

/// BASIN ///

export function wellMinimumBeanBalance(): BigInt {
  return BigInt.fromU32(10).times(BI_10.pow(<u8>beanDecimals()));
}

export function wellFnSupportsRate(wellFnAddress: Address): boolean {
  return true;
}

export function isStable2WellFn(wellFnAddress: Address): boolean {
  return wellFnAddress == WELL_STABLE2;
}

export function wellFnInfoForWell(wellAddress: Address): WellFnInfo {
  if (wellAddress == PINTO_USDC) {
    return {
      address: Address.fromString("0xba51055a97b40d7f41f3f64b57469b5d45b67c87"),
      data: Bytes.fromHexString(
        "0x00000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000006"
      )
    };
  } else {
    return {
      address: Address.fromString("0xba510c289fd067ebba41335afa11f0591940d6fe"),
      data: Bytes.fromHexString("0x")
    };
  }
}
