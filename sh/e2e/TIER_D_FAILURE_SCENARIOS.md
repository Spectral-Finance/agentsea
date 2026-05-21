# Tier D — Failure and recovery scenarios (DigitalOcean / headless)

Manual experiments to validate behavior when a single-agent deployment breaks or stops halfway. Each row assumes you can use `THEGRID_API_KEY`, a DigitalOcean API token, and SSH as documented in [README.md](README.md).

**Artifacts:** Capture full logs (stderr + stdout) per run into a timestamped directory. Redact secrets before committing or pasting into issues.

**Teardown helper:** After any partial or failed run, destroy orphaned droplets via the DigitalOcean control panel, or use:

`grid-spawn delete --name <spawn-name> --yes` (non-interactive; see `grid-spawn help delete`).

---

## D1 — Kill provision mid-flight (SIGKILL on local `bun`)

| Item | Detail |
|------|--------|
| **Induce** | Start `grid-spawn <agent> digitalocean --headless --verbose`, then `pkill -9 -f "bun.*index.ts"` (or kill the PID from `ps`) during install or SSH setup. |
| **Expect** | Process dies; droplet may already exist with partial setup. Stale `~/.config/grid-spawn/runs/headless-provision.lock` may block later runs — see [lib/provision.sh](lib/provision.sh) (holder PID cleanup). |
| **Verify** | Next headless run either succeeds after lock cleanup or fails with a clear error; document any hung remote state. |
| **Cleanup** | List DO droplets; delete name matching `SPAWN_NAME` / spawn prefix used in logs. |

---

## D2 — Invalid or missing DigitalOcean token

| Item | Detail |
|------|--------|
| **Induce** | `export DIGITALOCEAN_ACCESS_TOKEN=invalid` (or unset) and run headless spawn. |
| **Expect** | Fast failure from API (401/403) or CLI preflight; **no** droplet created if create never succeeds. |
| **Log snippet goal** | Clear auth error string, no misleading "Success". |
| **Cleanup** | None if no VM was created. |

---

## D3 — Account capacity / 422 droplet limit

| Item | Detail |
|------|--------|
| **Induce** | Exhaust droplet quota or use an account at limit; run `e2e.sh` or headless spawn. |
| **Expect** | [lib/provision.sh](lib/provision.sh) retries up to 3 times when stderr matches droplet-limit patterns; logs show attempt count. |
| **Cleanup** | Delete old test droplets to free quota. |

---

## D4 — Provision timeout (local watchdog kills `bun`)

| Item | Detail |
|------|--------|
| **Induce** | E2E path: `PROVISION_TIMEOUT` / per-agent timeout in [lib/common.sh](lib/common.sh) — shorten for testing so [lib/provision.sh](lib/provision.sh) kills the subshell mid-run. |
| **Expect** | Log warns that provision timed out and process was killed; `exit_file` may reflect partial completion; remote `.spawnrc` may or may not exist. |
| **Cleanup** | Inspect DO for the droplet name from logs; delete if abandoned. |

---

## D5 — Auto-update wrapper / `updateCmd` contains `${`

| Item | Detail |
|------|--------|
| **Induce** | Regression only: any `updateCmd` string embedded in `setupAutoUpdate` in the CLI must **not** contain the substring `${` (see `validateScriptTemplate` in [packages/cli/src/shared/agent-setup.ts](../packages/cli/src/shared/agent-setup.ts)). |
| **Expect** | Pre-encode failure: `Fatal: Script template "auto-update-wrapper" contains ${} interpolation — refusing to encode`. |
| **Automation** | Covered by [packages/cli/src/__tests__/e2e/auto-update-template.test.ts](../../packages/cli/src/__tests__/e2e/auto-update-template.test.ts). |
| **Cleanup** | If the CLI failed before finishing, delete any droplet that was created before the failure point. |

---

## D6 — SSH key mismatch (cannot log in as `root` after create)

| Item | Detail |
|------|--------|
| **Induce** | Use a DO account whose registered SSH key does not match `~/.ssh/spawn_ed25519` / keys the CLI tries (or simulate by wrong local key). |
| **Expect** | SSH handshake or auth failure after IP is known; readiness may still show "SSH key ready" if that check only verifies DO account registration — note any product gap. |
| **Cleanup** | Delete droplet from DO UI. |

---

## Definition of done (Tier D)

For each scenario you care about in release QA: run once, attach **sanitized** log excerpts and the **exact** teardown command used, and confirm no stray billable resources remain.
