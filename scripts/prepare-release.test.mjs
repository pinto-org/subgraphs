import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { configureManifest, validateRelease, prepareRelease } from "./prepare-release.mjs";

// Illustrative addresses only; never used to prepare or deploy a production release.
const config = () => ({
  chainId: 8453,
  upgradeBlock: 53000000,
  priceAddress: "0x" + "11".repeat(20),
  stable2Address: "0x" + "22".repeat(20),
  boredWells: [{ proxy: "0x3e1133aC082716DDC3114bbEFEeD8B1731eA9cb1", implementation: "0x" + "33".repeat(20) }],
  tractorHelpers: [{ address: "0x" + "44".repeat(20), startBlock: 52999990 }]
});
for (const project of ["beanstalk", "bean", "basin"]) {
  test(`${project}: sources carry context without rewriting history or adding invalid template keys`, () => {
    const source = YAML.parse(readFileSync(`src/subgraphs/${project}/manifests/pinto.yaml`, "utf8"));
    const previous = JSON.stringify(source);
    const prepared = configureManifest(source, config(), project);
    assert.equal(JSON.stringify(source), previous);
    assert.equal(prepared.dataSources[0].source.startBlock, source.dataSources[0].source.startBlock);
    for (const ds of prepared.dataSources) {
      assert.equal(ds.context.pintoUpgradeBlock.data, "53000000");
      assert.equal(ds.context.pintoStable2Address.type, "Bytes");
    }
    for (const template of prepared.templates ?? []) assert.equal(template.context, undefined);
    assert.equal(prepared.dataSources.length, source.dataSources.length + (project === "beanstalk" ? 1 : 0));
  });
}

test("prepared manifests preserve resolvable files and refuse overwriting an existing release", async (t) => {
  const temporary = await mkdtemp(join(tmpdir(), "pinto-manifest-test-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const input = join(temporary, "illustrative.json");
  const output = join(temporary, "release");
  await writeFile(input, JSON.stringify(config()));
  await prepareRelease(input, output);
  function checkFiles(value) {
    if (Array.isArray(value)) return value.forEach(checkFiles);
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (key === "file") assert.ok(existsSync(resolve(output, v)), `Missing manifest file ${v}`);
      else checkFiles(v);
    }
  }
  for (const project of ["beanstalk", "bean", "basin"]) {
    checkFiles(YAML.parse(readFileSync(join(output, `${project}.yaml`), "utf8")));
  }
  await assert.rejects(prepareRelease(input, output), { code: "EEXIST" });
});
test("refuses incomplete example rather than inventing deployment defaults", () => {
  assert.throws(() => validateRelease(JSON.parse(readFileSync("scripts/release.example.json"))));
});
for (const invalid of [
  "wrong-chain",
  "fractional-block",
  "zero-address",
  "missing-helper",
  "duplicate-helper",
  "unknown-proxy",
  "duplicate-proxy"
]) {
  test(`rejects ${invalid}`, () => {
    const c = config();
    if (invalid === "wrong-chain") c.chainId = 1337;
    if (invalid === "fractional-block") c.upgradeBlock = 53000000.5;
    if (invalid === "zero-address") c.priceAddress = "0x" + "00".repeat(20);
    if (invalid === "missing-helper") c.tractorHelpers = [];
    if (invalid === "duplicate-helper") c.tractorHelpers.push(c.tractorHelpers[0]);
    if (invalid === "unknown-proxy") c.boredWells[0].proxy = c.priceAddress;
    if (invalid === "duplicate-proxy") c.boredWells.push(c.boredWells[0]);
    assert.throws(() => validateRelease(c));
  });
}
