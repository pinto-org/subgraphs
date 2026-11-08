import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import { PintoFeeSettingsState, PintoWellFeeOverride, PintoFeeChangeRecord } from "../../generated/schema";

function record(event: ethereum.Event, action: string): void {
  const a = event.parameters;
  const perWell = action == "set" || action == "clear";
  const initialized = action == "initialize";
  const offset = perWell ? 1 : 0;
  const fee = a[initialized ? 0 : offset + 1].value.toBigInt();
  const version = a[initialized ? 1 : offset + 2].value.toBigInt();
  const row = new PintoFeeChangeRecord(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  row.settings = event.address;
  row.action = action;
  if (perWell) row.well = a[0].value.toAddress();
  if (!initialized) row.previousFeeBps = a[offset].value.toBigInt();
  row.feeBps = fee;
  row.version = version;
  row.transactionHash = event.transaction.hash;
  row.logIndex = event.logIndex;
  row.blockNumber = event.block.number;
  row.timestamp = event.block.timestamp;
  row.save();
  const id = event.address.toHexString();
  let state = PintoFeeSettingsState.load(id);
  if (state == null) {
    state = new PintoFeeSettingsState(id);
    // Initial deployed constants; supports the pre-initialization-event implementation too.
    state.defaultFeeBps = BigInt.fromI32(25);
    state.defaultVersion = BigInt.fromI32(1);
  }
  state.version = version;
  if (!perWell) {
    state.defaultFeeBps = fee;
    state.defaultVersion = version;
  }
  state.save();
  if (perWell) {
    const well = a[0].value.toAddress();
    const override = new PintoWellFeeOverride(id + "-" + well.toHexString());
    override.settings = id;
    override.well = well;
    override.configured = action == "set";
    override.feeBps = fee;
    override.version = version;
    override.save();
  }
}
export function handleFeeSettingsInitialized(event: ethereum.Event): void {
  record(event, "initialize");
}
export function handleFeeChanged(event: ethereum.Event): void {
  record(event, "default");
}
export function handleWellFeeSet(event: ethereum.Event): void {
  record(event, "set");
}
export function handleWellFeeCleared(event: ethereum.Event): void {
  record(event, "clear");
}
