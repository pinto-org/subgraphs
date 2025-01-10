import { ethereum } from "@graphprotocol/graph-ts";
import { BEAN_INITIAL_VALUES } from "../../../cache-builder/results/B3Migration_arb";
import { loadBean, saveBean } from "../../entities/Bean";
import { getProtocolToken } from "../../../../../core/constants/RuntimeConstants";
import { v } from "../constants/Version";
import { createNewSeason } from "../../entities/Season";
import { BeanDailySnapshot, BeanHourlySnapshot } from "../../../generated/schema";
import { takeBeanSnapshots } from "../../entities/snapshots/Bean";

// Carries over cumulative data from L1 -> L2 subgraph. See cache-builder/beanstalk3.js for the input source.
export function init(block: ethereum.Block): void {
  const token = getProtocolToken(v(), block.number);
  const bean = loadBean(token);

  bean.volume = BEAN_INITIAL_VALUES.volume;
  bean.volumeUSD = BEAN_INITIAL_VALUES.volumeUsd;
  bean.crosses = BEAN_INITIAL_VALUES.crosses;
  bean.lastCross = BEAN_INITIAL_VALUES.lastCross;
  bean.currentSeason = createNewSeason(BEAN_INITIAL_VALUES.currentSeason, block).id;

  takeBeanSnapshots(bean, block);
  saveBean(bean, block);

  // No need to initialize supply/price etc as those will be initialized when liquidity is added.

  // Direct assignment for snapshots is required as to avoid large deltas
  const beanHourly = BeanHourlySnapshot.load(bean.id.toHexString() + "-" + bean.lastHourlySnapshotSeason.toString())!;
  beanHourly.volume = bean.volume;
  beanHourly.volumeUSD = bean.volumeUSD;
  beanHourly.crosses = bean.crosses;
  beanHourly.save();

  const beanDaily = BeanDailySnapshot.load(bean.id.toHexString() + "-" + bean.lastDailySnapshotDay.toString())!;
  beanDaily.volume = bean.volume;
  beanDaily.volumeUSD = bean.volumeUSD;
  beanDaily.crosses = bean.crosses;
  beanDaily.save();
}
