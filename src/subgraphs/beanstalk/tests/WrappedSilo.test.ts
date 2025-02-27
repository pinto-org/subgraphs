import {
  afterEach,
  beforeEach,
  assert,
  clearStore,
  describe,
  test,
  createMockedFunction
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { createERC20TransferEvent } from "./event-mocking/Token";
import { v } from "../src/utils/constants/Version";
import { BI_MAX } from "../../../core/utils/Decimals";
import { ADDRESS_ZERO } from "../../../core/utils/Bytes";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { BEAN_ERC20 } from "../../../core/constants/raw/PintoBaseConstants";
import { handleWrappedDepositERC20Transfer } from "../src/handlers/WrappedSiloHandler";
import { Transfer } from "../generated/Beanstalk-ABIs/WrappedSiloERC20";

const sBean = Address.fromString("0x00b174d66adA7d63789087F50A9b9e0e48446dc1");
const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
const ADDR3 = Address.fromString("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc");

const transferEvt = (token: Address, from: Address, to: Address, amount: BigInt): Transfer => {
  return changetype<Transfer>(createERC20TransferEvent(token, from, to, amount));
};

describe("Token Transfer Events", () => {
  beforeEach(() => {
    initPintoVersion();
    createMockedFunction(sBean, "decimals", "decimals():(uint8)").returns([ethereum.Value.fromI32(18)]);
    createMockedFunction(sBean, "asset", "asset():(address)").returns([ethereum.Value.fromAddress(BEAN_ERC20)]);
  });
  afterEach(() => {
    clearStore();
  });

  describe("Wrapped Silo Token", () => {
    test("Initialization", () => {
      assert.notInStore("WrappedDepositERC20", sBean.toHexString());

      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "decimals", "18");
      assert.fieldEquals(
        "WrappedDepositERC20",
        sBean.toHexString(),
        "underlyingAsset",
        getProtocolToken(v(), BI_MAX).toHexString()
      );
    });

    test("Mint", () => {
      assert.notInStore("SiloAsset", `${v().protocolAddress.toHexString()}-${sBean.toHexString()}`);

      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));
      // assert.fieldEquals("SiloAsset", `${ADDR1.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "5000");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "5000");

      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("7000")));
      // assert.fieldEquals("SiloAsset", `${ADDR1.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "12000");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "12000");
    });

    test("Burn", () => {
      // Initial mint
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));

      // Burns
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDRESS_ZERO, BigInt.fromString("2000")));
      // assert.fieldEquals("SiloAsset", `${ADDR1.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "3000");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "3000");
    });

    test("Transfer - moves tracked balance between farmers", () => {
      // Initial mint
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));

      // Transfers
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDR2, BigInt.fromString("2000")));
      // assert.fieldEquals("SiloAsset", `${ADDR1.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "3000");
      // assert.fieldEquals("SiloAsset", `${ADDR2.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "2000");

      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDR3, BigInt.fromString("1000")));
      // assert.fieldEquals("SiloAsset", `${ADDR1.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "2000");
      // assert.fieldEquals("SiloAsset", `${ADDR2.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "2000");
      // assert.fieldEquals("SiloAsset", `${ADDR3.toHexString()}-${sBean.toHexString()}`, "circulatingAmount", "1000");

      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "5000");
    });
  });
});
