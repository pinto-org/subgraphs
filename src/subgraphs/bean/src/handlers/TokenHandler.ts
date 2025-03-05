import { getProtocolToken } from "../../../../core/constants/RuntimeConstants";
import { ADDRESS_ZERO } from "../../../../core/utils/Bytes";
import { Transfer } from "../../generated/Bean-ABIs/ERC20";
import { adjustSupply, updateBeanSupplyPegPercent } from "../utils/Bean";
import { v } from "../utils/constants/Version";
import { erc20Transfer } from "../utils/Token";

export function handleTransfer(event: Transfer): void {
  // Bean specific processing
  if (event.address == getProtocolToken(v(), event.block.number)) {
    if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {
      adjustSupply(
        event.address,
        event.params.from == ADDRESS_ZERO ? event.params.value : event.params.value.neg(),
        event.block
      );
      updateBeanSupplyPegPercent(event.address, event.block);
    }
  }
  // General erc20 processing
  erc20Transfer(event);
}
