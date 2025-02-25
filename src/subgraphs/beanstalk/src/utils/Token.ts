import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadSiloAsset } from "../entities/Silo";
import { takeSiloAssetSnapshots } from "../entities/snapshots/SiloAsset";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { loadBeanstalk, loadSeason } from "../entities/Beanstalk";

export function beanTransfer(event: Transfer): void {
  // Track supply upon mint/burn
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    let beanstalk = loadBeanstalk();
    let season = loadSeason(BigInt.fromI32(beanstalk.lastSeason));

    if (event.params.from == ADDRESS_ZERO) {
      season.deltaBeans = season.deltaBeans.plus(event.params.value);
      season.beans = season.beans.plus(event.params.value);
    } else {
      season.deltaBeans = season.deltaBeans.minus(event.params.value);
      season.beans = season.beans.minus(event.params.value);
    }
    season.save();
  }
}

export function sBeanTransfer(event: Transfer): void {
  //
}

export function updateFarmTotals(
  protocol: Address,
  account: Address,
  token: Address,
  deltaAmount: BigInt,
  block: ethereum.Block,
  recursive: boolean = true
): void {
  if (recursive && account != protocol) {
    updateFarmTotals(protocol, protocol, token, deltaAmount, block);
  }
  let asset = loadSiloAsset(account, token);
  asset.farmAmount = asset.farmAmount.plus(deltaAmount);
  takeSiloAssetSnapshots(asset, block);
  asset.save();
}
