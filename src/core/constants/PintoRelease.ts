// Optional, explicit release context. Absent values preserve historical/live behavior.
// prepare-release.mjs attaches these to every Base source; dynamic Well instances
// inherit the Aquifer source's context via createWithContext.
import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts";

export function releaseAddress(key: string): Address | null {
  const context = dataSource.context();
  if (!context.isSet(key)) return null;
  return Address.fromBytes(context.getBytes(key));
}

export function releaseActive(block: BigInt): boolean {
  const context = dataSource.context();
  return context.isSet("pintoUpgradeBlock") && block.ge(context.getBigInt("pintoUpgradeBlock"));
}

export function releaseProxy(bored: Address): Address | null {
  const context = dataSource.context();
  if (!context.isSet("pintoBoredWells")) return null;
  const entries = context.getString("pintoBoredWells").split(",");
  for (let i = 0; i < entries.length; i++) {
    const pair = entries[i].split("=");
    if (pair.length == 2 && Address.fromString(pair[0]).equals(bored)) return Address.fromString(pair[1]);
  }
  return null;
}
