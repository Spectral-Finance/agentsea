import pc from "picocolors";
import { REPO, SPAWN_CDN } from "../manifest.js";

function getHelpUsageSection(): string {
  return `${pc.bold("USAGE")}
  agentsea                              Interactive agent + cloud picker
  agentsea <agent> <cloud>              Launch agent on cloud directly
  agentsea <agent> <cloud> --dry-run    Preview what would be provisioned (or -n)
  agentsea <agent> <cloud> --zone <zone>  Set zone/region (works for all clouds)
  agentsea <agent> <cloud> --size <type>  Set instance size/type (works for all clouds)
  agentsea <agent> <cloud> --model <id>  Set the LLM model (e.g. openai/gpt-5.3-codex)
  agentsea <agent> <cloud> --custom      Show interactive size/region pickers
  agentsea <agent> <cloud> --fast        Enable all speed optimizations (images, tarballs, parallel)
  agentsea <agent> <cloud> --verbose     Full provisioning logs (default is minimal stderr)
  agentsea <agent> <cloud> --headless   Provision and exit (no interactive session)
  agentsea <agent> <cloud> --output json
                                     Headless mode with structured JSON on stdout
  agentsea <agent> <cloud> --prompt "text"
                                     Execute agent with prompt (non-interactive)
  agentsea <agent> <cloud> --prompt-file <file>  (or -f)
                                     Execute agent with prompt from file
  agentsea <agent> <cloud> --config <file>
                                     Load all options from a JSON config file
  agentsea <agent> <cloud> --steps <list>
                                     Comma-separated setup steps to enable
  agentsea <agent>                      Interactive cloud picker for agent
  agentsea <cloud>                      Show available agents for cloud
  agentsea list                         Browse and rerun previous spawns (aliases: ls, history)
  agentsea list <filter>                Filter history by agent or cloud name
  agentsea list -a <agent>              Filter spawn history by agent (or --agent)
  agentsea list -c <cloud>              Filter spawn history by cloud (or --cloud)
  agentsea list --flat                  Show flat list (disable tree view)
  agentsea list --json                  Output history as JSON
  agentsea list --clear                 Clear all spawn history (requires --yes non-interactively)
  agentsea delete                       Delete a previously spawned server (aliases: rm, destroy, kill)
  agentsea delete -a <agent>            Filter servers by agent
  agentsea delete -c <cloud>            Filter servers by cloud
  agentsea delete --name <name> --yes   Headless delete by name (no prompts)
  agentsea status                       Show live state of cloud servers (aliases: ps)
  agentsea status -a <agent>            Filter status by agent (or --agent)
  agentsea status -c <cloud>            Filter status by cloud (or --cloud)
  agentsea status --prune               Remove gone servers from history
  agentsea fix                          Full VM recovery (credentials, install, config, daemons)
  agentsea fix <spawn-id>               Fix a specific spawn by name or ID
  agentsea resume                       Continue provisioning an incomplete/failed spawn (SSH clouds)
  agentsea resume <spawn-id>            Resume a specific incomplete spawn
  agentsea resume --recover             Import crash-safe checkpoints from ~/.config/agentsea/runs/
  agentsea cleanup digitalocean         Remove stale DO droplets tagged by AgentSea (see --dry-run)
  agentsea cleanup --dry-run            List droplets that would be removed (default cloud: digitalocean)
  agentsea link <ip>                    Register an existing VM by IP (alias: reconnect)
  agentsea link <ip> --agent <agent>    Specify the agent running on the VM
  agentsea link <ip> --cloud <cloud>    Specify the cloud provider
  agentsea export                       Export a claude spawn to a github repo (re-spawn via --repo)
  agentsea export <name>                Export a specific spawn by name or ID
  agentsea last                         Instantly rerun the most recent spawn (alias: rerun)
  agentsea matrix                       Full availability matrix (alias: m)
  agentsea agents                       List all agents with descriptions
  agentsea clouds                       List all cloud providers
  agentsea tree                         Show recursive spawn tree (parent/child relationships)
  agentsea tree --json                  Output spawn tree as JSON
  agentsea history export               Dump history as JSON to stdout
  agentsea feedback "message"            Send feedback to the AgentSea team
  agentsea uninstall                    Uninstall agentsea CLI and optionally remove data
  agentsea update                       Check for CLI updates
  agentsea version                      Show version (or --version, -v)
  agentsea help                         Show this help message (or --help, -h)`;
}

function getHelpExamplesSection(): string {
  return `${pc.bold("EXAMPLES")}
  agentsea                              ${pc.dim("# Pick interactively")}
  agentsea openclaw sprite              ${pc.dim("# Launch OpenClaw on Sprite")}
  agentsea codex hetzner                ${pc.dim("# Launch Codex CLI on Hetzner Cloud")}
  agentsea kilocode digitalocean        ${pc.dim("# Launch Kilo Code on DigitalOcean")}
  agentsea claude sprite --prompt "Fix all linter errors"
                                     ${pc.dim("# Execute Claude with prompt and exit")}
  agentsea codex sprite -p "Add tests"  ${pc.dim("# Short form of --prompt")}
  agentsea openclaw aws -f instructions.txt
                                     ${pc.dim("# Read prompt from file (short for --prompt-file)")}
  agentsea claude gcp --zone us-east1-b  ${pc.dim("# Use a specific GCP zone")}
  agentsea claude gcp --size e2-standard-4
                                     ${pc.dim("# Use a specific machine type")}
  agentsea codex gcp --model openai/gpt-5.3-codex
                                     ${pc.dim("# Override the default LLM model")}
  agentsea claude sprite --fast           ${pc.dim("# Fastest provisioning (images + tarballs + parallel)")}
  agentsea opencode gcp --dry-run       ${pc.dim("# Preview without provisioning")}
  agentsea claude hetzner --headless    ${pc.dim("# Provision, print connection info, exit")}
  agentsea claude hetzner --output json ${pc.dim("# Structured JSON output on stdout")}
  agentsea codex gcp --config setup.json --headless --output json
                                     ${pc.dim("# Config file with headless JSON output")}
  agentsea openclaw gcp --steps github,browser --headless
                                     ${pc.dim("# Only run specific setup steps")}
  agentsea claude                       ${pc.dim("# Show which clouds support Claude")}
  agentsea hetzner                      ${pc.dim("# Show which agents run on Hetzner")}
  agentsea list                         ${pc.dim("# Browse history and pick one to rerun")}
  agentsea list codex                   ${pc.dim("# Filter history by agent name")}
  agentsea last                         ${pc.dim("# Instantly rerun the most recent spawn")}
  agentsea matrix                       ${pc.dim("# See the full agent x cloud matrix")}`;
}

