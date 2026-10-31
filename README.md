[discord-badge]: https://img.shields.io/discord/1308123512216748105?label=Pinto%20Discord
[discord-url]: https://pinto.money/discord

# Pinto Subgraphs

[![Discord][discord-badge]][discord-url]

**Indexes events emitted by [Pinto](https://github.com/pinto-org/protocol).**

## Subgraphs

Endpoint: POST [https://graph.pinto.money/{name}](https://graph.pinto.money/)
Explorers:

- [Pinto (protocol)](https://graph.pinto.money/pintostalk)
- [Pinto (token)](https://graph.pinto.money/pinto)
- [Exchange](https://graph.pinto.money/exchange)

Dev subgraphs can be accessed by appending `-dev` to the above links.

The documented hosting setup uses a mix of Alchemy and Graph Network, with responses served from a proxy API. The current provider for each route is determined by that server's private configuration, not by this repository. Read more about the proxy here: https://github.com/pinto-org/subgraph-proxy.

This project is forked from Beanstalk. The original project can be found [here](https://github.com/BeanstalkFarms/Beanstalk-Subgraphs). The structure of this project is kept similar to the original - from a technical perspective this will allow either repository to benefit from future developments to the other.

## Testing

To test with Docker, the first time you will need to run `yarn run graph test -d`. This will build the `matchstick` Docker image. Then, you can use the `yarn testd` script to run all tests. Alternatively, use `yarn testd-named <TestName1> ...` to run specific tests. Running in Docker is preferred since otherwise there can be issues with console output and some test cases fail silently.

## Deploying

When using graph cli commands, you will often need to specify which manifest file should be used. This is necessary to support multiple chains in the same codebase. The commands which need it will be evident - as they will fail when unable to find a `subgraph.yaml` file. In those commands, include `./manifest/${chain}.yaml` as the final argument to the command. See scripts inside `package.json` for examples.

It may be necessary to run `yarn build-cache` prior to a new deployment build. This updates historical cached values, particularly as it pertains to the L1 -> L2 migration. It will be necessary to re-run these scripts if updates to the L1 subgraph are made that need to have some values carried to the L2 subgraph. Note that it may not always be appropriate to run every script in the corresponding `cache-builder` directory, use with caution.

## Development

### Auto Convert release compatibility

The release touches all three subgraphs; it does not require a breaking rename of existing UI queries:

| Public route | Project     | Release handling                                                                                                                                                                                               |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pintostalk` | `beanstalk` | Auto Convert batch/position/Well records, Sunrise attempt/revert selector/gas, initial-activation flow observations; classification in existing Silo convert totals; replacement Tractor helper reward events. |
| `pinto`      | `bean`      | Explicit release-block pricing-contract and Stable2 function configuration. Existing ERC-20 transfer handlers already account for supply burns.                                                                |
| `exchange`   | `basin`     | Fee-burn reserve debits, one aggregate conversion classification per Well, actual proxy-upgrade history and replacement Stable2 metadata.                                                                      |

`AddDeposit`, `RemoveDeposit(s)` and Stalk balance events still own deposit accounting. The new Auto Convert records must not apply these balances again or invent bonus Stalk. Position records use transaction hash plus log index, preserving multiple participants and signed stems. Flow records are history, not an alternative implementation of the protocol's activation rules. Locks and current eligibility remain on-chain reads.

`PintoFeeBurned` debits the Pinto reserve without creating another trade, LP burn or trading-volume entry. Both possible Swap/burn event orderings and full-reserve Shift/Sync events are supported. Only canonical Pinto Wells use this handler; arbitrary Aquifer deployments cannot opt into canonical fee accounting merely by emitting the same signature.

New bored Well implementations are not new pools. Release-configured implementation BoreWell events are ignored, and the existing proxy's metadata changes at `PintoFeeWellUpgraded` / `WellFunctionReplaced`. This requires the proxy's earlier history to be indexed already; do not begin the exchange subgraph at the upgrade block without a verified prior state.

#### Preparing manifests (no deployment)

1. Copy `scripts/release.example.json` outside tracked production configuration. Its null values intentionally fail validation.
2. Fill in **actual Base deployment receipts**: protocol upgrade block, replacement PintoPrice and PintoStable2 addresses, every new bored-implementation-to-existing-proxy mapping, and each new Tractor helper address/deployment block. Verify chain ID 8453, runtimes and event ABIs against the approved release. Validation checks shape, known proxies and duplicates; it does not prove an address contains the right runtime.
3. Run `node scripts/prepare-release.mjs /absolute/path/approved-release.json /absolute/path/NEW_OUTPUT_DIRECTORY`. The parent directory must exist. Choose a new directory **inside this checkout**, such as `.release-manifests/RELEASE_NAME` (ignored by Git), so Graph CLI can locate the installed `node_modules` in its ancestors. An externally archived manifest needs that dependency resolution restored before building. This generates three manifests and a release record, and refuses to overwrite an existing directory. It does not publish anything.
4. Generate bindings with `node_modules/.bin/graph codegen --output-dir src/subgraphs/PROJECT/generated src/subgraphs/PROJECT/manifests/codegen-abis.yaml`, then build each prepared manifest with `node_modules/.bin/graph build --output-dir src/subgraphs/PROJECT/build /absolute/path/NEW_OUTPUT_DIRECTORY/PROJECT.yaml` (`PROJECT` = `beanstalk`, `bean`, `basin`).
5. Deploy only with operator approval, replay into a separate staging deployment, and compare representative Silo balances, historical gauge series, Tractor rewards, supply and every Well's reserves against chain data before switching the public proxy routes.

The generator preserves original historical start blocks and existing helper sources, adds new helper sources, and passes the release context through dynamically created Well templates. Without release context, checked-in manifests retain historical addresses; they are **not** a configured deployment of the upgraded release. The single upgrade block assumes the pricing/Stable2 cutover occurs together; separate cutover blocks require an explicit configuration extension. For this release, use a full historical replay: grafting an old exchange deployment may retain dynamic Well templates without the new release context. Grafting is not supported until context migration is separately implemented and verified.

Unit checks: `node --test scripts/prepare-release.test.mjs`; run `../../../node_modules/.bin/graph test` from each `src/subgraphs/PROJECT` directory. Native Matchstick tests and WASM builds are not a substitute for a Graph Node replay of the actual deployment receipts.

#### Public indexing outage and hosting handoff (observed October 30, 2026)

The public `pintostalk` route reports `indexing_error`, deployment `QmQNrmRpNqK5rXcdzUDCeeTVKE2p4tutP4yTe5kwRteuQW`, last indexed block **47812470**, with `hasIndexingErrors: true`. `pinto` and `exchange` returned successful responses in the same checks. `pintostalk-dev` was not configured. These are observations, not a diagnosis of the fatal handler. The current bonus gauge tuple layout still matches the existing decoder; no decoder change is justified by the generic error alone. Release compatibility code does **not** establish that this existing outage is fixed.

`graph.pinto.money` resolved to **138.197.224.134**, in [DigitalOcean's registered network](https://rdap.arin.net/registry/ip/138.197.224.134). This identifies the public proxy host's network, not the account owner or the underlying indexing provider. The public [proxy deployment workflow](https://github.com/pinto-org/subgraph-proxy/blob/main/.github/workflows/deploy.yaml) uses SSH deployment configuration (`SERVER_HOST`, `USERNAME`, `DEPLOY_SCRIPT_PATH`, `SSH_PRIVATE_KEY`). Its [example environment](https://github.com/pinto-org/subgraph-proxy/blob/main/proxy-api/.env.example) documents private upstream endpoint configuration, with Alchemy/Satsuma and Graph Network examples; the example's old Beanstalk IDs are not evidence of the live Pinto destinations.

Recovery path for an authorized operator:

1. Locate the DigitalOcean account/server and the `pinto-org/subgraph-proxy` repository administrator. Recover access through the owner; do not expose private keys or upstream credentials in tickets, commits or chat.
2. On the authorized host, identify the deployed proxy's runtime configuration (`ENDPOINTS`, `ENDPOINT_TYPES`, `ENDPOINT_SG_IDS`, `ENABLED_SUBGRAPHS`; Docker documentation places `.env` under `proxy-api/docker/`). This reveals the actual Pinto provider/subgraph IDs and thus the correct dashboard.
3. Retrieve the failed deployment's fatal handler, block, message and logs from that provider. Public GraphQL responses do not supply these details. Repair and reproduce the specific failing path before claiming recovery.
4. Reindex from genesis/history or use a verified healthy graft point **before the failure**, subject to provider support and schema compatibility. Do not assume failed/stale state is a safe graft base. Verify healthy `_meta`, advancing blocks and chart queries before routing users to it.

No production endpoint, account, server, contract or deployment is modified by the preparation tooling. A local-fork chart reader cannot reconstruct missing historical seasons and must not be substituted for production history.

### Handler organization strategy

Any events that are currently relevant to the protocol should reference the codegen for whichever is the latest protocol ABI, and not include v1/v2 etc in the name. Legacy events (that are no longer present on-chain) should reference the codegen for the upgrade in which they were initially deployed, and use the appropriate version number in the method names. Legacy handlers should also be placed in the `legacy` folder.

Underlying logic should be included in a separate file provided in the `utils` folder. The advantage of this is in accommodating a scenario where an event signature gets updated. The replacement event handler can call into the shared util along with the legacy handler.

## License

[MIT](https://github.com/pinto-org/subgraphs/blob/main/LICENSE.txt)

### Auto-convert observability

The Pinto Beanstalk manifest indexes 50 protocol event types: the six original execution/flow events plus 44 additional events covering controller configuration and lifecycle, schedule/reset pauses, priority maintenance, oracle observations, Chill Factor and trading-flow inputs, reward funding, ordered-deposit membership, exact grown-Stalk adjustments, and Silo redemption. `scripts/auto-convert-event-coverage.json` lists the added signatures and fields. Each immutable `*Record` uses `transactionHash-logIndex`, including multiple records in the same transaction or season.

`AutoConvertController` points to the current `AutoConvertProgram` and tracks the global funded reward reserve. Programs retain their configuration, policy, schedule, pause, floor, latest decision, and flow-state records. `AutoConvertWellState` retains policy and oracle records; compare their configuration versions with the current program before treating an observation as usable. Old program records remain queryable. `resetPauseUntil` is a timestamp: the pause can expire before the later `AutoConvertResetPauseExpired` log. `AutoConvertEnded` means administrative shutdown, not completion of a recurring peg-recovery cycle.

`AutoConvertDecision` outcomes are 0 skipped, 1 precheck failed, 2 child failed, and 3 executed. Reason codes are 0 none, 1 inactive, 2 policy missing, 3 governance pause, 4 reset pause, 5 outflow pause, 6 qualification, 7 invalid basket, 8 cadence, 9 observation already used, 10 no schedule, 11 Well unconfigured, 12 incomplete index, 13 invalid oracle, 14 no gas window, and 15 no Well below peg (matching `IAutoConvertEvents.Reason`). A child failure's four-byte revert selector and measured gas remain in `SunriseAutoConvertAttemptRecord`; the decision adds the program/configuration, allocated window, and child gas allowance. A reverted standalone call or reverted outer Sunrise leaves no on-chain records. Failed child execution logs roll back while the parent's failure decision survives.

Execution summaries record explicit/automatic/Sunrise mode (0/1/2), market and executed targets, conservative reference loss including reward, and whether inventory reduced the target. Per-Well plans record prices, value, loss, target-already-met (flags bit 0), and exhausted source inventory (bit 1). Legacy Well/Position records retain the actual amounts. Correlate records by transaction and log order: per-Well plans precede settlement, then the execution summary and final batch event terminate that batch. A batch's Well count includes zero legs. These records do not alter the existing Silo balance or conversion-accounting handlers.

Flow-state phase 0 describes the completed interval using its opening liquidity/supply values; phase 1 describes the next opening. `measurementValid` refers to the closed interval in both. Per-Well samples use the frozen opening quote and token units; a sample alone does not establish validity for the whole basket. Read the accompanying flow observation/window/state. Flow values and conservative losses use the protocol's emitted units (USD6 for USD fields); native-flow meters carry 18 extra decimal places. Oracle details distinguish base-data, mature-window, reserve, pricing and bounded-call failures without logging unbounded revert data.

`DepositGrownStalkState` stores the **absolute signed** adjustment for account + packed deposit ID. A zero event clears it; it is never accumulated as a delta or applied again to account Stalk balances. Ordered-deposit and redemption records are metadata/history only. A redemption-enabled Well must also remain whitelisted before it is currently usable.

Fee settings live at separate addresses. Release preparation now requires `feeSettings: [{address, startBlock}]` with each actual deployment block, so changes made before the protocol binds a Well are replayed too. Include future replacement settings in this list when preparing an updated deployment. The release manifest indexes initialization, default changes, per-Well overrides, and clears. `PintoWellFeeOverride.configured = true` includes an explicit zero fee. When false/absent, use `PintoFeeSettingsState.defaultFeeBps`; the effective version is the larger of the clear revision and default revision. `AutoConvertFeePolicyBoundRecord` is a snapshot at binding, not a continually refreshed fee quote.

Basin indexes rare trading-flow invalidations and admits future fee Wells only from the protocol's `AutoConvertFeePolicyBound` event. A permissionless Well cannot authorize itself by emitting a fee/flow event. Ordinary trades receive no extra flow log.

To synchronize after compiling the adjacent protocol checkout:

```sh
node scripts/sync-auto-convert-events.mjs ../protocol
npm run codegen
node --test scripts/prepare-release.test.mjs
```

The generator changes only event ABIs, the marked schema/manifest sections, and `AutoConvertEventsHandler.ts`. State reconstruction and accounting remain hand-written. Run Matchstick for Beanstalk and Basin and build the prepared release manifest before deployment. Release preparation does not deploy anything; deployment addresses and blocks must come from receipts.
