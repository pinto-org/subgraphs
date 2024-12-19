import { Convert } from "../../generated/Basin-ABIs/PintoLaunch";
import { Deposit, Withdraw } from "../../generated/schema";

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
