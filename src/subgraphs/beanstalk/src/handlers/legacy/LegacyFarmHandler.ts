import { ZERO_BI } from "../../../../../core/utils/Decimals";
import { InternalBalanceChanged } from "../../../generated/Beanstalk-ABIs/SeedGauge";
import { loadFarmer } from "../../entities/Beanstalk";
import { updateAssetTotals } from "../../utils/Token";

// Replanted -> Reseed
export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {
  loadFarmer(event.params.user);
  updateAssetTotals(event.address, event.params.user, event.params.token, event.params.delta, ZERO_BI, event.block);
}
