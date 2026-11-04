# Auto Convert integration

Protocol target: `pinto-org/protocol-audit`, `auto-convert` at `41c2c9a7`
(November 3, 2026). Compile that revision before generating or checking ABIs:

```sh
node scripts/sync-auto-convert-events.mjs /path/to/protocol
node scripts/check-auto-convert-abi.mjs /path/to/protocol
node --test scripts/prepare-release.test.mjs
```

Then run codegen, mapping tests, and builds for Beanstalk, Basin and Bean.
`AutoConvertEvents` records all 52 current protocol event types between its
49 generated handlers and the three existing accounting handlers. Upgrade
notifications from Wells are separate. Each record is keyed by transaction hash
and log index; telemetry never applies deposit balances twice.

Current state exposes global policy records, redemption EMA configuration versus
active values, and migration verification separately from index coverage.
Initialization installs both EMA windows as 24. The initial exact mean is unknown
(`null`) until the first EMA update; the rounded threshold is not inverted. Per-Well
native LP floors change only on their publication events. A staged USD policy
is not an effective LP floor. Waiting observations are flattened row-major:
`liquidityRow * 4 + podRateColumn`. The duration table retains all 144 case IDs.
Batch reward and loss fields remain raw telemetry but are deprecated/zero in the
current protocol; they are not measured economics.

Before deploying, prepare manifests with actual upgrade/deployment receipts via
`scripts/prepare-release.mjs`. Verify replacement helper addresses and linked
Well implementations. Historical rehearsal addresses/blocks are not release
configuration. If an older intermediate Auto Convert version was actually
indexed, preserve/version its old event handlers and plan the replay boundary
before applying the new schema; this integration targets the unreleased build.
Production deployment and migration finalization are separate operator actions.
