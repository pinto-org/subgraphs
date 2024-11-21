import { Address, Bytes } from "@graphprotocol/graph-ts";
import { BoreWell } from "../../generated/Basin-ABIs/Aquifer";
import { Well } from "../../generated/templates";
import { loadOrCreateToken } from "../entities/Token";
import { getActualWell } from "../utils/UpgradeableMapping";
import {
  loadOrCreateAquifer,
  loadOrCreateImplementation,
  loadOrCreatePump,
  loadOrCreateWellFunction
} from "../entities/WellComponents";
import { createWellUpgradeHistoryEntry, loadOrCreateWell } from "../entities/Well";

export function handleBoreWell(event: BoreWell): void {
  // Accounts for well proxies here
  const actualAddress = getActualWell(event.params.well);
  Well.create(actualAddress);

  let well = loadOrCreateWell(actualAddress, event.params.tokens, event.block);
  well.boredWell = event.params.well;

  loadOrCreateAquifer(event.address);
  well.aquifer = event.address;

  loadOrCreateImplementation(event.params.implementation);
  well.implementation = event.params.implementation;

  const wellPumps: Bytes[] = [];
  const wellPumpData: Bytes[] = [];
  for (let i = 0; i < event.params.pumps.length; i++) {
    loadOrCreatePump(event.params.pumps[i]);
    wellPumps.push(event.params.pumps[i].target);
    wellPumpData.push(event.params.pumps[i].data);
  }
  well.pumps = wellPumps;
  well.pumpData = wellPumpData;

  loadOrCreateWellFunction(event.params.wellFunction.target);
  well.wellFunction = event.params.wellFunction.target;
  well.wellFunctionData = event.params.wellFunction.data;

  const tokens: Bytes[] = [];
  for (let i = 0; i < event.params.tokens.length; i++) {
    tokens.push(loadOrCreateToken(event.params.tokens[i]).id);
  }
  well.tokens = tokens;
  well.tokenOrder = tokens;

  well.save();

  // Add to well history
  createWellUpgradeHistoryEntry(well, event.block);
}
