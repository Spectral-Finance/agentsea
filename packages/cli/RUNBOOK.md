# Operator runbook (Grid Spawn CLI)

## Provisioning stuck after droplet create

1. Check history: `grid-spawn list --json` — look for `provision_phase` and `provision_status`.
2. Recover crash-sidecar if history is empty but a VM exists: `grid-spawn resume --recover`, then `grid-spawn resume`.
3. If SSH works: `grid-spawn fix [<spawn-id>]`.

## Headless / scripted runs

- Set `SPAWN_HEADLESS=1`. The CLI uses a lock file under `~/.config/grid-spawn/runs/` so two concurrent headless runs do not create duplicate droplets.
- Prefer **version-pinned** bundles: set `GRID_SPAWN_BUNDLE_SHA256` when using `sh/digitalocean/openclaw.sh`.

## Billing / orphaned VMs (DigitalOcean)

- List tagged droplets: use `grid-spawn cleanup digitalocean --dry-run` (destroys droplets tagged `spawn` older than the default TTL unless overridden).
- Confirm interactive or pass `--yes` in CI/automation.

## The Grid API key

- Keys are validated against `GET https://api.thegrid.ai/v1/models` when possible.
- Enterprise: use `THEGRID_API_KEY` from your org; browser OAuth for The Grid is not implemented in this CLI yet (`packages/cli/src/shared/oauth.ts`).
