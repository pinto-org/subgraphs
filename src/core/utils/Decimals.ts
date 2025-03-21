import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";

export const DEFAULT_DECIMALS = 6;

export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);
export const BI_6 = BigInt.fromI32(6);
export const BI_10 = BigInt.fromI32(10);
export const BI_MAX = BigInt.fromUnsignedBytes(
  Bytes.fromHexString("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
);
export const BD_MAX = new BigDecimal(BI_MAX);
export const ZERO_BD = BigDecimal.fromString("0");
export const ONE_BD = BigDecimal.fromString("1");
export const BD_10 = BigDecimal.fromString("10");

export function pow(base: BigDecimal, exponent: number): BigDecimal {
  let result = base;

  if (exponent == 0) {
    return BigDecimal.fromString("1");
  }

  for (let i = 2; i <= exponent; i++) {
    result = result.times(base);
  }

  return result;
}

export function sqrt(value: BigDecimal, tolerance: BigDecimal = BigDecimal.fromString("0.0000001")): BigDecimal {
  if (value.equals(ZERO_BD)) {
    return ZERO_BD;
  }

  let x: BigDecimal = value;
  let lastX: BigDecimal = ZERO_BD;

  // Iteratively improve the guess
  while (true) {
    lastX = x;
    x = value.div(x).plus(x).div(BigDecimal.fromString("2"));

    // Check if the difference is within the tolerance level
    if (
      lastX.minus(x).equals(ZERO_BD) ||
      (lastX.minus(x).toString().startsWith("-") && lastX.minus(x).toString().substring(1) < tolerance.toString()) ||
      (!lastX.minus(x).toString().startsWith("-") && lastX.minus(x).toString() < tolerance.toString())
    ) {
      break;
    }
  }

  return x;
}

export function toDecimal(value: BigInt, decimals: number = DEFAULT_DECIMALS): BigDecimal {
  let precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}

export function toBigInt(value: BigDecimal, decimals: number = DEFAULT_DECIMALS): BigInt {
  let precision = 10 ** decimals;
  return BigInt.fromString(value.times(BigDecimal.fromString(precision.toString())).truncate(0).toString());
}

export function emptyBigIntArray(length: i32): BigInt[] {
  let array = [ZERO_BI, ZERO_BI];
  for (let i = 2; i < length; i++) array.push(ZERO_BI);
  return array;
}

export function emptyBigDecimalArray(length: i32): BigDecimal[] {
  let array = [ZERO_BD, ZERO_BD];
  for (let i = 2; i < length; i++) array.push(ZERO_BD);
  return array;
}

export function addBigIntArray(a: BigInt[], b: BigInt[]): BigInt[] {
  let finalArray = emptyBigIntArray(a.length);
  for (let i = 0; i < a.length; i++) {
    finalArray[i] = a[i].plus(b[i]);
  }
  return finalArray;
}

export function subBigIntArray(a: BigInt[], b: BigInt[]): BigInt[] {
  let finalArray = emptyBigIntArray(a.length);
  for (let i = 0; i < a.length; i++) {
    finalArray[i] = a[i].minus(b[i]);
  }
  return finalArray;
}

export function addBigDecimalArray(a: BigDecimal[], b: BigDecimal[]): BigDecimal[] {
  let finalArray = emptyBigDecimalArray(a.length);
  for (let i = 0; i < a.length; i++) {
    finalArray[i] = a[i].plus(b[i]);
  }
  return finalArray;
}

export function subBigDecimalArray(a: BigDecimal[], b: BigDecimal[]): BigDecimal[] {
  let finalArray = emptyBigDecimalArray(a.length);
  for (let i = 0; i < a.length; i++) {
    finalArray[i] = a[i].minus(b[i]);
  }
  return finalArray;
}

export function getBigDecimalArrayTotal(detail: BigDecimal[]): BigDecimal {
  let total = ZERO_BD;
  for (let i = 0; i < detail.length; i++) total = total.plus(detail[i]);
  return total;
}

export function BigDecimal_isClose(value: BigDecimal, target: BigDecimal, window: BigDecimal): boolean {
  return target.minus(window) < value && value < target.plus(window);
}

export function BigDecimal_round(value: BigDecimal): BigDecimal {
  return value.plus(BigDecimal.fromString("0.5")).truncate(0);
}

export function allNonzero_BI(a: BigInt[]): boolean {
  for (let i = 0; i < a.length; ++i) {
    if (a[i] == ZERO_BI) {
      return false;
    }
  }
  return true;
}

export function BigDecimal_abs(a: BigDecimal): BigDecimal {
  return a < ZERO_BD ? a.neg() : a;
}
