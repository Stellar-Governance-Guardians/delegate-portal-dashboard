#!/usr/bin/env bash
# Claims ledger runner (charter rule 7). Every claim is a shell command; exit
# 0 means the claim holds. Offline and deterministic — no live indexer, no
# network. Prints PASS/FAIL per claim and exits non-zero if any claim fails.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

if [ ! -f claims.json ]; then
  echo "claims: claims.json is missing" >&2
  exit 1
fi

fail=0
passed=0

while IFS=$'\t' read -r id cmd_b64; do
  cmd=$(printf '%s' "$cmd_b64" | base64 -d)
  if bash -c "$cmd" >/dev/null 2>&1; then
    printf 'PASS  %s\n' "$id"
    passed=$((passed + 1))
  else
    printf 'FAIL  %s\n      %s\n' "$id" "$cmd"
    fail=$((fail + 1))
  fi
done < <(node -e '
  const fs = require("node:fs");
  const claims = JSON.parse(fs.readFileSync("claims.json", "utf8")).claims;
  for (const c of claims) {
    if (typeof c.id !== "string" || typeof c.check?.cmd !== "string") {
      console.error("claims: malformed entry " + JSON.stringify(c.id));
      process.exit(1);
    }
    console.log(c.id + "\t" + Buffer.from(c.check.cmd, "utf8").toString("base64"));
  }
')

echo "claims: $passed passed, $fail failed"
if [ "$fail" -ne 0 ]; then
  exit 1
fi
