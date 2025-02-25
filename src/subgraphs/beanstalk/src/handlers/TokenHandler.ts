import { BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";
import { loadBeanstalk, loadFarmer, loadSeason } from "../entities/Beanstalk";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { beanTransfer, sBeanTransfer, updateFarmTotals } from "../utils/Token";
import { InternalBalanceChanged } from "../../generated/Beanstalk-ABIs/PintoPI5";
import { v } from "../utils/constants/Version";
import { getProtocolToken, getSiloBeanToken } from "../../../../core/constants/RuntimeConstants";

// ERC20 Transfers. Any tokens this subgraph is interested in can route through here (need to check event.address)
export function handleTransfer(event: Transfer): void {
  if (event.address == getProtocolToken(v(), event.block.number)) {
    beanTransfer(event);
  } else if (event.address === getSiloBeanToken(v())) {
    sBeanTransfer(event);
  }
}

export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {
  loadFarmer(event.params.account);
  updateFarmTotals(event.address, event.params.account, event.params.token, event.params.delta, event.block);
}

export function handleExploit(block: ethereum.Block): void {
  let beanstalk = loadBeanstalk();
  let season = loadSeason(BigInt.fromI32(beanstalk.lastSeason));
  season.deltaBeans = ZERO_BI;
  season.beans = ZERO_BI;
  season.price = BigDecimal.fromString("1.022");
  season.save();
  return;
}
