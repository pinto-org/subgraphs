import { Address } from "@graphprotocol/graph-ts";
import { FarmerBalance } from "../../generated/schema";
import { ZERO_BI } from "../../../../core/utils/Decimals";

export function loadOrCreateFarmerBalance(farmer: Address, token: Address): FarmerBalance {
  const id = `${farmer.toHexString()}-${token.toHexString()}`;
  let entity = FarmerBalance.load(id);
  if (entity == null) {
    entity = new FarmerBalance(id);
    entity.farmer = farmer;
    entity.token = token;
    entity.totalBalance = ZERO_BI;
    entity.walletBalance = ZERO_BI;
    entity.farmBalance = ZERO_BI;
    entity.save();
  }
  return entity as FarmerBalance;
}
