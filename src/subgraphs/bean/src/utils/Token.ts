import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts";
import { Transfer } from "../../generated/Bean-ABIs/ERC20";

class InternalBalanceChangedParams {
  event: ethereum.Event;
  account: Address;
  token: Address;
  delta: BigInt;
}

// Transfer events are only handled for assets which we want to track; track token balances/locations
export function erc20Transfer(event: Transfer): void {
  //
}

// emitted for all tokens, should ignore processing for those which aren't already tracking balances
export function internalBalanceChanged(params: InternalBalanceChangedParams): void {
  //
}
