import { ADDRESS_ZERO } from "../../../../../core/utils/Bytes";
import { Transfer } from "../../../generated/Bean-ABIs/ERC20";
import { adjustSupply } from "../../utils/Bean";

export function handleTransfer_v1(event: Transfer): void {
  if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
    adjustSupply(
      event.address,
      event.params.from == ADDRESS_ZERO ? event.params.value : event.params.value.neg(),
      event.block
    );
    // Does not updateBeanSupplyPegPercent
  }
}
