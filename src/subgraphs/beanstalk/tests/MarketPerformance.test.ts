import {
  afterEach,
  beforeEach,
  assert,
  clearStore,
  describe,
  test,
  createMockedFunction
} from "matchstick-as/assembly/index";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { v } from "../src/utils/constants/Version";
import { getPoolTokens, PoolTokens } from "../../../core/constants/RuntimeConstants";
import { Bytes, BigInt, ethereum, BigDecimal } from "@graphprotocol/graph-ts";
import { BI_10, ONE_BD, toBigInt, toDecimal, ZERO_BD } from "../../../core/utils/Decimals";
import { trackMarketPerformance } from "../src/utils/MarketPerformance";
import { MarketPerformanceSeasonal } from "../generated/schema";
import { assertBDClose } from "../../../core/tests/Assert";
import { mockBlock } from "../../../core/tests/event-mocking/Block";

const B = mockBlock();

const CMP_BD_PRECISION = BigDecimal.fromString("0.0001");

const getAllToWhitelist = (): PoolTokens[] => {
  return getPoolTokens(v()).slice(0, 2);
};

const getSiloTokens = (toWhitelist: PoolTokens[]): Bytes[] => {
  return toWhitelist.map<Bytes>((token) => token.pool as Bytes);
};

const mockWellBalance = (toSet: PoolTokens, balance: BigInt): void => {
  createMockedFunction(toSet.tokens[1], "balanceOf", "balanceOf(address):(uint256)")
    .withArgs([ethereum.Value.fromAddress(toSet.pool)])
    .returns([ethereum.Value.fromUnsignedBigInt(balance)]);
};

const mockNbtPrice = (toSet: PoolTokens, price: BigDecimal): void => {
  createMockedFunction(v().protocolAddress, "getTokenUsdPrice", "getTokenUsdPrice(address):(uint256)")
    .withArgs([ethereum.Value.fromAddress(toSet.tokens[1])])
    .returns([ethereum.Value.fromUnsignedBigInt(toBigInt(price))]);
};

const initBal = [BI_10.pow(18), BigInt.fromString("2").times(BI_10.pow(18))];
const initPrice = [BigDecimal.fromString("2640.50"), BigDecimal.fromString("2900.25")];

