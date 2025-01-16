import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { toDecimal } from "../../../../../core/utils/Decimals";

export enum TWAType {
  UNISWAP,
  CURVE,
  WELL_PUMP
}

export class TwaResults {
  reserves: BigInt[];
  deltaB: BigDecimal;
  beanPrice: BigDecimal;
  token2Price: BigDecimal | null;
  liquidity: LiquidityBreakdown | null;
}

export class DeltaBPriceLiquidity {
  deltaB: BigInt;
  price: BigDecimal;
  liquidity: BigDecimal;
}

export class LiquidityBreakdown {
  beanLiquidity: BigDecimal;
  nonBeanLiquidity: BigDecimal;
  totalLiquidity: BigDecimal;
}

export function calcLiquidity(
  reserves: BigInt[],
  tokenPrices: BigDecimal[],
  decimals: i32[],
  beanIndex: i32
): LiquidityBreakdown {
  const beanLiquidity = toDecimal(reserves[beanIndex], decimals[beanIndex]).times(tokenPrices[0]);
  const nonBeanLiquidity = toDecimal(reserves[1 - beanIndex], decimals[1 - beanIndex]).times(tokenPrices[1]);

  return {
    beanLiquidity: beanLiquidity.truncate(2),
    nonBeanLiquidity: nonBeanLiquidity.truncate(2),
    totalLiquidity: beanLiquidity.plus(nonBeanLiquidity).truncate(2)
  };
}
