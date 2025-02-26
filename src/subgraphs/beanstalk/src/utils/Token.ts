import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadSiloAsset } from "../entities/Silo";
import { takeSiloAssetSnapshots } from "../entities/snapshots/SiloAsset";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { loadBeanstalk, loadSeason } from "../entities/Beanstalk";
import { v } from "./constants/Version";
import { ZERO_BI } from "../../../../core/utils/Decimals";

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

export function sBeanTransfer(event: Transfer): void {
  // Track overall supply
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    const beanstalk = loadBeanstalk();
    const season = loadSeason(BigInt.fromI32(beanstalk.lastSeason));
    if (event.params.from == ADDRESS_ZERO) {
      season.sBeans = season.sBeans.plus(event.params.value);
      season.deltaSBeans = season.deltaSBeans.plus(event.params.value);
    } else {
      season.sBeans = season.sBeans.minus(event.params.value);
      season.deltaSBeans = season.deltaSBeans.minus(event.params.value);
    }
    season.save();
  }

  // Tracks balances at the sender/receiver level only, does not recur to protocol. This is because the protocol can also
  // carry a circulating balance (likely will equal farm balance).
  if (event.params.from == ADDRESS_ZERO) {
    // Mint
    updateAssetTotals(
      v().protocolAddress,
      event.params.to,
      event.address,
      ZERO_BI,
      event.params.value,
      event.block,
      false
    );
  } else if (event.params.to == ADDRESS_ZERO) {
    // Burn
    updateAssetTotals(
      v().protocolAddress,
      event.params.from,
      event.address,
      ZERO_BI,
      event.params.value.neg(),
      event.block,
      false
    );
  } else {
    // Transfer between addresses
    updateAssetTotals(
      v().protocolAddress,
      event.params.from,
      event.address,
      ZERO_BI,
      event.params.value.neg(),
      event.block,
      false
    );
    updateAssetTotals(
      v().protocolAddress,
      event.params.to,
      event.address,
      ZERO_BI,
      event.params.value,
      event.block,
      false
    );
  }
}

export function updateAssetTotals(
  protocol: Address,
  account: Address,
  token: Address,
  deltaFarm: BigInt,
  deltaCirculating: BigInt,
  block: ethereum.Block,
  recursive: boolean = true
): void {
  if (recursive && account != protocol) {
    updateAssetTotals(protocol, protocol, token, deltaFarm, deltaCirculating, block);
  }
  const asset = loadSiloAsset(account, token);
  asset.farmAmount = asset.farmAmount.plus(deltaFarm);
  asset.circulatingAmount = asset.circulatingAmount.plus(deltaCirculating);
  takeSiloAssetSnapshots(asset, block);
  asset.save();
}
