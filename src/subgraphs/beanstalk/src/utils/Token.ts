import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadSiloAsset } from "../entities/Silo";
import { takeSiloAssetSnapshots } from "../entities/snapshots/SiloAsset";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { loadBeanstalk, loadSeason } from "../entities/Beanstalk";

export function beanTransfer(event: Transfer): void {
  // Track supply upon mint/burn
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    const beanstalk = loadBeanstalk();
    const season = loadSeason(BigInt.fromI32(beanstalk.lastSeason));
    if (event.params.from == ADDRESS_ZERO) {
      season.beans = season.beans.plus(event.params.value);
      season.deltaBeans = season.deltaBeans.plus(event.params.value);
    } else {
      season.beans = season.beans.minus(event.params.value);
      season.deltaBeans = season.deltaBeans.minus(event.params.value);
    }
    season.save();
  }
}
