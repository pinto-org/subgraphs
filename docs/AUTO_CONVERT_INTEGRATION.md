# Auto Convert integration

Protocol target: `pinto-org/protocol-audit`, `auto-convert` at `8e811489`
(November 5, 2026). Compile that revision before generating or checking ABIs:

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
Initialization installs both EMA windows as 24. PR #22 seeds a nonzero threshold
from existing valid Seed rates, so eligible redemption opens immediately at release.
Both release and standalone initializers publish a rounded threshold, leaving the
exact mean unknown (`null`) until the first EMA update; do not invert the threshold.
Subsequent EMA events remain authoritative even if a gauge update was skipped.
The zero-mean/cursor-only Sunrise path is retained solely for older intermediate
builds with deferred initialization; the current release does not enter that path. Per-Well
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

Flow status 6 (`AtOrAbovePeg`) is valid close-phase telemetry for an unqualified
counter frozen above peg, with all other inputs valid. Raw status values are retained.

PR #21 appends raw decision reason 15 (`NoPositionsSelected`). It is outcome 0
(`Skipped`) even when the child consumed nonzero gas. Preserve its failure selector,
window, allowance and gas telemetry; never create a successful batch or apply
balances for that decision. Other child failures retain outcome 2. PR #23's
planning optimizations and PR #25's Sunrise-only LP distribution guard preserve
all indexed event shapes. PR #26 adds standalone protocol tooling.

The November 4 unsigned bundle/rehearsal targets PR #20 and is superseded. Rebuild
from this revision even if the predicted CREATE addresses remain unchanged.
