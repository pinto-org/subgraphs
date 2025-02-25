import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { createERC20TransferEvent } from "./event-mocking/Token";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { v } from "../src/utils/constants/Version";
import { BI_MAX, ONE_BI } from "../../../core/utils/Decimals";
import { handleTransfer } from "../src/handlers/TokenHandler";
import { ADDRESS_ZERO } from "../../../core/utils/Bytes";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { loadSeason } from "../src/entities/Beanstalk";

const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
const ADDR3 = Address.fromString("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc");

describe("Token Transfer Events", () => {
  beforeEach(() => {
    initPintoVersion();
    loadSeason(ONE_BI);
    assert.fieldEquals("Season", "1", "beans", "0");
  });
  afterEach(() => {
    clearStore();
  });

  describe("Bean token", () => {
    test("Mint", () => {
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "7000");
    });

    test("Burn", () => {
      // Initial mint
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");

      // Burns
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDRESS_ZERO, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "3000");
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDRESS_ZERO, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "1000");
    });

    test("Transfer - no effect", () => {
      // Initial mint
      handleTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");

      handleTransfer(createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDR2, BigInt.fromString("2000")));
      assert.fieldEquals("Season", "1", "beans", "5000");
    });
  });

  describe("sBean token", () => {
    test("Mint", () => {
      //
    });

    test("Burn", () => {
      //
    });

    test("Transfer - moves tracked balance between farmers", () => {
      //
    });
  });
});
