import { Address, BigDecimal, BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  allNonzero_BI,
  BI_10,
  emptyBigDecimalArray,
  emptyBigIntArray,
  ONE_BI,
  toDecimal,
  ZERO_BI
} from "../../../../core/utils/Decimals";
import { loadWell, updateWellLiquidityUSD } from "../entities/Well";
import { getTokenDecimals, updateTokenUSD } from "./Token";
import { getProtocolToken, isStable2WellFn, wellFnSupportsRate } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { loadToken } from "../entities/Token";
import { Well } from "../../generated/schema";
import { WellFunction } from "../../generated/Basin-ABIs/WellFunction";
import { toAddress } from "../../../../core/utils/Bytes";
import { calcRates } from "./legacy/CP2";
import { loadOrCreateWellFunction } from "../entities/WellComponents";

export function getCalculatedReserveUSDValues(tokens: Bytes[], reserves: BigInt[]): BigDecimal[] {
  let results = emptyBigDecimalArray(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    let token = loadToken(toAddress(tokens[i]));
    results[i] = toDecimal(reserves[i], token.decimals).times(token.lastPriceUSD);
  }
  return results;
}

export function updateWellTokenUSDPrices(wellAddress: Address, blockNumber: BigInt): void {
  let well = loadWell(wellAddress);
  if (!allNonzero_BI(well.reserves)) {
    return;
  }

  // Update the BEAN price first as it is the reference for other USD calculations
  const beanToken = getProtocolToken(v(), blockNumber);
  updateTokenUSD(beanToken, blockNumber, BigDecimal.fromString("1"));
  let beanIndex = well.tokens.indexOf(beanToken);
  // Curretly only supporting USD values for Wells with BEAN as a token.
  if (beanIndex == -1) {
    return;
  }
  let currentBeans = toDecimal(well.reserves[beanIndex]);

  for (let i = 0; i < well.tokens.length; i++) {
    if (i == beanIndex) {
      continue;
    }
    let tokenAddress = toAddress(well.tokens[i]);
    if (well.reserves[i].gt(ZERO_BI)) {
      updateTokenUSD(
        tokenAddress,
        blockNumber,
        currentBeans.div(toDecimal(well.reserves[i], getTokenDecimals(tokenAddress)))
      );
    }
  }
  updateWellLiquidityUSD(well);
  well.save();
}

// Value at index i is how much of token i is received in exchange for one of token 1 - i.
export function getTokenPrices(well: Well): BigInt[] {
  if (!allNonzero_BI(well.reserves)) {
    return emptyBigIntArray(well.reserves.length);
  }

  const wellFn = loadOrCreateWellFunction(toAddress(well.wellFunction));
  const wellFnAddress = toAddress(wellFn.id);
  const wellFnContract = WellFunction.bind(wellFnAddress);

  let rates: BigInt[] = [];
  if (wellFnSupportsRate(v(), wellFnAddress)) {
    rates = [
      wellFnContract.calcRate(well.reserves, ZERO_BI, ONE_BI, well.wellFunctionData),
      wellFnContract.calcRate(well.reserves, ONE_BI, ZERO_BI, well.wellFunctionData)
    ];
    // Stable2 does not require transforming rates. Otherwise, the rates are given with this precision:
    // quoteToken + 18 - baseToken
    if (!isStable2WellFn(v(), wellFnAddress)) {
      const decimalsToRemove = [
        18 - getTokenDecimals(toAddress(well.tokens[1])),
        18 - getTokenDecimals(toAddress(well.tokens[0]))
      ];
      rates[0] = rates[0].div(BI_10.pow(<u8>decimalsToRemove[0]));
      rates[1] = rates[1].div(BI_10.pow(<u8>decimalsToRemove[1]));
    }
  } else {
    // In practice only the original constant product well does not support calcRate
    rates = calcRates(well.reserves, [
      getTokenDecimals(toAddress(well.tokens[0])),
      getTokenDecimals(toAddress(well.tokens[1]))
    ]);
  }
  return rates;
}