function getHelpAuthSection(): string {
  return `${pc.bold("AUTHENTICATION")}
  All agents use The Grid platform for LLM access. Get your API key at:
  ${pc.cyan("https://thegrid.ai (API keys dashboard)")}

  For non-interactive use, set environment variables:
  ${pc.dim("THEGRID_API_KEY")}=sk-or-v1-... agentsea claude sprite

  Each cloud provider has its own auth requirements.
  Run ${pc.cyan("agentsea <cloud>")} to see setup instructions for a specific provider.`;
}

function getHelpInstallSection(): string {
  return `${pc.bold("INSTALL")}
  curl -fsSL ${SPAWN_CDN}/cli/install.sh | bash`;
}

function getHelpTroubleshootingSection(): string {
  return `${pc.bold("TROUBLESHOOTING")}
  ${pc.dim("*")} Script not found: Run ${pc.cyan("agentsea matrix")} to verify the combination exists
  ${pc.dim("*")} Missing credentials: Run ${pc.cyan("agentsea <cloud>")} to see setup instructions
  ${pc.dim("*")} Update issues: Try ${pc.cyan("agentsea update")} or reinstall manually
  ${pc.dim("*")} Garbled unicode: Set ${pc.cyan("SPAWN_NO_UNICODE=1")} for ASCII-only output
  ${pc.dim("*")} Missing unicode over SSH: Set ${pc.cyan("SPAWN_UNICODE=1")} to force unicode on
  ${pc.dim("*")} OpenClaw dashboard on WSL shows "origin not allowed": the CLI opens ${pc.cyan("http://127.0.0.1:…")} in Windows so the origin matches the gateway; if that fails, use the logged ${pc.cyan("http://172.x…")} URL and set ${pc.cyan("SPAWN_WSL_OPEN_BROWSER_LAN_IP=1")} if needed (you may need matching gateway.controlUi.allowedOrigins for the LAN host).
  ${pc.dim("*")} Slow startup: Set ${pc.cyan("SPAWN_NO_UPDATE_CHECK=1")} to skip auto-update`;
}

function getHelpEnvVarsSection(): string {
  return `${pc.bold("ENVIRONMENT VARIABLES")}
  ${pc.cyan("THEGRID_API_KEY")}        The Grid platform API key (all agents require this)
  ${pc.cyan("MODEL_ID")}                  Override agent's default LLM model (or use --model flag; skips catalogue picker)
  ${pc.cyan("SPAWN_SKIP_MODEL_PROMPT=1")} Skip interactive model picker (${pc.cyan("--headless")} already implies no prompts)
  ${pc.cyan("SPAWN_NO_UPDATE_CHECK=1")}   Skip auto-update check on startup
  ${pc.cyan("SPAWN_NO_UNICODE=1")}        Force ASCII output (no unicode symbols)
  ${pc.cyan("SPAWN_UNICODE=1")}           Force Unicode output (override auto-detection)
  ${pc.cyan("SPAWN_HOME")}                Override spawn data directory (default: ~/.spawn)
  ${pc.cyan("SPAWN_DEBUG=1")}             Show debug output (unicode detection, etc.)
  ${pc.cyan("SPAWN_VERBOSE=1")}           Verbose provisioning logs (same effect as ${pc.cyan("--verbose")})
  ${pc.cyan("SPAWN_ENABLED_STEPS")}       Comma-separated setup steps (set by --steps/--config)
  ${pc.cyan("SPAWN_SETUP_PROMPT=1")}     Show setup multiselect on direct \`agent cloud\` runs (or use --setup-prompt)
  ${pc.cyan("SPAWN_PROMPT_FOR_NAME=1")}  Ask for spawn name even on direct runs (default is an auto-generated name)
  ${pc.cyan("TELEGRAM_BOT_TOKEN")}       Telegram bot token for non-interactive setup
  ${pc.cyan("SPAWN_HEADLESS=1")}          Set automatically in --headless mode (for scripts)
  ${pc.cyan("SPAWN_CUSTOM=1")}           Set automatically in --custom mode (show size/region pickers)`;
}

function getHelpFooterSection(): string {
  return `${pc.bold("MORE INFO")}
  Repository:  https://github.com/${REPO}
  The Grid:    https://thegrid.ai`;
}

export function cmdHelp(): void {
  const sections = [
    "",
    `${pc.bold("agentsea")} -- Launch any AI coding agent on any cloud`,
    "",
    getHelpUsageSection(),
    "",
    getHelpExamplesSection(),
    "",
    getHelpAuthSection(),
    "",
    getHelpInstallSection(),
    "",
    getHelpTroubleshootingSection(),
    "",
    getHelpEnvVarsSection(),
    "",
    getHelpFooterSection(),
  ];
  console.log(sections.join("\n"));
}
