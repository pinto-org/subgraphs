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
import { BI_MAX, ZERO_BI } from "../../../core/utils/Decimals";
import { ADDRESS_ZERO } from "../../../core/utils/Bytes";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { getProtocolToken } from "../../../core/constants/RuntimeConstants";
import { BEAN_ERC20, BEANSTALK } from "../../../core/constants/raw/PintoBaseConstants";
import { handleUpdate, handleWrappedDepositERC20Transfer } from "../src/handlers/WrappedSiloHandler";
import { Transfer } from "../generated/Beanstalk-ABIs/WrappedSiloERC20";
import { createUpdateEvent } from "./event-mocking/WrappedSiloERC20";
import { WrappedDepositERC20HourlySnapshot } from "../generated/schema";
import { loadSeason } from "../src/entities/Beanstalk";
import { loadWrappedDeposit } from "../src/entities/Silo";
import { handleIncentive } from "../src/handlers/SeasonHandler";
import { createIncentivizationEvent } from "./event-mocking/Season";
import { mockSeasonStruct } from "./utils/Season";
import { mockHarvestableIndexWithFieldId } from "./utils/Field";

const sBean = Address.fromString("0x00b174d66adA7d63789087F50A9b9e0e48446dc1");
const ADDR1 = Address.fromString("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
const ADDR2 = Address.fromString("0x70997970c51812dc3a010c7d01b50e0d17dc79c8");
const ADDR3 = Address.fromString("0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc");

const transferEvt = (token: Address, from: Address, to: Address, amount: BigInt): Transfer => {
  return changetype<Transfer>(createERC20TransferEvent(token, from, to, amount));
};

// Sets the current beanstalk level season
const setSeason = (seasonNumber: i32): void => {
  loadSeason(BigInt.fromI32(seasonNumber)).season;
};

// Creates an hourly snapshot with the requested redemption rate
const setRateForSeason = (seasonNumber: i32, redeemRate: BigInt): void => {
  const hourlyId = sBean.toHexString() + "-" + seasonNumber.toString();
  const snapshot = new WrappedDepositERC20HourlySnapshot(hourlyId);
  snapshot.siloHourlySnapshot = hourlyId;
  snapshot.season = seasonNumber;
  snapshot.token = sBean;
  snapshot.supply = ZERO_BI;
  snapshot.redeemRate = redeemRate;
  snapshot.deltaSupply = ZERO_BI;
  snapshot.deltaRedeemRate = ZERO_BI;
  snapshot.createdAt = ZERO_BI;
  snapshot.updatedAt = ZERO_BI;
  snapshot.save();
};

describe("Wrapped Silo Token", () => {
  beforeEach(() => {
    initPintoVersion();
    createMockedFunction(sBean, "decimals", "decimals():(uint8)").returns([ethereum.Value.fromI32(18)]);
    createMockedFunction(sBean, "asset", "asset():(address)").returns([ethereum.Value.fromAddress(BEAN_ERC20)]);
  });
  afterEach(() => {
    clearStore();
  });

  describe("Token Transfer Events", () => {
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
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "5000");

      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("7000")));
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "12000");
    });

    test("Burn", () => {
      // Initial mint
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));

      // Burns
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDRESS_ZERO, BigInt.fromString("2000")));
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "3000");
    });

    test("Transfer - moves tracked balance between farmers", () => {
      // Initial mint
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDRESS_ZERO, ADDR1, BigInt.fromString("5000")));

      // Transfers
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDR2, BigInt.fromString("2000")));
      handleWrappedDepositERC20Transfer(transferEvt(sBean, ADDR1, ADDR3, BigInt.fromString("1000")));
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "supply", "5000");
    });
  });

  test("Update redeem rate", () => {
    createMockedFunction(sBean, "previewRedeem", "previewRedeem(uint256):(uint256)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1000000000000000000"))])
      .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromString("123456"))]);

    handleUpdate(createUpdateEvent(sBean, ZERO_BI, ZERO_BI));

    assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "redeemRate", "123456");
  });

  describe("Wrapped deposit vAPYs", () => {
    beforeEach(() => {
      createMockedFunction(sBean, "previewRedeem", "previewRedeem(uint256):(uint256)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1000000000000000000"))])
        .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromString("100000"))]);
    });

    test("Does nothing if too few datapoints", () => {
      handleUpdate(createUpdateEvent(sBean, ZERO_BI, ZERO_BI));

      const entity = loadWrappedDeposit(sBean);
      assert.assertTrue(entity.apy24h === null);
      assert.assertTrue(entity.apy7d === null);
      assert.assertTrue(entity.apy30d === null);
      assert.assertTrue(entity.apy90d === null);
    });

    test("Computes available apys", () => {
      setSeason(200);
      setRateForSeason(200 - 24, BigInt.fromString("90000"));
      setRateForSeason(200 - 168, BigInt.fromString("80000"));

      handleUpdate(createUpdateEvent(sBean, ZERO_BI, ZERO_BI));

      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy24h", "50290280116686499");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy7d", "113021.51419660976");
      const entity = loadWrappedDeposit(sBean);
      assert.assertTrue(entity.apy30d === null);
      assert.assertTrue(entity.apy90d === null);
    });

    test("Computes all apys", () => {
      setSeason(3000);
      setRateForSeason(3000 - 24, BigInt.fromString("95000"));
      setRateForSeason(3000 - 168, BigInt.fromString("90000"));
      setRateForSeason(3000 - 720, BigInt.fromString("80000"));
      setRateForSeason(3000 - 2160, BigInt.fromString("70000"));

      handleUpdate(createUpdateEvent(sBean, ZERO_BI, ZERO_BI));

      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy24h", "135171167.95466224");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy7d", "242.17912615260756");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy30d", "14.103299164274551");
      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy90d", "3.2482836334693996");
    });

    test("Updates apy at the start of new seasons", () => {
      setSeason(50);
      setRateForSeason(50 - 24, BigInt.fromString("95000"));
      handleUpdate(createUpdateEvent(sBean, ZERO_BI, ZERO_BI));

      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy24h", "135171167.95466224");

      setSeason(51);
      setRateForSeason(51 - 24, BigInt.fromString("96000"));

      mockSeasonStruct(BEANSTALK);
      mockHarvestableIndexWithFieldId(BEANSTALK, BigInt.fromString("25000"), ZERO_BI);
      handleIncentive(createIncentivizationEvent(ADDR1.toHexString(), BigInt.fromString("123456")));

      assert.fieldEquals("WrappedDepositERC20", sBean.toHexString(), "apy24h", "2958011.0616844987");
    });
  });
});
