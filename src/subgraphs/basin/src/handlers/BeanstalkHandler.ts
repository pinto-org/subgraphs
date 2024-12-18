import { Convert } from "../../generated/Basin-ABIs/PintoLaunch";

export function handleConvert(event: Convert): void {
  // When convert event is encountered, need to be able to pull a collection
  // of all LP add/removals that have occurred in this txn.
  // They should be compared with the well address of the from/toToken in this event.
  // Those txns can be marked as converts and have their volume included in convert volume tally.
  //
  // Try looking at deposit/withdraw.account to associate?
  // hash-well-lpamount(-logIndex)?
  // loadInBlock
}