describe("Market Performance", () => {
  beforeEach(() => {
    initPintoVersion();

    const allToWhitelist = getAllToWhitelist();
    mockWellBalance(allToWhitelist[0], initBal[0]);
    mockWellBalance(allToWhitelist[1], initBal[1]);
    mockNbtPrice(allToWhitelist[0], initPrice[0]);
    mockNbtPrice(allToWhitelist[1], initPrice[1]);
  });
  afterEach(() => {
    clearStore();
  });

  describe("On Sunrise", () => {
    test("First Season", () => {
      trackMarketPerformance(1, getSiloTokens(getAllToWhitelist()), B);

      const ID = `${v().protocolAddress.toHexString()}-2`;
      const entity = MarketPerformanceSeasonal.load(ID)!;
      assert.assertTrue(entity.valid === false);
      assert.assertNull(entity.usdChange);
      assert.assertNull(entity.cumulativeUsdChange);
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "prevSeasonTokenBalances", `[${initBal[0]}, ${initBal[1]}]`);
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        ID,
        "prevSeasonTokenUsdPrices",
        `[${initPrice[0]}, ${initPrice[1]}]`
      );
      assertBDClose(
        entity.prevSeasonTokenUsdValues[0],
        toDecimal(initBal[0], 18).times(initPrice[0]),
        CMP_BD_PRECISION
      );
      assertBDClose(
        entity.prevSeasonTokenUsdValues[1],
        toDecimal(initBal[1], 18).times(initPrice[1]),
        CMP_BD_PRECISION
      );
      assertBDClose(
        entity.prevSeasonTotalUsd,
        toDecimal(initBal[0], 18).times(initPrice[0]).plus(toDecimal(initBal[1], 18).times(initPrice[1])),
        CMP_BD_PRECISION
      );
    });

    test("Sets seasonal values (1 season)", () => {
      trackMarketPerformance(1, getSiloTokens(getAllToWhitelist()), B);

      const allToWhitelist = getAllToWhitelist();
      const newPrices = [
        initPrice[0].times(BigDecimal.fromString("1.25")),
        initPrice[1].times(BigDecimal.fromString("0.90"))
      ];
      mockNbtPrice(allToWhitelist[0], newPrices[0]);
      mockNbtPrice(allToWhitelist[1], newPrices[1]);

      trackMarketPerformance(2, getSiloTokens(getAllToWhitelist()), B);

      const usdChange = [
        toDecimal(initBal[0], 18).times(newPrices[0]).minus(toDecimal(initBal[0], 18).times(initPrice[0])),
        toDecimal(initBal[1], 18).times(newPrices[1]).minus(toDecimal(initBal[1], 18).times(initPrice[1]))
      ];
      const usdBefore = toDecimal(initBal[0], 18)
        .times(initPrice[0])
        .plus(toDecimal(initBal[1], 18).times(initPrice[1]));
      const usdAfter = toDecimal(initBal[0], 18)
        .times(newPrices[0])
        .plus(toDecimal(initBal[1], 18).times(newPrices[1]));

      const ID = `${v().protocolAddress.toHexString()}-2`;
      const entity = MarketPerformanceSeasonal.load(ID)!;
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        ID,
        "thisSeasonTokenUsdPrices",
        `[${newPrices[0]}, ${newPrices[1]}]`
      );
      assertBDClose(
        entity.thisSeasonTokenUsdValues![0],
        toDecimal(initBal[0], 18).times(newPrices[0]),
        CMP_BD_PRECISION
      );
      assertBDClose(
        entity.thisSeasonTokenUsdValues![1],
        toDecimal(initBal[1], 18).times(newPrices[1]),
        CMP_BD_PRECISION
      );
      assertBDClose(entity.thisSeasonTotalUsd!, usdAfter, CMP_BD_PRECISION);
      assertBDClose(entity.usdChange![0], usdChange[0], CMP_BD_PRECISION);
      assertBDClose(entity.usdChange![1], usdChange[1], CMP_BD_PRECISION);
      assertBDClose(entity.totalUsdChange!, usdAfter.minus(usdBefore), CMP_BD_PRECISION);
      assertBDClose(entity.percentChange![0], BigDecimal.fromString("0.25"), CMP_BD_PRECISION);
      assertBDClose(entity.percentChange![1], BigDecimal.fromString("-0.1"), CMP_BD_PRECISION);
      assertBDClose(entity.totalPercentChange!, usdAfter.minus(usdBefore).div(usdBefore), CMP_BD_PRECISION);

      assertBDClose(entity.cumulativeUsdChange![0], usdChange[0], CMP_BD_PRECISION);
      assertBDClose(entity.cumulativeUsdChange![1], usdChange[1], CMP_BD_PRECISION);
      assertBDClose(entity.cumulativeTotalUsdChange!, usdAfter.minus(usdBefore), CMP_BD_PRECISION);
      assertBDClose(entity.cumulativePercentChange![0], BigDecimal.fromString("0.25"), CMP_BD_PRECISION);
      assertBDClose(entity.cumulativePercentChange![1], BigDecimal.fromString("-0.1"), CMP_BD_PRECISION);
      assertBDClose(entity.cumulativeTotalPercentChange!, usdAfter.minus(usdBefore).div(usdBefore), CMP_BD_PRECISION);
    });

    test("Applies cumulative values (2 seasons) with balance/price changes", () => {
      trackMarketPerformance(1, getSiloTokens(getAllToWhitelist()), B);

      const allToWhitelist = getAllToWhitelist();
      const newPrices1 = [
        initPrice[0].times(BigDecimal.fromString("1.25")),
        initPrice[1].times(BigDecimal.fromString("0.90"))
      ];
      mockNbtPrice(allToWhitelist[0], newPrices1[0]);
      mockNbtPrice(allToWhitelist[1], newPrices1[1]);

      const newBal2 = [initBal[0].times(BigInt.fromString("2")), initBal[1].times(BigInt.fromString("5"))];
      mockWellBalance(allToWhitelist[0], newBal2[0]);
      mockWellBalance(allToWhitelist[1], newBal2[1]);

      trackMarketPerformance(2, getSiloTokens(getAllToWhitelist()), B);

      const newPrices2 = [
        newPrices1[0].times(BigDecimal.fromString("0.95")),
        newPrices1[1].times(BigDecimal.fromString("1.5"))
      ];
      mockNbtPrice(allToWhitelist[0], newPrices2[0]);
      mockNbtPrice(allToWhitelist[1], newPrices2[1]);

      trackMarketPerformance(3, getSiloTokens(getAllToWhitelist()), B);

      const initialUsd1 = [
        toDecimal(initBal[0], 18).times(initPrice[0]),
        toDecimal(initBal[1], 18).times(initPrice[1])
      ];
      const usdChange1 = [
        toDecimal(initBal[0], 18).times(newPrices1[0]).minus(initialUsd1[0]),
        toDecimal(initBal[1], 18).times(newPrices1[1]).minus(initialUsd1[1])
      ];
      const initialUsd2 = [
        toDecimal(newBal2[0], 18).times(newPrices1[0]),
        toDecimal(newBal2[1], 18).times(newPrices1[1])
      ];
      const usdChange2 = [
        toDecimal(newBal2[0], 18).times(newPrices2[0]).minus(initialUsd2[0]),
        toDecimal(newBal2[1], 18).times(newPrices2[1]).minus(initialUsd2[1])
      ];

      const totalUsdChange1 = usdChange1[0].plus(usdChange1[1]);
      const totalUsdChange2 = usdChange2[0].plus(usdChange2[1]);
      const totalInitialUsd1 = initialUsd1[0].plus(initialUsd1[1]);
      const totalInitialUsd2 = initialUsd2[0].plus(initialUsd2[1]);
      const totalPercentChange1 = totalUsdChange1.div(totalInitialUsd1);
      const totalPercentChange2 = totalUsdChange2.div(totalInitialUsd2);

      const ID = `${v().protocolAddress.toHexString()}-3`;
      const entity = MarketPerformanceSeasonal.load(ID)!;
      assertBDClose(entity.cumulativeUsdChange![0], usdChange1[0].plus(usdChange2[0]), CMP_BD_PRECISION);
      assertBDClose(entity.cumulativeUsdChange![1], usdChange1[1].plus(usdChange2[1]), CMP_BD_PRECISION);
      assertBDClose(
        entity.cumulativeTotalUsdChange!,
        usdChange1[0].plus(usdChange1[1]).plus(usdChange2[0]).plus(usdChange2[1]),
        CMP_BD_PRECISION
      );
      assertBDClose(entity.cumulativePercentChange![0], BigDecimal.fromString("0.1875"), CMP_BD_PRECISION);
      assertBDClose(entity.cumulativePercentChange![1], BigDecimal.fromString("0.35"), CMP_BD_PRECISION);
      assertBDClose(
        entity.cumulativeTotalPercentChange!,
        totalPercentChange1.plus(ONE_BD).times(totalPercentChange2.plus(ONE_BD)).minus(ONE_BD),
        CMP_BD_PRECISION
      );
    });

    test("No change", () => {
      trackMarketPerformance(1, getSiloTokens(getAllToWhitelist()), B);
      trackMarketPerformance(2, getSiloTokens(getAllToWhitelist()), B);

      const ID = `${v().protocolAddress.toHexString()}-2`;
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "usdChange", `[0, 0]`);
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "totalUsdChange", "0");
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "percentChange", "[0, 0]");
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "totalPercentChange", "0");
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "cumulativeUsdChange", `[0, 0]`);
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "cumulativeTotalUsdChange", "0");
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "cumulativePercentChange", "[0, 0]");
      assert.fieldEquals("MarketPerformanceSeasonal", ID, "cumulativeTotalPercentChange", "0");
    });
  });
});
