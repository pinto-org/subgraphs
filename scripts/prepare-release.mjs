// Produce separate, auditable release manifests. Never deploy or alter live config.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wellAddresses = new Set([
  "0x3e11001cfbb6de5737327c59e10afab47b82b5d3",
  "0x3e111115a82df6190e36adf0d552880663a4dbf1",
  "0x3e11226fe3d85142b734abce6e58918d5828d1b4",
  "0x3e1133ac082716ddc3114bbefeed8b1731ea9cb1",
  "0x3e11444c7650234c748d743d8d374fce2ee5e6c9",
  "0x3e1155245ff9a6a019bc35827e801c6ed2ce91b9"
]);
function address(value) {
  assert.match(value ?? "", /^0x[0-9a-fA-F]{40}$/, "Invalid release address");
  assert.notEqual(value.toLowerCase(), "0x" + "0".repeat(40), "Zero release address");
  return value.toLowerCase();
}
function block(value) {
  assert.ok(Number.isSafeInteger(value) && value >= 22622961, "Explicit Base block required");
  return value;
}
export function validateRelease(config) {
  assert.equal(config.chainId, 8453, "Production manifest requires Base chain 8453");
  block(config.upgradeBlock);
  address(config.priceAddress);
  address(config.stable2Address);
  assert.ok(
    Array.isArray(config.feeSettings) && config.feeSettings.length > 0,
    "Missing fee settings deployment receipts"
  );
  const settings = new Set();
  for (const entry of config.feeSettings) {
    const value = address(entry.address);
    assert.ok(!settings.has(value), "Duplicate fee settings source");
    settings.add(value);
    assert.ok(block(entry.startBlock) <= config.upgradeBlock, "Fee settings starts after upgrade");
  }
  assert.ok(Array.isArray(config.boredWells) && config.boredWells.length > 0, "Missing proxy/implementation mapping");
  const bored = new Set(),
    proxies = new Set();
  for (const entry of config.boredWells) {
    const implementation = address(entry.implementation),
      proxy = address(entry.proxy);
    assert.ok(wellAddresses.has(proxy), "Unknown Pinto Well proxy");
    assert.ok(!wellAddresses.has(implementation), "Implementation cannot be a Well proxy");
    assert.ok(!bored.has(implementation) && !proxies.has(proxy), "Duplicate proxy/implementation mapping");
    bored.add(implementation);
    proxies.add(proxy);
  }
  assert.ok(
    Array.isArray(config.tractorHelpers) && config.tractorHelpers.length > 0,
    "Missing replacement Tractor helpers"
  );
  const helpers = new Set();
  for (const entry of config.tractorHelpers) {
    const helper = address(entry.address);
    assert.ok(!helpers.has(helper), "Duplicate Tractor helper");
    helpers.add(helper);
    // Replacement helpers can be deployed after the core cut. Start indexing
    // each helper at its actual deployment block, independently of the cut.
    block(entry.startBlock);
  }
  return config;
}

export function configureManifest(manifest, config, project) {
  validateRelease(config);
  const result = structuredClone(manifest);
  const context = {
    pintoUpgradeBlock: { type: "BigInt", data: String(config.upgradeBlock) },
    pintoPriceAddress: { type: "Bytes", data: address(config.priceAddress) },
    pintoStable2Address: { type: "Bytes", data: address(config.stable2Address) },
    pintoBoredWells: {
      type: "String",
      data: config.boredWells.map((e) => `${address(e.implementation)}=${address(e.proxy)}`).join(",")
    }
  };
  // Template declarations cannot carry context in a Graph manifest. The Aquifer
  // handler passes this static source context through Well.createWithContext.
  for (const ds of result.dataSources) {
    assert.equal(ds.network, "base");
    ds.context = { ...ds.context, ...context };
    if (ds.name === "AutoConvert" || ds.name === "AutoConvertEvents") ds.source.startBlock = config.upgradeBlock;
  }
  if (project === "beanstalk") {
    for (const [i, settings] of config.feeSettings.entries()) {
      assert.ok(
        !result.dataSources.some((s) => s.source.address?.toLowerCase() === address(settings.address)),
        "Fee settings already indexed"
      );
      result.dataSources.push({
        kind: "ethereum/contract",
        name: `PintoFeeSettings${i}`,
        network: "base",
        context,
        source: { address: address(settings.address), abi: "PintoFeeSettings", startBlock: settings.startBlock },
        mapping: {
          kind: "ethereum/events",
          apiVersion: "0.0.7",
          language: "wasm/assemblyscript",
          entities: ["PintoFeeSettingsState", "PintoWellFeeOverride", "PintoFeeChangeRecord"],
          abis: [{ name: "PintoFeeSettings", file: "../../../core/abis/PintoFeeSettings.json" }],
          eventHandlers: [
            { event: "PintoFeeSettingsInitialized(uint256,uint256)", handler: "handleFeeSettingsInitialized" },
            { event: "FeeChanged(uint256,uint256,uint256)", handler: "handleFeeChanged" },
            { event: "WellFeeSet(indexed address,uint256,uint256,uint256)", handler: "handleWellFeeSet" },
            { event: "WellFeeCleared(indexed address,uint256,uint256,uint256)", handler: "handleWellFeeCleared" }
          ],
          file: "../src/handlers/PintoFeeSettingsHandler.ts"
        }
      });
    }
    const source = result.dataSources.find((s) => s.name === "TractorHelpersConvertUpV0");
    assert.ok(source, "Missing Tractor template source");
    for (const [i, helper] of config.tractorHelpers.entries()) {
      assert.ok(
        !result.dataSources.some((s) => s.source.address?.toLowerCase() === helper.address.toLowerCase()),
        "Helper already indexed; do not double count rewards"
      );
      const ds = structuredClone(source);
      ds.name = `TractorHelpersAutoConvertRelease${i}`;
      ds.source.address = address(helper.address);
      ds.source.startBlock = helper.startBlock;
      result.dataSources.push(ds);
    }
  }
  return result;
}

function relocateFiles(value, from, to) {
  if (Array.isArray(value)) return value.map((v) => relocateFiles(v, from, to));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [
      key,
      key === "file" && typeof v === "string" ? relative(to, resolve(from, v)) : relocateFiles(v, from, to)
    ])
  );
}
export async function prepareRelease(configFile, outputDirectory) {
  const config = validateRelease(JSON.parse(await readFile(configFile, "utf8")));
  const out = resolve(outputDirectory);
  const prepared = [];
  for (const project of ["beanstalk", "bean", "basin"]) {
    const original = resolve(root, `src/subgraphs/${project}/manifests/pinto.yaml`);
    const manifest = configureManifest(YAML.parse(await readFile(original, "utf8")), config, project);
    prepared.push([project, YAML.stringify(relocateFiles(manifest, dirname(original), out))]);
  }
  // Validate every source before creating output; refuse overwriting prior releases.
  await mkdir(out);
  for (const [project, manifest] of prepared) {
    await writeFile(resolve(out, `${project}.yaml`), manifest, { flag: "wx" });
  }
  await writeFile(resolve(out, "release.json"), JSON.stringify(config, null, 2) + "\n", { flag: "wx" });
  console.log(`Prepared Base manifests in ${out}. No deployment performed. Verify runtimes/blocks before use.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: node scripts/prepare-release.mjs approved-release.json NEW_OUTPUT_DIRECTORY"
  );
  await prepareRelease(process.argv[2], process.argv[3]);
}
