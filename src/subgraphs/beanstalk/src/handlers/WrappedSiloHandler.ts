import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { Transfer } from "../../generated/Beanstalk-ABIs/WrappedSiloERC20";
import { loadWrappedDeposit } from "../entities/Silo";
import { takeWrappedDepositSnapshots } from "../entities/snapshots/WrappedSiloERC20";
import { v } from "../utils/constants/Version";
import { updateAssetTotals } from "../utils/Token";

export function handleWrappedDepositERC20Transfer(event: Transfer): void {
  // Track overall supply
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    const wrappedDeposit = loadWrappedDeposit(event.address);
    if (event.params.from == ADDRESS_ZERO) {
      wrappedDeposit.supply = wrappedDeposit.supply.plus(event.params.value);
    } else {
      wrappedDeposit.supply = wrappedDeposit.supply.minus(event.params.value);
    }
    takeWrappedDepositSnapshots(wrappedDeposit, event.block);
    wrappedDeposit.save();
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
