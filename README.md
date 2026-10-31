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
