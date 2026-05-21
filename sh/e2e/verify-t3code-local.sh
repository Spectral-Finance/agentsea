#!/usr/bin/env bash
# Local smoke test for T3 Code / Codex + LiteLLM bridge (no cloud VM required).
# Usage: source .env && bash sh/e2e/verify-t3code-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${THEGRID_API_KEY:-}" ]]; then
  echo "THEGRID_API_KEY is required (source .env or export it)" >&2
  exit 1
fi

export OPENAI_API_KEY="$THEGRID_API_KEY"
GRID_API_BASE="${THEGRID_API_URL:-https://api.thegrid.ai/v1}"
GRID_API_BASE="${GRID_API_BASE%/}"
VENV="${LITELLM_VENV:-/tmp/litellm-venv}"
PROXY_PORT="${CODEX_LITELLM_PORT:-4141}"
PROXY_URL="http://127.0.0.1:${PROXY_PORT}"
CODEX_HOME="${CODEX_HOME:-/tmp/codex-home-verify}"
TITLE_SCHEMA="/tmp/t3code-title-schema.json"
TITLE_OUT="/tmp/t3code-title-out.txt"

log() { printf '[verify-t3code-local] %s\n' "$*"; }
fail() { printf '[verify-t3code-local] FAIL: %s\n' "$*" >&2; exit 1; }

# Extract callback module from agent-setup.ts (same bytes uploaded to VMs).
python3 << 'PY'
import pathlib
src = pathlib.Path("packages/cli/src/shared/agent-setup.ts").read_text()
start = src.index("const CODEX_LITELLM_CALLBACKS_PY = `") + len("const CODEX_LITELLM_CALLBACKS_PY = `")
end = src.index("`;\n\n/**\n * Base URL for Anthropic SDK")
pathlib.Path("/tmp/codex_litellm_callbacks.py").write_text(src[start:end])
PY

cat > /tmp/codex-litellm-verify.yaml << EOF
model_list:
  - model_name: "agent-standard"
    litellm_params:
      model: "openai/agent-standard"
      api_base: "${GRID_API_BASE}"
      api_key: "os.environ/THEGRID_API_KEY"
      use_chat_completions_api: true
      drop_params: true
  - model_name: "gpt-5.4-mini"
    litellm_params:
      model: "openai/agent-standard"
      api_base: "${GRID_API_BASE}"
      api_key: "os.environ/THEGRID_API_KEY"
      use_chat_completions_api: true
      drop_params: true
  - model_name: "gpt-5.4"
    litellm_params:
      model: "openai/agent-standard"
      api_base: "${GRID_API_BASE}"
      api_key: "os.environ/THEGRID_API_KEY"
      use_chat_completions_api: true
      drop_params: true
litellm_settings:
  drop_params: true
  callbacks: codex_litellm_callbacks.proxy_handler_instance
EOF

if [[ ! -x "$VENV/bin/litellm" ]]; then
  log "Creating LiteLLM venv at $VENV"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip "litellm[proxy]>=1.85.0"
fi

fuser -k "${PROXY_PORT}/tcp" 2>/dev/null || true
sleep 1
export PYTHONPATH=/tmp
log "Starting LiteLLM proxy on :${PROXY_PORT}"
"$VENV/bin/litellm" --config /tmp/codex-litellm-verify.yaml --host 127.0.0.1 --port "$PROXY_PORT" \
  > /tmp/codex-litellm-verify.log 2>&1 &
PROXY_PID=$!
cleanup() { kill "$PROXY_PID" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 20); do
  curl -sf "${PROXY_URL}/health/liveliness" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "${PROXY_URL}/health/liveliness" >/dev/null || fail "LiteLLM proxy did not start (see /tmp/codex-litellm-verify.log)"

