#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/run_matverse_10_10.sh [input_dir] [output_dir]

Runs the MatVerse 10/10 anchoring and PQC signing workflow.

Environment variables:
  MATVERSE_RPC         RPC endpoint (e.g. https://rpc.sepolia.org)
  MATVERSE_CONTRACT    Deployed contract address
  MATVERSE_PRIVATE_KEY Private key for anchoring
  MATVERSE_CHAIN_ID    Optional chain id (default: 11155111)
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

input_dir="${1:-inputs/real_world}"
output_dir="${2:-output}"
chain_id="${MATVERSE_CHAIN_ID:-11155111}"

if [[ -z "${MATVERSE_RPC:-}" ]]; then
  echo "MATVERSE_RPC is required. Example: https://rpc.sepolia.org" >&2
  exit 1
fi

if [[ "${MATVERSE_RPC}" == *"sekolia"* ]]; then
  echo "MATVERSE_RPC appears to use 'sekolia'. Did you mean https://rpc.sepolia.org?" >&2
  exit 1
fi

if [[ -z "${MATVERSE_CONTRACT:-}" ]]; then
  echo "MATVERSE_CONTRACT is required (deployed contract address)." >&2
  exit 1
fi

if [[ -z "${MATVERSE_PRIVATE_KEY:-}" ]]; then
  echo "MATVERSE_PRIVATE_KEY is required for anchoring." >&2
  exit 1
fi

if [[ ! -f "first_breath.py" ]]; then
  echo "first_breath.py not found in the current directory." >&2
  exit 1
fi

if [[ ! -f "pqc_sign_mldsa.py" ]]; then
  echo "pqc_sign_mldsa.py not found in the current directory." >&2
  exit 1
fi

python first_breath.py \
  --input-dir "${input_dir}" \
  --output-dir "${output_dir}" \
  --anchor --chain-id "${chain_id}"

python pqc_sign_mldsa.py "${output_dir}/first_breath_report.json"
