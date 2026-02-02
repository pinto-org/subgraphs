import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { loadSilo } from "../../entities/Silo";
import { BEANSTALK } from "../../../../../core/constants/raw/PintoBaseConstants";
import { takeSiloSnapshots } from "../../entities/snapshots/Silo";
import { toDecimal } from "../../../../../core/utils/Decimals";
import { PintoLaunch } from "../../../generated/Beanstalk-ABIs/PintoLaunch";
import { v } from "../constants/Version";

// Upon deployment of PI-6, the crop scalar was adjusted downward to 67e18 (From 100e18) but there was
// no event emitted. This function handles what should have happened from that event.
export function processMissingEvents(block: ethereum.Block): void {
  let silo = loadSilo(BEANSTALK);
  silo.beanToMaxLpGpPerBdvRatio = BigInt.fromString("67000000000000000000");
  silo.cropRatio = toDecimal(PintoLaunch.bind(v().protocolAddress).getBeanToMaxLpGpPerBdvRatioScaled(), 18);
  takeSiloSnapshots(silo, block);
  silo.save();
}