check_responses_model() {
  local model="$1"
  local body
  body=$(curl -sf -X POST "${PROXY_URL}/v1/responses" \
    -H "Authorization: Bearer ${THEGRID_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${model}\",\"input\":\"Reply with exactly three words: hello friend there\",\"max_output_tokens\":200}")
  if echo "$body" | python3 -c "import json,sys; r=json.load(sys.stdin); sys.exit(0 if r.get('error') else 1)" 2>/dev/null; then
    echo "$body" >&2
    fail "proxy /v1/responses failed for model=${model}"
  fi
  if ! echo "$body" | python3 -c "
import json,sys
r=json.load(sys.stdin)
for o in r.get('output') or []:
    for c in o.get('content') or []:
        if isinstance(c, dict) and (c.get('text') or '').strip():
            sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
    echo "$body" >&2
    fail "proxy response empty for model=${model}"
  fi
  log "OK proxy responses model=${model}"
}

for model in agent-standard gpt-5.4-mini gpt-5.4; do
  check_responses_model "$model"
done

log "Checking json_schema downgrade (T3 thread titles)"
schema_body=$(curl -sf -X POST "${PROXY_URL}/v1/responses" \
  -H "Authorization: Bearer ${THEGRID_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.4-mini","input":"Summarize as a short thread title: hello are you there","max_output_tokens":500,"text":{"format":{"type":"json_schema","name":"title_schema","schema":{"type":"object","properties":{"title":{"type":"string"}},"required":["title"],"additionalProperties":false},"strict":true}}}')
if echo "$schema_body" | python3 -c "import json,sys; r=json.load(sys.stdin); sys.exit(0 if r.get('error') else 1)" 2>/dev/null; then
  echo "$schema_body" >&2
  fail "json_schema request failed after downgrade"
fi
if ! echo "$schema_body" | python3 -c "
import json,sys
r=json.load(sys.stdin)
for o in r.get('output') or []:
    for c in o.get('content') or []:
        text=(c.get('text') or '').strip()
        if not text:
            continue
        try:
            parsed=json.loads(text)
        except Exception:
            continue
        if isinstance(parsed, dict) and parsed.get('title'):
            sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  echo "$schema_body" >&2
  fail "json_schema response missing title field"
fi
log "OK json_schema thread-title path"

# Codex CLI thread-title path (what T3 uses via codex exec --output-schema).
if ! command -v codex >/dev/null 2>&1; then
  if [[ -d /tmp/codex-test/node_modules/.bin ]]; then
    CODEX_BIN="/tmp/codex-test/node_modules/.bin/codex"
  else
    log "codex CLI not installed  skipping codex exec smoke (proxy checks passed)"
    exit 0
  fi
else
  CODEX_BIN="$(command -v codex)"
fi

mkdir -p "$CODEX_HOME"
cat > "${CODEX_HOME}/config.toml" << EOF
model = "agent-standard"
model_provider = "openrouter"
sandbox_mode = "danger-full-access"
model_reasoning_effort = "none"

[model_providers.openrouter]
name = "The Grid"
base_url = "${PROXY_URL}/v1"
env_key = "OPENAI_API_KEY"
wire_api = "responses"
EOF

echo '{"type":"object","properties":{"title":{"type":"string"}},"required":["title"],"additionalProperties":false}' \
  > "$TITLE_SCHEMA"

export CODEX_HOME
log "Running codex exec thread-title smoke (gpt-5.4-mini alias)"
rm -f "$TITLE_OUT"
timeout 240 "$CODEX_BIN" exec --ephemeral --skip-git-repo-check -s read-only \
  -m gpt-5.4-mini --config 'model_reasoning_effort="none"' \
  --output-schema "$TITLE_SCHEMA" --output-last-message "$TITLE_OUT" \
  "Summarize as a short thread title: hello are you there" < /dev/null \
  > /tmp/t3code-codex-exec.log 2>&1 || fail "codex exec failed (see /tmp/t3code-codex-exec.log)"

if [[ ! -s "$TITLE_OUT" ]]; then
  tail -20 /tmp/t3code-codex-exec.log >&2 || true
  fail "codex exec produced empty --output-last-message"
fi
if ! grep -q '"title"' "$TITLE_OUT"; then
  cat "$TITLE_OUT" >&2
  fail "codex exec output is not structured JSON with title"
fi

log "OK codex exec structured title: $(tr -d '\n' < "$TITLE_OUT" | head -c 120)"
log "All T3 Code local checks passed"
