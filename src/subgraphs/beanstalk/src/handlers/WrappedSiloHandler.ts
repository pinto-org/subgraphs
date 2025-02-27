import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { BI_10 } from "../../../../core/utils/Decimals";
import { Transfer, Update, WrappedSiloERC20 } from "../../generated/Beanstalk-ABIs/WrappedSiloERC20";
import { loadWrappedDeposit } from "../entities/Silo";
import { takeWrappedDepositSnapshots } from "../entities/snapshots/WrappedSiloERC20";

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
}

// Update redeem rate upon it changing
export function handleUpdate(event: Update): void {
  const wrappedDeposit = loadWrappedDeposit(event.address);
  const contract = WrappedSiloERC20.bind(event.address);
  wrappedDeposit.redeemRate = contract.previewRedeem(BI_10.pow(<u8>wrappedDeposit.decimals));
  takeWrappedDepositSnapshots(wrappedDeposit, event.block);
  wrappedDeposit.save();
}
