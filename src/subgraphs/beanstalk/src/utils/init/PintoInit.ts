import { ethereum } from "@graphprotocol/graph-ts";
import { loadBeanstalk } from "../../entities/Beanstalk";
import { loadField } from "../../entities/Field";
import { loadSilo } from "../../entities/Silo";
import { takeFieldSnapshots } from "../../entities/snapshots/Field";
import { takeSiloSnapshots } from "../../entities/snapshots/Silo";
import { v } from "../constants/Version";

export function init(block: ethereum.Block): void {
  let beanstalk = loadBeanstalk();
  beanstalk.lastSeason = 1;
  beanstalk.save();

  let silo = loadSilo(v().protocolAddress);
  takeSiloSnapshots(silo, block);
  silo.save();

  let field = loadField(v().protocolAddress);
  takeFieldSnapshots(field, block);
  field.save();
}
