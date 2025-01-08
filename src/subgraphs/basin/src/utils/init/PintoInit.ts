import { ethereum } from "@graphprotocol/graph-ts";
import { createNewSeason, loadBeanstalk } from "../../entities/Beanstalk";

// Initialize season entity immediately/before first sunrise occurs.
export function init(block: ethereum.Block): void {
  createNewSeason(1, block);
  const beanstalk = loadBeanstalk();
  beanstalk.createdTimestamp = block.timestamp;
  beanstalk.lastUpdateTimestamp = block.timestamp;
  beanstalk.lastUpdateBlockNumber = block.number;
  beanstalk.save();
}
