import { Convert, Sunrise } from "../../generated/Basin-ABIs/PintoLaunch";
import { Deposit, Withdraw } from "../../generated/schema";
import { checkForSnapshot } from "../utils/Well";
import { toAddress } from "../../../../core/utils/Bytes";
import { v } from "../utils/constants/Version";
import { getWhitelistedWells } from "../../../../core/constants/RuntimeConstants";

// Takes snapshots of beanstalk wells only. This is to guarantee a snapshot of each Beanstalk well is
// always available at the top of the season.
export function handleBeanstalkSunrise(event: Sunrise): void {
  const wells = getWhitelistedWells(v());
  for (let i = 0; i < wells.length; i++) {
    checkForSnapshot(toAddress(wells[i]), event.block);
  }
}

export function handleConvert(event: Convert): void {
  // Find any corresponding deposit/withdraw entities and indicate them as converts.
  // Both can exist in the case of LP->LP converts.
  const depositId = `${event.transaction.hash.toHexString()}-${event.params.toToken.toHexString()}-${event.params.toAmount.toString()}`;
  const depositEntity = Deposit.load(depositId);
  if (depositEntity != null) {
    depositEntity.isConvert = true;
    // TODO: add cumulative convert stats
    depositEntity.save();
  }

  const withdrawId = `${event.transaction.hash.toHexString()}-${event.params.fromToken.toHexString()}-${event.params.fromAmount.toString()}`;
  const withdrawEntity = Withdraw.load(withdrawId);
  if (withdrawEntity != null) {
    withdrawEntity.isConvert = true;
    // TODO: add cumulative convert stats
    withdrawEntity.save();
  }
}
