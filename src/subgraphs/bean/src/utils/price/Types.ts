import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export enum TWAType {
  UNISWAP,
  CURVE,
  WELL_PUMP
}

export class TwaResults {
  reserves: BigInt[];
  deltaB: BigInt;
  price: BigDecimal;
  token2Price: BigDecimal | null;
  liquidity: BigDecimal | null;
}

export class DeltaBPriceLiquidity {
  deltaB: BigInt;
  price: BigDecimal;
  liquidity: BigDecimal;
}
