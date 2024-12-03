import { ethereum, store } from "@graphprotocol/graph-ts";
import { BEAN_INITIAL_VALUES } from "../../../cache-builder/results/B3Migration_arb";
import { loadBean, loadOrCreateBeanDailySnapshot, loadOrCreateBeanHourlySnapshot } from "../../entities/Bean";
import { getProtocolToken } from "../../../../../core/constants/RuntimeConstants";
import { v } from "../constants/Version";
import { createNewSeason } from "../../entities/Season";

// Carries over cumulative data from L1 -> L2 subgraph. See cache-builder/beanstalk3.js for the input source.
export function init(block: ethereum.Block): void {
  const token = getProtocolToken(v(), block.number);
  const bean = loadBean(token);

  bean.volume = BEAN_INITIAL_VALUES.volume;
  bean.volumeUSD = BEAN_INITIAL_VALUES.volumeUsd;
  bean.crosses = BEAN_INITIAL_VALUES.crosses;
  bean.lastCross = BEAN_INITIAL_VALUES.lastCross;
  bean.lastSeason = createNewSeason(BEAN_INITIAL_VALUES.lastSeason, block).id;
  bean.save();

  // No need to initialize supply/price etc as those will be initialized when liquidity is added.

  // Direct assignment for snapshots is required as to avoid large deltas
  const beanHourly = loadOrCreateBeanHourlySnapshot(bean, block);
  beanHourly.volume = bean.volume;
  beanHourly.volumeUSD = bean.volumeUSD;
  beanHourly.crosses = bean.crosses;
  beanHourly.save();

  const beanDaily = loadOrCreateBeanDailySnapshot(bean, block);
  beanDaily.volume = bean.volume;
  beanDaily.volumeUSD = bean.volumeUSD;
  beanDaily.crosses = bean.crosses;
  beanDaily.save();
}
