import {
  afterEach,
  beforeEach,
  assert,
  clearStore,
  describe,
  test,
  createMockedFunction,
  log
} from "matchstick-as/assembly/index";
import { handleSunrise } from "../src/handlers/SeasonHandler";
import { initPintoVersion } from "./entity-mocking/MockVersion";
import { v } from "../src/utils/constants/Version";
import { loadSilo } from "../src/entities/Silo";
import { getPoolTokens, PoolTokens } from "../../../core/constants/RuntimeConstants";
import { Bytes, BigInt, ethereum, BigDecimal } from "@graphprotocol/graph-ts";
import { BI_10, ONE_BD, toBigInt, toDecimal } from "../../../core/utils/Decimals";
import { createSunriseEvent } from "./event-mocking/Season";

const getAllToWhitelist = (): PoolTokens[] => {
  return getPoolTokens(v()).slice(0, 2);
};

const setWhitelistTokens = (toWhitelist: PoolTokens[]): void => {
  const silo = loadSilo(v().protocolAddress);
  const whitelistedTokens = toWhitelist.map<Bytes>((token) => token.pool as Bytes);
  silo.whitelistedTokens = whitelistedTokens;
  silo.save();
};

const mockWellBalance = (toSet: PoolTokens, balance: BigInt): void => {
  createMockedFunction(toSet.tokens[1], "balanceOf", "balanceOf(address):(uint256)")
    .withArgs([ethereum.Value.fromAddress(toSet.pool)])
    .returns([ethereum.Value.fromUnsignedBigInt(balance)]);
};

const mockNbtPrice = (toSet: PoolTokens, price: BigDecimal): void => {
  createMockedFunction(v().protocolAddress, "getTokenUsdPrice", "getTokenUsdPrice(address):(uint256)")
    .withArgs([ethereum.Value.fromAddress(toSet.tokens[0])])
    .returns([ethereum.Value.fromUnsignedBigInt(toBigInt(price))]);
};

const initBal = [BI_10.pow(18), BigInt.fromString("2").times(BI_10.pow(18))];
const initPrice = [BigDecimal.fromString("2640.50"), BigDecimal.fromString("2900.25")];

