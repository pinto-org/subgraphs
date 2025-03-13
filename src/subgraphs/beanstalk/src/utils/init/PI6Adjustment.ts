import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadSilo } from "../../entities/Silo";
import { BEANSTALK } from "../../../../../core/constants/raw/PintoBaseConstants";
import { takeSiloSnapshots } from "../../entities/snapshots/Silo";

// Upon deployment of PI-6, the crop scalar was adjusted downward to 68e18 (From 100e18) but there was
// no event emitted. This function handles what should have happened from that event.
export function processMissingEvents(block: ethereum.Block) {
  let silo = loadSilo(BEANSTALK);
  silo.beanToMaxLpGpPerBdvRatio = BigInt.fromString("68000000000000000000");
  takeSiloSnapshots(silo, block);
  silo.save();
}
