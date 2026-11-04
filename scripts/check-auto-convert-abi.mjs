// Usage: node scripts/check-auto-convert-abi.mjs /path/to/freshly-compiled/protocol
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const protocol = resolve(process.argv[2] || "../protocol");
const artifact = (name) => JSON.parse(readFileSync(`${protocol}/out/${name}.sol/${name}.json`)).abi;
const sources = [
  "IAutoConvert",
  "IAutoConvertEvents",
  "AutoConvertAdminFacet",
  "AutoConvertPolicyFacet",
  "OrderedDepositsFacet",
  "LibOrderedDeposits",
  "LibDepositGrownStalk",
  "ISiloRedemption",
  "LibAutoConvertSchedule",
  "LibAutoConvertPools",
  "LibAutoConvertSunrise",
  "LibAutoConvertFlowActivation",
  "LibAutoConvertFlowWindow",
  "LibAutoConvertFlowPause",
  "LibAutoConvertOracle",
  "LibAutoConvertEconomicPolicy"
];
const expected = new Map();
for (const e of sources.flatMap(artifact))
  if (
    e.type === "event" &&
    /^(AutoConvert|SunriseAutoConvert|OrderedDeposit|DepositGrownStalk|Silo.*(Redeem|Redemption|Swapped))/.test(e.name)
  ) {
    if (expected.has(e.name)) assert.deepEqual(e, expected.get(e.name), `Conflicting ${e.name}`);
    expected.set(e.name, e);
  }
const abi = JSON.parse(readFileSync(new URL("../src/core/abis/Beanstalk/Pinto-AutoConvert.json", import.meta.url)));
const actual = abi.filter((e) => !["PintoFeeWellUpgraded", "WellFunctionReplaced"].includes(e.name));
assert.deepEqual(actual.map((e) => e.name).sort(), [...expected.keys()].sort(), "Event coverage drift");
for (const entry of actual) assert.deepEqual(entry, expected.get(entry.name), `Event ABI drift: ${entry.name}`);
console.log(`Verified all ${actual.length} protocol event shapes, including indexed fields and tuple names.`);
