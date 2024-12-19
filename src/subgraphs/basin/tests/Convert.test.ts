import { afterEach, assert, beforeEach, clearStore, describe, test } from "matchstick-as/assembly/index";
import { mockAddLiquidity } from "./helpers/Liquidity";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { borePintoWells } from "./helpers/Aquifer";
import { mockTransaction } from "../../../core/tests/event-mocking/Transaction";

describe("Convert Tests", () => {
  beforeEach(() => {
    initPintoVersion();
    borePintoWells();
  });

  afterEach(() => {
    clearStore();
  });

  test("Identifies Pinto -> LP convert", () => {
    const transaction = mockTransaction();
    mockAddLiquidity();
    //
  });
  test("Identifies LP -> Pinto convert", () => {
    //
  });
  test("Identifies LP -> LP convert", () => {
    //
  });
  test("Doesn't incorrectly identify converts", () => {
    //
  });
});
