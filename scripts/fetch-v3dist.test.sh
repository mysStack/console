#!/usr/bin/env bash
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/fetch-v3dist.sh"

if "$script" '' >/tmp/fetch-v3dist-test.out 2>&1; then
  echo '空版本号应失败' >&2
  exit 1
fi
if "$script" 'v3.1/unsafe' >/tmp/fetch-v3dist-test.out 2>&1; then
  echo '非法版本号应失败' >&2
  exit 1
fi
if "$script" 'v3.1' 'dist/unsafe' >/tmp/fetch-v3dist-test.out 2>&1; then
  echo '非目标目录应失败' >&2
  exit 1
fi
echo 'fetch-v3dist 参数校验通过'
