import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { BI_MAX, toDecimal, ZERO_BD, ZERO_BI } from "../../../../core/utils/Decimals";
import { getBeanPrice } from "./BeanstalkPrice";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { loadToken } from "../entities/Token";
import { PintoPI14 } from "../../generated/Basin-ABIs/PintoPI14";

export function getBeanPriceUDSC(): BigDecimal {
  let token = loadToken(getProtocolToken(v(), BI_MAX));
  return token.lastPriceUSD;
}

export function getTokenDecimals(tokenAddress: Address): i32 {
  let token = loadToken(tokenAddress);
  return token.decimals;
}

export function updateTokenUSD(
  tokenAddress: Address,
  blockNumber: BigInt,
  // Used as a fallback if getTokenUsdPrice fails. This wont be accurate as it doesnt consider the getTokenRates by well function
  beanToTokenRatio: BigDecimal = ZERO_BD
): void {
  let token = loadToken(tokenAddress);
  if (tokenAddress == getProtocolToken(v(), BI_MAX)) {
    const beanPrice = getBeanPrice(blockNumber);
    if (beanPrice === null) {
      return;
    }
    token.lastPriceUSD = beanPrice;
  } else {
    const beanstalkContract = PintoPI14.bind(v().protocolAddress);
    const tokenUsd = beanstalkContract.try_getTokenUsdPrice(tokenAddress);
    if (!tokenUsd.reverted) {
      token.lastPriceUSD = toDecimal(tokenUsd.value);
    } else {
      // This is considered an error if it occurs
      token.lastPriceUSD = beanToTokenRatio.times(getBeanPriceUDSC());
    }
  }
  token.lastPriceBlockNumber = blockNumber;
  token.save();
}
