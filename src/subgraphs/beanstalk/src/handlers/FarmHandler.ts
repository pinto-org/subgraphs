import { InternalBalanceChanged } from "../../generated/Beanstalk-ABIs/PintoPI5";
import { loadFarmer } from "../entities/Beanstalk";
import { updateFarmTotals } from "../utils/Farm";

export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {
  loadFarmer(event.params.account);
  updateFarmTotals(event.address, event.params.account, event.params.token, event.params.delta, event.block);
}
