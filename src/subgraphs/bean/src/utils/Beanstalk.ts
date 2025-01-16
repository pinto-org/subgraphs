import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { getAllBeanPools, loadBean, saveBean } from "../entities/Bean";
import { toAddress } from "../../../../core/utils/Bytes";
import { beanDecimals, getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { createNewSeason, getSeason } from "../entities/Season";
import { takeBeanSnapshots } from "../entities/snapshots/Bean";
import { loadOrCreatePool, updatePoolSeason } from "../entities/Pool";
import { WellOracle } from "../../generated/Bean-ABIs/PintoLaunch";
import { setRawWellReserves, setTwaLast } from "./price/TwaOracle";
import { decodeCumulativeWellReserves, setWellTwa } from "./price/WellPrice";
import { loadOrCreateTwaOracle } from "../entities/TwaOracle";
import { BI_10 } from "../../../../core/utils/Decimals";
import { updateBeanTwa } from "./Bean";
import { legacy_setWellTwa } from "./legacy/LegacyWellPrice";

export function updateSeason(season: u32, block: ethereum.Block): void {
  createNewSeason(season, block);

  let bean = loadBean(getProtocolToken(v(), block.number));
  bean.currentSeason = getSeason(season).id;
  takeBeanSnapshots(bean, block);
  saveBean(bean, block);

  const allPools = getAllBeanPools(bean);
  for (let i = 0; i < allPools.length; i++) {
    updatePoolSeason(toAddress(allPools[i]), season, block);
  }
}

export function wellOracle(event: WellOracle, isLegacy: boolean = false): void {
  if (event.params.cumulativeReserves.length == 0) {
    // Ignore emissions for wells with uninitialized reserves
    return;
  }
  setRawWellReserves(event);
  const newPriceCumulative = decodeCumulativeWellReserves(event.params.cumulativeReserves);
  const decreasing = setTwaLast(event.params.well, newPriceCumulative, event.block.timestamp);

  // Ignore further twa price processing if the cumulative reserves decreased. This is generally
  // considered an error, but occurred during EBIP-19. The internal oracle should still be updated here.
  if (decreasing) {
    const twaOracle = loadOrCreateTwaOracle(event.params.well);
    twaOracle.priceCumulativeSun = newPriceCumulative;
    twaOracle.lastSun = event.block.timestamp;
    twaOracle.save();
    return;
  }

  // Ignore deltaB processing for wells with fewer than 1k beans (contract always reports zero)
  const pool = loadOrCreatePool(event.params.well, event.block.number);
  const beanIndex = pool.tokens.indexOf(getProtocolToken(v(), event.block.number));
  if (pool.reserves[beanIndex] > BigInt.fromU32(1000).times(BI_10.pow(<u8>beanDecimals()))) {
    if (!isLegacy) {
      setWellTwa(event.params.well, event.params.deltaB, event.block);
    } else {
      legacy_setWellTwa(event.params.well, event.params.deltaB, event.block);
    }
    updateBeanTwa(event.block);
  }
}