describe("Market Performance", () => {
  beforeEach(() => {
    initPintoVersion();

    const allToWhitelist = getAllToWhitelist();
    setWhitelistTokens(allToWhitelist);

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
      handleSunrise(createSunriseEvent(1));

      const A = v().protocolAddress.toHexString();
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "valid", "false");
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "prevSeasonTokenBalances",
        `[${initBal[0]}, ${initBal[1]}]`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "prevSeasonTokenUsdPrices",
        `[${initPrice[0]}, ${initPrice[1]}]`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "prevSeasonTokenUsdBalances",
        `[${toDecimal(initBal[0], 18).times(initPrice[0])}, ${toDecimal(initBal[1], 18).times(initPrice[1])}]`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "prevSeasonTotalUsd",
        `${toDecimal(initBal[0], 18).times(initPrice[0]).plus(toDecimal(initBal[1], 18).times(initPrice[1])).toString()}`
      );
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "usdChange", "null");

      assert.notInStore("MarketPerformanceCumulative", A);
    });

    test("Sets seasonal values (1 season)", () => {
      handleSunrise(createSunriseEvent(1));

      const allToWhitelist = getAllToWhitelist();
      const newPrices = [
        initPrice[0].times(BigDecimal.fromString("1.25")),
        initPrice[1].times(BigDecimal.fromString("0.90"))
      ];
      mockNbtPrice(allToWhitelist[0], newPrices[0]);
      mockNbtPrice(allToWhitelist[1], newPrices[1]);

      handleSunrise(createSunriseEvent(2));

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

      const A = v().protocolAddress.toHexString();
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "thisSeasonTokenUsdPrices",
        `[${newPrices[0]}, ${newPrices[1]}]`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "thisSeasonTokenUsdBalances",
        `[${toDecimal(initBal[0], 18).times(newPrices[0])}, ${toDecimal(initBal[1], 18).times(newPrices[1])}]`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "thisSeasonTotalUsd",
        `${toDecimal(initBal[0], 18).times(newPrices[0]).plus(toDecimal(initBal[1], 18).times(newPrices[1])).toString()}`
      );
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "usdChange",
        `[${usdChange[0].toString()}, ${usdChange[1].toString()}]`
      );
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "totalUsdChange", usdAfter.minus(usdBefore).toString());
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "percentChange", "[0.25, -0.10]");
      assert.fieldEquals(
        "MarketPerformanceSeasonal",
        `${A}-2`,
        "totalPercentChange",
        usdAfter.minus(usdBefore).div(usdBefore).toString()
      );
      assert.fieldEquals(
        "MarketPerformanceCumulative",
        A,
        "usdChange",
        `[${usdChange[0].toString()}, ${usdChange[1].toString()}]`
      );
      assert.fieldEquals("MarketPerformanceCumulative", A, "totalUsdChange", usdAfter.minus(usdBefore).toString());
      assert.fieldEquals("MarketPerformanceCumulative", A, "percentChange", "[0.25, -0.10]");
      assert.fieldEquals(
        "MarketPerformanceCumulative",
        A,
        "totalPercentChange",
        usdAfter.minus(usdBefore).div(usdBefore).toString()
      );
    });

    test("Applies cumulative values (2 seasons) with balance/price changes", () => {
      handleSunrise(createSunriseEvent(1));

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

      handleSunrise(createSunriseEvent(2));

      const newPrices2 = [
        newPrices1[0].times(BigDecimal.fromString("0.9")),
        newPrices1[1].times(BigDecimal.fromString("1.5"))
      ];
      mockNbtPrice(allToWhitelist[0], newPrices2[0]);
      mockNbtPrice(allToWhitelist[1], newPrices2[1]);

      handleSunrise(createSunriseEvent(3));

      const usdChange1 = [
        toDecimal(initBal[0], 18).times(newPrices1[0]).minus(toDecimal(initBal[0], 18).times(initPrice[0])),
        toDecimal(initBal[1], 18).times(newPrices1[1]).minus(toDecimal(initBal[1], 18).times(initPrice[1]))
      ];
      const usdChange2 = [
        toDecimal(newBal2[0], 18).times(newPrices2[0]).minus(toDecimal(newBal2[0], 18).times(newPrices1[0])),
        toDecimal(newBal2[1], 18).times(newPrices2[1]).minus(toDecimal(newBal2[1], 18).times(newPrices1[1]))
      ];
      const usdBefore = toDecimal(initBal[0], 18)
        .times(initPrice[0])
        .plus(toDecimal(initBal[1], 18).times(initPrice[1]));
      const usdAfter1 = usdBefore.plus(usdChange1[0]).plus(usdChange1[1]);
      const usdAfter2 = usdAfter1.plus(usdChange2[0]).plus(usdChange2[1]);
      // TODO use this to calc totalpercent change.
      const totalPercentChange1 = usdAfter1.minus(usdBefore).div(usdBefore);
      const totalPercentChange2 = usdAfter2.minus(usdAfter1).div(usdAfter1);

      const A = v().protocolAddress.toHexString();
      assert.fieldEquals(
        "MarketPerformanceCumulative",
        A,
        "usdChange",
        `[${usdChange1[0].plus(usdChange2[0])}, ${usdChange1[1].plus(usdChange2[1])}]`
      );
      assert.fieldEquals(
        "MarketPerformanceCumulative",
        A,
        "totalUsdChange",
        `${usdChange1[0].plus(usdChange1[1]).plus(usdChange2[0]).plus(usdChange2[1])}`
      );
      assert.fieldEquals("MarketPerformanceCumulative", A, "percentChange", "[0.125, 0.35]");
      assert.fieldEquals(
        "MarketPerformanceCumulative",
        A,
        "totalPercentChange",
        totalPercentChange1.times(totalPercentChange2).minus(ONE_BD).toString()
      );
    });

    test("No change", () => {
      handleSunrise(createSunriseEvent(1));
      handleSunrise(createSunriseEvent(2));

      const A = v().protocolAddress.toHexString();
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "usdChange", `[0, 0]`);
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "totalUsdChange", "0");
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "percentChange", "[0, 0]");
      assert.fieldEquals("MarketPerformanceSeasonal", `${A}-2`, "totalPercentChange", "0");
      assert.fieldEquals("MarketPerformanceCumulative", A, "usdChange", `[0, 0]`);
      assert.fieldEquals("MarketPerformanceCumulative", A, "totalUsdChange", "0");
      assert.fieldEquals("MarketPerformanceCumulative", A, "percentChange", "[0, 0]");
      assert.fieldEquals("MarketPerformanceCumulative", A, "totalPercentChange", "0");
    });
  });
});
