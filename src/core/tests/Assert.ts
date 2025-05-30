import { assert } from "matchstick-as/assembly/index";
import { BigDecimal } from "@graphprotocol/graph-ts";
import { BigDecimal_abs } from "../utils/Decimals";

export function assertBDClose(
  expected: BigDecimal,
  actual: BigDecimal,
  precision: BigDecimal = BigDecimal.fromString("0.1")
): void {
  const diff = actual.minus(expected);
  assert.assertTrue(BigDecimal_abs(diff) < precision);
}
