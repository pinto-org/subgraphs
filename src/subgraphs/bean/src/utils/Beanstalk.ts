import { ethereum } from "@graphprotocol/graph-ts";
import { loadBean, saveBean } from "../entities/Bean";
import { toAddress } from "../../../../core/utils/Bytes";
import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { createNewSeason, getSeason } from "../entities/Season";
import { takeBeanSnapshots } from "../entities/snapshots/Bean";
import { updatePoolSeason } from "../entities/Pool";

export function updateSeason(season: u32, block: ethereum.Block): void {
  createNewSeason(season, block);

  let bean = loadBean(getProtocolToken(v(), block.number));
  bean.currentSeason = getSeason(season).id;
  takeBeanSnapshots(bean, block);
  saveBean(bean, block);

  for (let i = 0; i < bean.pools.length; i++) {
    updatePoolSeason(toAddress(bean.pools[i]), season, block);
  }

  for (let i = 0; i < bean.dewhitelistedPools.length; i++) {
    updatePoolSeason(toAddress(bean.dewhitelistedPools[i]), season, block);
  }
}
