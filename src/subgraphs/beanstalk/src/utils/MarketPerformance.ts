import { Address, Bytes, BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { getPoolTokens, getTokenDecimals, PoolTokens } from "../../../../core/constants/RuntimeConstants";
import { v as ver } from "./constants/Version";
import { ERC20 } from "../../generated/Beanstalk-ABIs/ERC20";
import { PintoPI12 } from "../../generated/Beanstalk-ABIs/PintoPI12";
import { ONE_BD, toDecimal, ZERO_BD } from "../../../../core/utils/Decimals";
import { MarketPerformanceSeasonal } from "../../generated/schema";
import { toAddress } from "../../../../core/utils/Bytes";

// Tracks the effect of underlying token movements on the overall liquidity value.
// siloTokens must be provided in the same order each season, even after dewhitelisting.
// When new tokens are whitelisted, they can be appended to the end of the list.
export function trackMarketPerformance(season: i32, siloTokens: Bytes[], block: ethereum.Block): void {
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

  const beanstalk = PintoPI12.bind(v.protocolAddress);
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
  nextSeason.prevSeasonTotalUsd = values.reduce<BigDecimal>((acc, usd) => acc.plus(usd), ZERO_BD).truncate(2);
  nextSeason.save();

  // Finish values for the current season
  const currentSeason = MarketPerformanceSeasonal.load(`${v.protocolAddress.toHexString()}-${season}`);
  if (currentSeason !== null) {
    currentSeason.valid = true;
    currentSeason.timestamp = block.timestamp;
    currentSeason.thisSeasonTokenUsdPrices = prices;
    const thisSeasonTokenUsdValues: BigDecimal[] = [];
    for (let i = 0; i < currentSeason.prevSeasonTokenBalances.length; i++) {
      thisSeasonTokenUsdValues.push(
        toDecimal(currentSeason.prevSeasonTokenBalances[i], getTokenDecimals(v, nonBeanTokens[i])).times(prices[i])
      );
    }
    currentSeason.thisSeasonTokenUsdValues = thisSeasonTokenUsdValues;
    currentSeason.thisSeasonTotalUsd = thisSeasonTokenUsdValues
      .reduce<BigDecimal>((acc, usd) => acc.plus(usd), ZERO_BD)
      .truncate(2);

    const usdChange: BigDecimal[] = [];
    for (let i = 0; i < currentSeason.prevSeasonTokenUsdValues!.length; ++i) {
      usdChange.push(currentSeason.thisSeasonTokenUsdValues![i].minus(currentSeason.prevSeasonTokenUsdValues[i]));
    }
    currentSeason.usdChange = usdChange.map<BigDecimal>((bd) => bd.truncate(2));
    currentSeason.totalUsdChange = currentSeason
      .thisSeasonTotalUsd!.minus(currentSeason.prevSeasonTotalUsd)
      .truncate(2);

    const percentChange: BigDecimal[] = [];
    for (let i = 0; i < currentSeason.prevSeasonTokenUsdValues!.length; ++i) {
      const prev = currentSeason.prevSeasonTokenUsdValues[i];
      const curr = currentSeason.thisSeasonTokenUsdValues![i];
      percentChange.push(prev.equals(ZERO_BD) ? ZERO_BD : curr.div(prev).minus(ONE_BD));
    }
    currentSeason.percentChange = percentChange.map<BigDecimal>((bd) => bd.truncate(8));
    currentSeason.totalPercentChange = currentSeason.prevSeasonTotalUsd.equals(ZERO_BD)
      ? ZERO_BD
      : currentSeason.thisSeasonTotalUsd!.div(currentSeason.prevSeasonTotalUsd).minus(ONE_BD).truncate(8);

    // Accumulate values from this season into the cumulative fields
    accumulateSeason(currentSeason);
    currentSeason.save();
  }
}

function accumulateSeason(currentSeason: MarketPerformanceSeasonal): void {
  const prevSeason = MarketPerformanceSeasonal.load(`${currentSeason.silo.toHexString()}-${currentSeason.season - 1}`);
  if (prevSeason === null) {
    currentSeason.cumulativeUsdChange = currentSeason.usdChange!;
    currentSeason.cumulativeTotalUsdChange = currentSeason.totalUsdChange!;
    currentSeason.cumulativePercentChange = currentSeason.percentChange!;
    currentSeason.cumulativeTotalPercentChange = currentSeason.totalPercentChange!;
    currentSeason.save();
  } else {
    // This would be an issue if the number of whitelisted tokens changes.
    // usdChange/percentChange would have to be removed or refactored to have a direct token mapping.
    const usdChange: BigDecimal[] = [];
    for (let i = 0; i < prevSeason.cumulativeUsdChange!.length; i++) {
      usdChange.push(prevSeason.cumulativeUsdChange![i].plus(currentSeason.usdChange![i]));
    }
    currentSeason.cumulativeUsdChange = usdChange;
    currentSeason.cumulativeTotalUsdChange = prevSeason.cumulativeTotalUsdChange!.plus(currentSeason.totalUsdChange!);

    const percentChange: BigDecimal[] = [];
    for (let i = 0; i < prevSeason.cumulativePercentChange!.length; i++) {
      percentChange.push(
        prevSeason
          .cumulativePercentChange![i].plus(ONE_BD)
          .times(currentSeason.percentChange![i].plus(ONE_BD))
          .minus(ONE_BD)
      );
    }
    currentSeason.cumulativePercentChange = percentChange.map<BigDecimal>((bd) => bd.truncate(8));
    currentSeason.cumulativeTotalPercentChange = prevSeason
      .cumulativeTotalPercentChange!.plus(ONE_BD)
      .times(currentSeason.totalPercentChange!.plus(ONE_BD))
      .minus(ONE_BD)
      .truncate(8);
    currentSeason.save();
  }
}
