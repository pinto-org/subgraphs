import { beforeEach, beforeAll, afterEach, assert, clearStore, describe, test } from "matchstick-as/assembly/index";
import { BigInt, Bytes, BigDecimal, log } from "@graphprotocol/graph-ts";
// import { log } from "matchstick-as/assembly/log";
import { BI_10, ONE_BI, toDecimal, ZERO_BI } from "../../../core/utils/Decimals";
import { createMetapoolOracleEvent, createWellOracleEvent } from "./event-mocking/Beanstalk";
import {
  BEAN_3CRV,
  BEAN_ERC20,
  BEAN_WETH_CP2_WELL,
  CRV3_POOL,
  GAUGE_BIP45_BLOCK
} from "../../../core/constants/raw/BeanstalkEthConstants";
import { hourFromTimestamp } from "../../../core/utils/Dates";
import { mockBlock } from "../../../core/tests/event-mocking/Block";
import { uniswapV2DeltaB } from "../src/utils/price/UniswapPrice";
import { decodeCumulativeWellReserves } from "../src/utils/price/WellPrice";
import { mock_virtual_price } from "./event-mocking/Curve";
import { getD, getY, priceFromY } from "../src/utils/price/CurvePrice";
import { pow2toX } from "../../../core/utils/ABDKMathQuad";
import { loadBean } from "../src/entities/Bean";
import { loadOrCreatePool } from "../src/entities/Pool";
import { initL1Version } from "./entity-mocking/MockVersion";
import { handleMetapoolOracle, handleWellOracle_beanstalk } from "../src/handlers/legacy/LegacyBeanstalkHandler";
import { mockBeanSeasons } from "./entity-mocking/MockSeason";
import { mockPriceBelow, mockWhitelistedPools } from "./entity-mocking/MockBean";
import { takePoolSnapshots } from "../src/entities/snapshots/Pool";
import { takeBeanSnapshots } from "../src/entities/snapshots/Bean";

const timestamp1 = BigInt.fromU32(1712793374);
const hour1 = hourFromTimestamp(timestamp1).toString();
const block1 = mockBlock(BigInt.fromU32(18000000), timestamp1);
const timestamp2 = BigInt.fromU32(1713220949);
const hour2 = hourFromTimestamp(timestamp1).toString();

