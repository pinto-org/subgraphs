import { beforeEach, afterEach, clearStore, describe, assert, test } from "matchstick-as/assembly/index";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { handleTransfer } from "../src/handlers/TokenHandler";
import { createERC20TransferEvent } from "./event-mocking/Token";
import { ADDRESS_ZERO } from "../../../core/utils/Bytes";
import { BEANSTALK, PINTO_WETH } from "../../../core/constants/raw/PintoBaseConstants";
import { handleInternalBalanceChanged } from "../src/handlers/BeanstalkHandler";
import { createInternalBalanceChangedEvent } from "./event-mocking/Beanstalk";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { v } from "../src/utils/constants/Version";
import { BI_MAX } from "../../../core/utils/Decimals";

const token = Address.fromString("0x00b174d66adA7d63789087F50A9b9e0e48446dc1");
const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");

describe("Token", () => {
  beforeEach(() => {
    initPintoVersion();
  });
  afterEach(() => {
    clearStore();
  });

  test("Tracks token supply", () => {
    assert.notInStore("Token", token.toHexString());

    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, ADDR1, BigInt.fromString("2000")));

    assert.fieldEquals("Token", token.toHexString(), "supply", "2000");
  });

  test("Tracks wallet balances", () => {
    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, ADDR1, BigInt.fromString("2000")));
    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, ADDR2, BigInt.fromString("3000")));

    assert.fieldEquals("Token", token.toHexString(), "supply", "5000");
    assert.fieldEquals("Token", token.toHexString(), "walletBalance", "5000");
    assert.fieldEquals("Token", token.toHexString(), "farmBalance", "0");
    assert.fieldEquals("Token", token.toHexString(), "pooledBalance", "0");
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "totalBalance", "2000");
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "walletBalance", "2000");
    assert.fieldEquals("FarmerBalance", `${ADDR2.toHexString()}-${token.toHexString()}`, "walletBalance", "3000");
  });

  test("Tracks pool balances", () => {
    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, PINTO_WETH, BigInt.fromString("3000")));

    assert.fieldEquals("Token", token.toHexString(), "supply", "3000");
    assert.fieldEquals("Token", token.toHexString(), "walletBalance", "0");
    assert.fieldEquals("Token", token.toHexString(), "farmBalance", "0");
    assert.fieldEquals("Token", token.toHexString(), "pooledBalance", "3000");
    // No farmer gets created for the pool
    assert.notInStore("FarmerBalance", `${PINTO_WETH.toHexString()}-${token.toHexString()}`);
  });

  test("Tracks farm balances (neutralizes transfer)", () => {
    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, BEANSTALK, BigInt.fromString("6000")));
    handleInternalBalanceChanged(createInternalBalanceChangedEvent(ADDR1, token, BigInt.fromString("6000")));

    assert.fieldEquals("Token", token.toHexString(), "supply", "6000");
    assert.fieldEquals("Token", token.toHexString(), "walletBalance", "0");
    assert.fieldEquals("Token", token.toHexString(), "farmBalance", "6000");
    assert.fieldEquals("Token", token.toHexString(), "pooledBalance", "0");
    assert.notInStore("FarmerBalance", `${BEANSTALK.toHexString()}-${token.toHexString()}`);
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "totalBalance", "6000");
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "farmBalance", "6000");
  });

  test("Tracks combined balances", () => {
    handleTransfer(createERC20TransferEvent(token, ADDRESS_ZERO, ADDR1, BigInt.fromString("8000")));
    handleTransfer(createERC20TransferEvent(token, ADDR1, PINTO_WETH, BigInt.fromString("3000")));

    assert.fieldEquals("Token", token.toHexString(), "supply", "8000");
    assert.fieldEquals("Token", token.toHexString(), "walletBalance", "5000");
    assert.fieldEquals("Token", token.toHexString(), "farmBalance", "0");
    assert.fieldEquals("Token", token.toHexString(), "pooledBalance", "3000");
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "totalBalance", "5000");
    assert.fieldEquals("FarmerBalance", `${ADDR1.toHexString()}-${token.toHexString()}`, "walletBalance", "5000");
    assert.notInStore("FarmerBalance", `${PINTO_WETH.toHexString()}-${token.toHexString()}`);
  });

  test("Does not initiate token tracking via internal balance changed", () => {
    handleInternalBalanceChanged(createInternalBalanceChangedEvent(ADDR1, token, BigInt.fromString("6000")));

    assert.notInStore("Token", token.toHexString());
    assert.notInStore("FarmerBalance", `${BEANSTALK.toHexString()}-${token.toHexString()}`);
  });

  test("Additional processing for Bean transfers", () => {
    const bean = getProtocolToken(v(), BI_MAX);
    handleTransfer(createERC20TransferEvent(bean, ADDRESS_ZERO, ADDR1, BigInt.fromString("9000")));

    assert.fieldEquals("Bean", bean.toHexString(), "supply", "9000");

    handleTransfer(createERC20TransferEvent(bean, ADDR1, ADDR2, BigInt.fromString("1000")));

    assert.fieldEquals("Bean", bean.toHexString(), "supply", "9000");
  });
});
