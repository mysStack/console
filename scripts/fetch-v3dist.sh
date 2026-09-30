#!/usr/bin/env bash
set -euo pipefail

v3_ref="${1:-}"
target_dir="${2:-packages/bootstrap/assets/v3dist}"
repository="${V3_REPOSITORY:-mysStack/kse-console-v3}"

if [[ ! "$v3_ref" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "用法: $0 <V3 release tag> [target directory]" >&2
  exit 2
fi

if [[ "$target_dir" != "packages/bootstrap/assets/v3dist" ]]; then
  echo "拒绝写入非 V3 静态资源目录: $target_dir" >&2
  exit 2
fi

asset_name="console-v3dist-${v3_ref}.tar.gz"
header_args=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  header_args=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

release_json="$work_dir/release.json"
curl -fsSL "${header_args[@]}" "https://api.github.com/repos/${repository}/releases/tags/${v3_ref}" -o "$release_json"
asset_url="$(jq -r --arg name "$asset_name" '.assets[] | select(.name == $name) | .browser_download_url' "$release_json" | head -n 1)"
if [[ -z "$asset_url" || "$asset_url" == "null" ]]; then
  echo "未找到 V3 制品: ${repository}@${v3_ref}/${asset_name}" >&2
  exit 1
fi

archive="$work_dir/$asset_name"
curl -fsSL "${header_args[@]}" -o "$archive" "$asset_url"
mkdir -p "$work_dir/dist"
tar -xzf "$archive" -C "$work_dir/dist"
test -s "$work_dir/dist/manifest.json"
test -s "$work_dir/dist/manifest.locale.json"
test -s "$work_dir/dist/.v3dist-source.json"
jq -e \
  --arg repository "$repository" \
  --arg ref "$v3_ref" \
  '.schemaVersion == 1 and .repository == $repository and .ref == $ref and (.commit | length) > 0' \
  "$work_dir/dist/.v3dist-source.json" >/dev/null

rm -rf -- "$target_dir"
mkdir -p "$(dirname "$target_dir")"
mv "$work_dir/dist" "$target_dir"
echo "已引入 V3 制品: ${repository}@${v3_ref}"
