import { afterEach, beforeEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { createERC20TransferEvent } from "./event-mocking/Token";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { v } from "../src/utils/constants/Version";
import { BI_MAX, ONE_BI } from "../../../core/utils/Decimals";
import { ADDRESS_ZERO } from "../../../core/utils/Bytes";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { loadSeason } from "../src/entities/Beanstalk";
import { handleBeanTransfer } from "../src/handlers/TokenHandler";

const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");

describe("Token Transfer Events", () => {
  beforeEach(() => {
    initPintoVersion();
    loadSeason(ONE_BI);
    assert.fieldEquals("Season", "1", "beans", "0");
  });
  afterEach(() => {
    clearStore();
  });

  describe("Bean Token", () => {
    test("Mint", () => {
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "7000");
    });

    test("Burn", () => {
      // Initial mint
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );

      // Burns
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDRESS_ZERO, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "3000");
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDRESS_ZERO, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "1000");
    });

    test("Transfer - no effect", () => {
      // Initial mint
      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDRESS_ZERO, ADDR1, BigInt.fromString("5000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");

      handleBeanTransfer(
        createERC20TransferEvent(getProtocolToken(v(), BI_MAX), ADDR1, ADDR2, BigInt.fromString("2000"))
      );
      assert.fieldEquals("Season", "1", "beans", "5000");
    });
  });
});
