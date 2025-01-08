import { assert, log } from "matchstick-as/assembly/index";
import { BigDecimal } from "@graphprotocol/graph-ts";
import { BigDecimal_abs } from "../utils/Decimals";

export function assertBDClose(expected: BigDecimal, actual: BigDecimal): void {
  const diff = actual.minus(expected);
  log.debug("{}: {} {}", [diff.toString(), expected.toString(), actual.toString()]);
  assert.assertTrue(BigDecimal_abs(diff) < BigDecimal.fromString("0.1"));
}
