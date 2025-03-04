import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts";
import { Transfer } from "../../generated/Bean-ABIs/ERC20";
import { findToken, loadOrCreateToken } from "../entities/Token";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { getPoolTokens } from "../../../../core/constants/RuntimeConstants";
import { v } from "./constants/Version";
import { loadOrCreateFarmerBalance } from "../entities/FarmerBalance";
import { takeFarmerBalanceSnapshots } from "../entities/snapshots/FarmerBalance";
import { takeTokenSnapshots } from "../entities/snapshots/Token";

enum TokenLocation {
  NULL,
  WALLET,
  POOL
  // Farm location isnt identifiable by solely a wallet address
}

class InternalBalanceChangedParams {
  event: ethereum.Event;
  account: Address;
  token: Address;
  delta: BigInt;
}

// Transfer events are only handled for assets which we want to track; track token balances/locations on all invocations
export function erc20Transfer(event: Transfer): void {
  // Apply the delta to the receiver's perspective. Remove from supply and add to farm/pooled amounts
  const applyLocationDelta = (farmer: Address, token: Address, amount: BigInt, block: ethereum.Block): void => {
    const tokenEntity = loadOrCreateToken(token);

    const location = identifyTokenLocation(farmer);
    if (location == TokenLocation.NULL) {
      tokenEntity.supply = tokenEntity.supply.minus(amount);
    } else {
      if (location == TokenLocation.WALLET) {
        tokenEntity.walletBalance = tokenEntity.walletBalance.plus(amount);

        const farmerBalance = loadOrCreateFarmerBalance(farmer, token);
        farmerBalance.totalBalance = farmerBalance.totalBalance.plus(amount);
        farmerBalance.walletBalance = farmerBalance.walletBalance.plus(amount);
        takeFarmerBalanceSnapshots(farmerBalance, block);
        farmerBalance.save();
      } else if (location == TokenLocation.POOL) {
        tokenEntity.pooledBalance = tokenEntity.pooledBalance.plus(amount);
      }
    }
    takeTokenSnapshots(tokenEntity, block);
    tokenEntity.save();
  };
  applyLocationDelta(event.params.from, event.address, event.params.value.neg(), event.block);
  applyLocationDelta(event.params.to, event.address, event.params.value, event.block);
}

// Emitted for all tokens, should ignore processing for those which aren't already tracking balances
export function internalBalanceChanged(params: InternalBalanceChangedParams): void {
  const tokenEntity = findToken(params.token);
  if (tokenEntity !== null) {
    tokenEntity.farmBalance = tokenEntity.farmBalance.plus(params.delta);
    // Adding to the farm balance necessitates removing it from the beanstalk contract's wallet balance
    // so its not double counted upon transfer. The same logic holds even if there is no actual Transfer event
    // (i.e. harvesting pods into farm balance)
    tokenEntity.walletBalance = tokenEntity.walletBalance.minus(params.delta);

    takeTokenSnapshots(tokenEntity, params.event.block);
    tokenEntity.save();

    const farmerBalance = loadOrCreateFarmerBalance(params.account, params.token);
    farmerBalance.farmBalance = farmerBalance.farmBalance.plus(params.delta);
    farmerBalance.totalBalance = farmerBalance.totalBalance.plus(params.delta);
    // Any changes to wallet balance are reflected in a corresponding Transfer event

    takeFarmerBalanceSnapshots(farmerBalance, params.event.block);
    farmerBalance.save();
  }
}

function identifyTokenLocation(address: Address): TokenLocation {
  if (address == ADDRESS_ZERO) {
    return TokenLocation.NULL;
  } else if (
    getPoolTokens(v())
      .map<Address>((pt) => pt.pool)
      .includes(address)
  ) {
    return TokenLocation.POOL;
  } else {
    return TokenLocation.WALLET;
  }
}
