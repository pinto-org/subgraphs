import { Address, Bytes, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { getPoolTokens, getTokenDecimals, PoolTokens } from "../../../../core/constants/RuntimeConstants";
import { v as ver } from "./constants/Version";
import { ERC20 } from "../../generated/Beanstalk-ABIs/ERC20";
import { PintoPI8 } from "../../generated/Beanstalk-ABIs/PintoPI8";
import { ONE_BD, toDecimal, ZERO_BD } from "../../../../core/utils/Decimals";
import { MarketPerformanceCumulative, MarketPerformanceSeasonal } from "../../generated/schema";
import { toAddress } from "../../../../core/utils/Bytes";

export function trackMarketPerformance(season: i32, siloTokens: Bytes[]): void {
  const v = ver();
  const POOL_TOKENS = getPoolTokens(v);
  const siloPoolTokens: PoolTokens[] = [];
  for (let i = 0; i < siloTokens.length; i++) {
    for (let j = 0; j < POOL_TOKENS.length; j++) {
      if (POOL_TOKENS[j].pool.equals(toAddress(siloTokens[i]))) {
        siloPoolTokens.push(POOL_TOKENS[j]);
        break;
      }
    }
  }

  const pools = siloPoolTokens.map<Address>((pool) => pool.pool);
  const nonBeanTokens = siloPoolTokens.map<Address>((pool) => pool.tokens[1]);

  const beanstalk = PintoPI8.bind(v.protocolAddress);
  const balances: BigInt[] = [];
  for (let i = 0; i < nonBeanTokens.length; i++) {
    balances.push(ERC20.bind(nonBeanTokens[i]).balanceOf(pools[i]));
  }
  const prices: BigDecimal[] = [];
  for (let i = 0; i < nonBeanTokens.length; i++) {
    prices.push(toDecimal(beanstalk.getTokenUsdPrice(nonBeanTokens[i])));
  }
  const values: BigDecimal[] = [];
  for (let i = 0; i < nonBeanTokens.length; i++) {
    values.push(toDecimal(balances[i], getTokenDecimals(v, nonBeanTokens[i])).times(prices[i]));
  }

  // Prepare values for the following season
  const nextSeason = new MarketPerformanceSeasonal(`${v.protocolAddress.toHexString()}-${season + 1}`);
  nextSeason.season = season + 1;
  nextSeason.silo = v.protocolAddress;
  nextSeason.valid = false;
  nextSeason.prevSeasonTokenBalances = balances;
  nextSeason.prevSeasonTokenUsdPrices = prices;
  nextSeason.prevSeasonTokenUsdValues = values;
  nextSeason.prevSeasonTotalUsd = values.reduce<BigDecimal>((acc, usd) => acc.plus(usd), ZERO_BD);
  nextSeason.save();

  // Finish values for the current season
  const currentSeason = MarketPerformanceSeasonal.load(`${v.protocolAddress.toHexString()}-${season}`);
  if (currentSeason !== null) {
    currentSeason.valid = true;
    currentSeason.thisSeasonTokenUsdPrices = prices;
    const thisSeasonTokenUsdValues: BigDecimal[] = [];
    for (let i = 0; i < nonBeanTokens.length; i++) {
      thisSeasonTokenUsdValues.push(
        toDecimal(currentSeason.prevSeasonTokenBalances[i], getTokenDecimals(v, nonBeanTokens[i])).times(prices[i])
      );
    }
    currentSeason.thisSeasonTokenUsdValues = thisSeasonTokenUsdValues;
    currentSeason.thisSeasonTotalUsd = thisSeasonTokenUsdValues.reduce<BigDecimal>(
      (acc, usd) => acc.plus(usd),
      ZERO_BD
    );

    const usdChange: BigDecimal[] = [];
    for (let i = 0; i < currentSeason.thisSeasonTokenUsdValues!.length; ++i) {
      usdChange.push(currentSeason.thisSeasonTokenUsdValues![i].minus(currentSeason.prevSeasonTokenUsdValues[i]));
    }
    currentSeason.usdChange = usdChange;
    currentSeason.totalUsdChange = currentSeason.thisSeasonTotalUsd!.minus(currentSeason.prevSeasonTotalUsd);

    const percentChange: BigDecimal[] = [];
    for (let i = 0; i < currentSeason.thisSeasonTokenUsdValues!.length; ++i) {
      const prev = currentSeason.prevSeasonTokenUsdValues[i];
      const curr = currentSeason.thisSeasonTokenUsdValues![i];
      percentChange.push(prev.equals(ZERO_BD) ? ZERO_BD : curr.div(prev).minus(ONE_BD));
    }
    currentSeason.percentChange = percentChange;
    currentSeason.totalPercentChange = currentSeason.prevSeasonTotalUsd.equals(ZERO_BD)
      ? ZERO_BD
      : currentSeason.thisSeasonTotalUsd!.div(currentSeason.prevSeasonTotalUsd).minus(ONE_BD);
    currentSeason.save();

    // Accumulate values from this season into the cumulative entity
    accumulateSeason(currentSeason);
  }
}

function accumulateSeason(currentSeason: MarketPerformanceSeasonal): void {
  const cumulative = MarketPerformanceCumulative.load(currentSeason.silo.toHexString());
  if (cumulative === null) {
    const init = new MarketPerformanceCumulative(`${currentSeason.silo.toHexString()}`);
    init.silo = currentSeason.silo;
    init.usdChange = currentSeason.usdChange!;
    init.totalUsdChange = currentSeason.totalUsdChange!;
    init.percentChange = currentSeason.percentChange!;
    init.totalPercentChange = currentSeason.totalPercentChange!;
    init.save();
  } else {
    // This would be an issue if the number of whitelisted tokens changes
    const usdChange: BigDecimal[] = [];
    for (let i = 0; i < cumulative.usdChange.length; i++) {
      usdChange.push(cumulative.usdChange[i].plus(currentSeason.usdChange![i]));
    }
    cumulative.usdChange = usdChange;
    cumulative.totalUsdChange = cumulative.totalUsdChange.plus(currentSeason.totalUsdChange!);

    const percentChange: BigDecimal[] = [];
    for (let i = 0; i < cumulative.percentChange.length; i++) {
      percentChange.push(
        cumulative.percentChange[i].plus(ONE_BD).times(currentSeason.percentChange![i].plus(ONE_BD)).minus(ONE_BD)
      );
    }
    cumulative.percentChange = percentChange;
    cumulative.totalPercentChange = cumulative.totalPercentChange
      .plus(ONE_BD)
      .times(currentSeason.totalPercentChange!.plus(ONE_BD))
      .minus(ONE_BD);
    cumulative.save();
  }
}
