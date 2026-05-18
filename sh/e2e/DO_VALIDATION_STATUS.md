# DigitalOcean Agent Validation Status

Tracks latest known DigitalOcean validation status for single-agent E2E runs.

Canonical agent order reference: `ALL_AGENTS` in `sh/e2e/lib/common.sh`
(`claude openclaw codex opencode kilocode hermes junie cursor pi t3code`).

## Current status

| Agent | Status | Evidence | Notes |
|---|---|---|---|
| `openclaw` | PASS (manual) | User-confirmed in chat (2026-05-15) | Marked as manually validated on DigitalOcean. |
| `opencode` | PASS (automated) | `/tmp/grid-spawn-e2e-opencode-do-transcript-verifyfix-20260515-133806.log` | Full run passed: provision, verify, input test transcript, teardown. |
| `kilocode` | PASS (automated) | `/tmp/grid-spawn-e2e-kilocode-do-completions-20260515-140553.log` | Full run passed with real `kilocode --prompt` completion assertion and request/response transcript logging. |

## Next agent to run

Using canonical `ALL_AGENTS` order and current validated set above, next target is:

- `hermes`
