import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { Transfer } from "../../generated/Beanstalk-ABIs/WrappedSiloERC20";
import { loadWrappedDeposit } from "../entities/Silo";
import { takeWrappedDepositSnapshots } from "../entities/snapshots/WrappedSiloERC20";
import { v } from "../utils/constants/Version";

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
