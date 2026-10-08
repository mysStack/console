#!/bin/sh
# Unit tests for every *.test.ts in the workspace.
#
# No test framework is involved. The files use node:test and are executed with the
# repo's own esno loader, which strips TypeScript and resolves the extensionless
# relative imports the sources use. esno is already a devDependency (build:locales
# drives it), so this adds nothing to install.
#
# On a machine without node, run it in a container. Mount the repo so both the
# sources and the installed node_modules are visible:
#
#   docker run --rm -v "$PWD:/app" -w /app node:22-alpine sh scripts/test.sh
#
# Exits non-zero when anything fails, so CI can gate on it.
set -u

found=0
files_ok=0
files_bad=0
total=0
passed=0
failed=0
bad=''

for file in $(find packages -name '*.test.ts' -not -path '*/node_modules/*' | sort); do
  found=$((found + 1))
  output=$(./node_modules/.bin/esno "$file" 2>&1)
  status=$?

  count=$(printf '%s\n' "$output" | grep -oE '# tests [0-9]+' | head -1 | grep -oE '[0-9]+')
  ok=$(printf '%s\n' "$output" | grep -oE '# pass [0-9]+' | head -1 | grep -oE '[0-9]+')
  ko=$(printf '%s\n' "$output" | grep -oE '# fail [0-9]+' | head -1 | grep -oE '[0-9]+')
  [ -z "$count" ] && count=0
  [ -z "$ok" ] && ok=0
  [ -z "$ko" ] && ko=0

  total=$((total + count))
  passed=$((passed + ok))
  failed=$((failed + ko))

  if [ "$status" -eq 0 ] && [ "$ko" -eq 0 ]; then
    files_ok=$((files_ok + 1))
    printf 'ok   %-68s %s/%s\n' "${file#packages/}" "$ok" "$count"
  else
    files_bad=$((files_bad + 1))
    bad="$bad $file"
    printf 'FAIL %-68s %s/%s\n' "${file#packages/}" "$ok" "$count"
    printf '%s\n' "$output" | grep -E 'AssertionError|Error:|error:' | head -4 | sed 's/^/       /'
  fi
done

echo
echo "files: $files_ok ok, $files_bad failed (of $found)"
echo "tests: $passed passed, $failed failed (of $total)"

if [ "$files_bad" -gt 0 ]; then
  echo 'failed:'
  for file in $bad; do
    echo "  $file"
  done
  exit 1
fi
exit 0