describe("DeltaB", () => {
  beforeAll(() => {
    // Vprice set to 1 for simplicity
    mock_virtual_price(CRV3_POOL, BigInt.fromString("1000000000000000000"));
    mock_virtual_price(BEAN_3CRV, BigInt.fromString("1000000000000000000"));
  });
  beforeEach(() => {
    initL1Version();
    mockWhitelistedPools([BEAN_3CRV, BEAN_WETH_CP2_WELL]);
    mockPriceBelow();
    mockBeanSeasons();
  });
  afterEach(() => {
    clearStore();
  });

  describe("Calculations", () => {
    test("UniswapV2 DeltaB", () => {
      // inst
      const beans = BigDecimal.fromString("100631.374814");
      const weth = BigDecimal.fromString("32.362727191355245180");
      const wethPrice = BigDecimal.fromString("3156.89212676");
      const deltaB = uniswapV2DeltaB(beans, weth, wethPrice);
      assert.bigIntEquals(BigInt.fromString("764230012"), deltaB);

      // twa
      const reserves = [BigInt.fromString("453302737605276409780"), BigInt.fromString("1844890989703")];
      const prices = [BigInt.fromString("245707004435700"), BigInt.fromString("245207214122420")];
      const mulReserves = reserves[0].times(reserves[1]).times(BI_10.pow(6));
      const currentBeans = mulReserves.div(prices[0]).sqrt();
      const targetBeans = mulReserves.div(prices[1]).sqrt();
      const twaDeltaB = targetBeans.minus(currentBeans);
      assert.bigIntEquals(BigInt.fromString("1879205277"), twaDeltaB);
    });

    test("Curve Price", () => {
      // Bean3crv_v1 pool at block 14441689

      const other_virtual_price = BigInt.fromString("1020543257852678845");
      const xp = [
        BigInt.fromString("3503110156477").times(BI_10.pow(12)),
        BigInt.fromString("3441135481866150809775262").times(other_virtual_price).div(BI_10.pow(18))
      ];

      const D = getD(xp, BigInt.fromU32(1000));
      const y = getY(xp[0].plus(BI_10.pow(12)), xp, BigInt.fromU32(1000), D);
      const price = priceFromY(y, xp[1]);

      // log.debug("xp[1] {}", [xp[1].toString()]);

      assert.stringEquals("1.000225971464", price.toString());
    });

    test("Well Reserves", () => {
      const s21076: Bytes = Bytes.fromHexString(
        "0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002401ca3e863ef477b955382fabeb6239e00000000000000000000000000000000401d61893f2d4f8972713291748d66f700000000000000000000000000000000"
      );
      const s21077: Bytes = Bytes.fromHexString(
        "0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002401ca3fba9f61fac686ea2125d43bc8800000000000000000000000000000000401d61990e063036b2da05122259d76c00000000000000000000000000000000"
      );
      const result1 = decodeCumulativeWellReserves(s21076);
      const result2 = decodeCumulativeWellReserves(s21077);

      // const asUInt1 = [ABDK_toUInt(result1[0]), ABDK_toUInt(result1[1])];
      // const asUInt2 = [ABDK_toUInt(result2[0]), ABDK_toUInt(result2[1])];

      const elapsedTime = BigDecimal.fromString("3600");
      const diff0 = new BigDecimal(result2[0].minus(result1[0])).div(elapsedTime);
      const diff1 = new BigDecimal(result2[1].minus(result1[1])).div(elapsedTime);

      log.debug("Well Reserves", []);
      // log.debug("Converted result {} {}", [asUInt1[0].toString(), asUInt1[1].toString()]);
      // log.debug("Converted result {} {}", [asUInt2[0].toString(), asUInt2[1].toString()]);
      // log.debug("Differences {} {}", [diff0.toString(), diff1.toString()]);
      log.debug("TWA Reserves {} {}", [pow2toX(diff0).toString(), pow2toX(diff1).toString()]);
    });
  });

  describe("Oracle: TWA Reserves", () => {
    test("MetapoolOracle", () => {
      const t1 = BigInt.fromU32(1712000000);
      const t2 = BigInt.fromU32(1712003600);
      const t3 = BigInt.fromU32(1712007200);
      const b1 = mockBlock(BigInt.fromU32(18000000), t1);
      const b2 = mockBlock(BigInt.fromU32(18000300), t2);
      const b3 = mockBlock(BigInt.fromU32(18000600), t3);
      // 100, 100
      const reserves1 = [BigInt.fromString("100000000"), BigInt.fromString("100000000000000000000")];
      // 200, 210
      const reserves2 = [
        reserves1[0].plus(BigInt.fromString("200000000").times(BigInt.fromU32(3600))),
        reserves1[1].plus(BigInt.fromString("210000000000000000000").times(BigInt.fromU32(3600)))
      ];
      // 200, 200
      const reserves3 = [
        reserves2[0].plus(BigInt.fromString("200000000").times(BigInt.fromU32(3600))),
        reserves2[1].plus(BigInt.fromString("200000000000000000000").times(BigInt.fromU32(3600)))
      ];

      // Set liquidity so weighted twa prices can be set
      let pool = loadOrCreatePool(BEAN_3CRV, b2.number);
      pool.liquidityUSD = BigDecimal.fromString("10000");
      takePoolSnapshots(pool, b2);
      pool.save();
      let bean = loadBean(BEAN_ERC20);
      bean.liquidityUSD = BigDecimal.fromString("10000");
      bean.supply = ONE_BI;
      // One pool to compute the overall twas on
      bean.pools = [BEAN_3CRV];
      takeBeanSnapshots(bean, b2);
      bean.save();

      // Initialize oracle
      handleMetapoolOracle(createMetapoolOracleEvent(ONE_BI, ZERO_BI, reserves1, b1));
      assert.fieldEquals(
        "TwaOracle",
        BEAN_3CRV.toHexString(),
        "priceCumulativeLast",
        "[100000000, 100000000000000000000]"
      );
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaDeltaB", "0");
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaPrice", "0.9999995");
      assert.fieldEquals("BeanHourlySnapshot", BEAN_ERC20.toHexString() + "-6074", "twaDeltaB", "0");

      handleMetapoolOracle(createMetapoolOracleEvent(ONE_BI, ZERO_BI, reserves2, b2));
      assert.fieldEquals(
        "TwaOracle",
        BEAN_3CRV.toHexString(),
        "priceCumulativeLast",
        "[" + reserves2[0].toString() + ", " + reserves2[1].toString() + "]"
      );
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaDeltaB", "4.969504");
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaPrice", "1.024700651737");

      handleMetapoolOracle(createMetapoolOracleEvent(ONE_BI, ZERO_BI, reserves3, b3));
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaDeltaB", "0");
      assert.fieldEquals("PoolHourlySnapshot", BEAN_3CRV.toHexString() + "-6074", "twaPrice", "0.9999999975");
    });

    test("WellOracle", () => {
      const pool = loadOrCreatePool(BEAN_WETH_CP2_WELL, GAUGE_BIP45_BLOCK);
      pool.reserves = [BigInt.fromString("2000000000"), BigInt.fromString("1000000000000000000")];
      pool.save();

      let bean = loadBean(BEAN_ERC20);
      bean.supply = ONE_BI;
      bean.save();

      // 2 consecutive seasons used for test
      // https://etherscan.io/tx/0xe62ebdb74a9908760f709408944ab2d50f0bc4fd95614a05dcc053a7117e6b33#eventlog
      const event1 = createWellOracleEvent(
        BigInt.fromI32(21076),
        BEAN_WETH_CP2_WELL.toHexString(),
        BigInt.fromString("-714987531242"),
        Bytes.fromHexString(
          "0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002401ca3e863ef477b955382fabeb6239e00000000000000000000000000000000401d61893f2d4f8972713291748d66f700000000000000000000000000000000"
        )
      );
      event1.block = mockBlock(BigInt.fromI32(19200000), BigInt.fromI32(1713920000));
      handleWellOracle_beanstalk(event1);

      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "priceCumulativeLast",
        "[880610429, 1482837963]"
      );
      // No sense checking prices during initialization

      // https://etherscan.io/tx/0x0b872f5503d732f3c9f736e914368791ab3c8da8d9fcd87f071574f0e9b7ca6f#eventlog
      const event2 = createWellOracleEvent(
        BigInt.fromI32(21077),
        BEAN_WETH_CP2_WELL.toHexString(),
        BigInt.fromString("-710276445645"),
        Bytes.fromHexString(
          "0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002401ca3fba9f61fac686ea2125d43bc8800000000000000000000000000000000401d61990e063036b2da05122259d76c00000000000000000000000000000000"
        )
      );
      event2.block = mockBlock(BigInt.fromI32(19200000), BigInt.fromI32(1713923600));
      handleWellOracle_beanstalk(event2);

      const h1 = hourFromTimestamp(event2.block.timestamp).toString();
      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "priceCumulativeLast",
        "[880768318, 1483096961]"
      );
      assert.fieldEquals(
        "PoolHourlySnapshot",
        BEAN_WETH_CP2_WELL.toHexString() + "-6074",
        "twaDeltaB",
        toDecimal(event2.params.deltaB).toString()
      );
      assert.fieldEquals(
        "PoolHourlySnapshot",
        BEAN_WETH_CP2_WELL.toHexString() + "-6074",
        "twaPrice",
        "0.9128867742860822655628687132162919"
      );
      assert.fieldEquals(
        "PoolHourlySnapshot",
        BEAN_WETH_CP2_WELL.toHexString() + "-6074",
        "twaToken2Price",
        "3204.340276349048918425043871982445"
      );

      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "cumulativeWellReserves",
        event2.params.cumulativeReserves.toHexString()
      );
      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "cumulativeWellReservesTime",
        event2.block.timestamp.toString()
      );
      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "cumulativeWellReservesPrev",
        event1.params.cumulativeReserves.toHexString()
      );
      assert.fieldEquals(
        "TwaOracle",
        BEAN_WETH_CP2_WELL.toHexString(),
        "cumulativeWellReservesPrevTime",
        event1.block.timestamp.toString()
      );
    });
  });
});
