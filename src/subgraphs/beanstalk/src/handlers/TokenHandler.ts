import { BigDecimal, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { Transfer } from "../../generated/Beanstalk-ABIs/ERC20";
import { loadBeanstalk, loadFarmer, loadSeason } from "../entities/Beanstalk";
import { ZERO_BI } from "../../../../core/utils/Decimals";
import { beanTransfer, wrappedDepositTransfer, updateAssetTotals } from "../utils/Token";
import { InternalBalanceChanged } from "../../generated/Beanstalk-ABIs/PintoPI5";

export function handleBeanTransfer(event: Transfer): void {
  beanTransfer(event);
}

export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {
  loadFarmer(event.params.account);
  updateAssetTotals(event.address, event.params.account, event.params.token, event.params.delta, ZERO_BI, event.block);
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
