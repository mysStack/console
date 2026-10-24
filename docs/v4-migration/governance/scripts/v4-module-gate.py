#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORD = "docs/v4-migration/module-execution.json"
GOVERNANCE = "docs/v4-migration/governance"
TOOL_PATHS = {".husky/pre-commit", ".husky/commit-msg",
              ".github/workflows/v4-module-gate.yml"}
PHASES = ("REA", "DEV", "VERIFY", "PR")
DIMENSIONS = ("entry", "fields", "validation", "api", "store", "action",
              "rbac", "scope", "cache", "errors", "runtime", "v4")


def record_file(repo: Path, name: str) -> Path:
    path = (repo / name.split("#", 1)[0]).resolve()
    if not path.is_relative_to(repo) or not path.is_file():
        fail(f"证据文件不存在或越界：{name}")
    return path


def is_record_path(path: str) -> bool:
    return (path in TOOL_PATHS or path.startswith("docs/v4-migration/") or
            path == "docs/superpowers/plans/2026-10-21-v3-to-v4-native-migration.md")


def check_delivery(repo: Path, state: dict, key: str, head: str, operation: str) -> None:
    delivery = state.get(key, {})
    if delivery.get("status") != "已完成" or not delivery.get("documents"):
        fail(f"缺少 {key.upper()} 交付和实际检查结果记录，不能跳阶段")
    source = delivery.get("sourceCommit", "")
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        fail(f"{key} 交付缺少有效 sourceCommit")
    run("git", "merge-base", "--is-ancestor", source, head, cwd=repo)
    changed = run("git", "diff", "--name-only", "--no-renames", "-z", source, head, cwd=repo)
    if any(not is_record_path(path) for path in changed.split("\0") if path):
        fail(f"{key.upper()} 证据之后有代码变更，必须重新核验")
    for document in delivery["documents"]:
        name = document["path"]
        evidence = record_file(repo, name)
        run("git", "ls-files", "--error-unmatch", name, cwd=repo)
        if hashlib.sha256(evidence.read_bytes()).hexdigest() != document.get("sha256"):
            fail(f"{key} 交付证据摘要变化：{name}")
        if operation == "commit":
            result = subprocess.run(["git", "show", f":{name}"], cwd=repo, capture_output=True)
            if result.returncode or result.stdout != evidence.read_bytes():
                fail(f"{key} 交付证据未正确暂存：{name}")


def check_phase(repo: Path, args, branch: str, head: str) -> tuple[str, str]:
    path = repo / RECORD
    if not path.is_file():
        if args.records_only and args.phase == "REA" and args.stage in ("start", "commit"):
            return "REA", "尚未建立记录；仅允许初始化证据文档"
        fail(f"缺少 {RECORD}；先用 --phase REA --records-only 建立记录")
    state = json.loads(path.read_text())
    if state.get("module") != args.module or state.get("branch") != branch:
        fail("阶段记录的模块或分支与当前任务不符")
    phase = state.get("phase")
    if phase not in PHASES or not state.get("capability", "").strip():
        fail("阶段记录缺少有效 phase 或固定 capability 范围")
    if args.phase and args.phase != phase:
        fail(f"请求阶段 {args.phase} 与记录阶段 {phase} 不一致；不得跳级")
    if args.stage == "commit":
        staged = run("git", "show", f":{RECORD}", cwd=repo, check=False)
        if staged != path.read_text().strip():
            fail("阶段记录必须暂存且与工作区一致，防止提交旧状态")
    if args.records_only:
        if args.stage == "deploy":
            fail("--records-only 不授权部署")
        return phase, "仅整理记录；未核准业务开发、部署或模块验收"
    if phase == "REA":
        if args.stage in ("deploy", "pr"):
            fail("REA 未完成，不能部署或进入正式 PR；Draft 记录更新使用 --records-only")
        return phase, "分析中；仅允许取证和记录，不允许业务代码提交或部署"
    rea = state.get("rea", {})
    if rea.get("status") != "已通过":
        fail("当前能力 REA 未通过，禁止进入 DEV/VERIFY/PR")
    if rea.get("highRiskUnknowns") != []:
        fail("仍有未闭环高风险项，或缺少高风险项清单")
    documents = rea.get("documents", [])
    if not documents:
        fail("REA 缺少带摘要的证据文件")
    names = set()
    for document in documents:
        name = document["path"]
        evidence = record_file(repo, name)
        # 必须是该分支可提交的证据，不能引用另一 Worktree 的临时文件。
        run("git", "ls-files", "--error-unmatch", name, cwd=repo)
        content = evidence.read_bytes()
        if hashlib.sha256(content).hexdigest() != document.get("sha256"):
            fail(f"REA 证据摘要变化，需要重新核对：{name}")
        if args.stage == "commit":
            staged = subprocess.run(["git", "show", f":{name}"], cwd=repo, capture_output=True)
            if staged.returncode or staged.stdout != content:
                fail(f"证据暂存内容与核对内容不一致：{name}")
        names.add(name)
    coverage = rea.get("coverage", {})
    for key in DIMENSIONS:
        item = coverage.get(key, {})
        refs = item.get("evidence", [])
        if item.get("status") != "已核对" or not refs or not set(refs).issubset(names):
            fail(f"REA 覆盖维度未闭环或证据未绑定：{key}")
    source = rea.get("sourceCommit", "")
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        fail("REA sourceCommit 必须为完整 Git SHA")
    run("git", "merge-base", "--is-ancestor", source, head, cwd=repo)
    artifact = "packages/bootstrap/assets/v3dist"
    for revision in (source, head):
        tree = run("git", "rev-parse", f"{revision}:{artifact}", cwd=repo)
        if tree != rea.get("artifactTree"):
            fail("REA 绑定的 V3 tree 与源提交或当前分支不一致")
    if run("git", "diff", "--name-only", "HEAD", "--", artifact, cwd=repo):
        fail("V3 制品有未提交变更，需要重新取证")
    review = rea.get("review") or {}
    if not review.get("reviewer") or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", review.get("date", "")):
        fail("REA 缺少指定复核人和复核日期；不得自行签署")
    reference = review.get("reference", "").split("#", 1)[0]
    if reference not in names:
        fail("REA 缺少绑定到证据摘要的正式复核依据")
    if phase in ("VERIFY", "PR"):
        check_delivery(repo, state, "dev", head, args.stage)
    if phase == "PR":
        check_delivery(repo, state, "verify", head, args.stage)
    if args.stage == "deploy" and phase != "VERIFY":
        fail("部署必须处于 VERIFY 阶段")
    if args.stage == "pr" and phase != "PR":
        fail("正式 PR 必须处于 PR 阶段")
    return phase, "REA 记录结构、覆盖维度与摘要检查通过；不替代内容复核或模块验收"


def check_record_changes(repo: Path, base: str = "HEAD", head: str | None = None) -> None:
    revisions = [base, head] if head else [base]
    paths = run("git", "diff", "--no-renames", "--name-only", "-z", *revisions, cwd=repo).split("\0")
    for path in filter(None, paths):
        if not is_record_path(path):
            fail(f"REA/记录通道禁止业务或无关改动：{path}")
        if (repo / path).is_symlink():
            fail(f"记录通道不允许符号链接：{path}")


def run(*args: str, cwd: Path | None = None, check: bool = True) -> str:
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"命令失败：{' '.join(args)}\n{detail}")
    return result.stdout.strip()


def fail(message: str) -> None:
    print(f"门禁失败：{message}", file=sys.stderr)
    raise SystemExit(1)


def remote_sha(repo: Path, branch: str) -> str:
    output = run("git", "ls-remote", "--heads", "origin", f"refs/heads/{branch}", cwd=repo)
    if not output:
        fail(f"远程分支 origin/{branch} 不存在")
    return output.split()[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="KubeSphere V4 模块开发硬门禁")
    parser.add_argument("module")
    parser.add_argument("stage", choices=("start", "commit", "deploy", "pr", "message", "ci"))
    parser.add_argument("--tag")
    parser.add_argument("--pr", type=int)
    parser.add_argument("--phase", choices=PHASES, help="业务阶段，必须与模块记录一致")
    parser.add_argument("--records-only", action="store_true", help="仅文档、证据及门禁工具维护，不放行业务开发")
    parser.add_argument("--hook", action="store_true", help="由 Git 钩子自动识别登记模块")
    parser.add_argument("--message-file", type=Path)
    parser.add_argument("--head-branch")
    parser.add_argument("--base-branch")
    parser.add_argument("--base", help="PR 目标完整 SHA；CI 不依赖本地 Worktree 路径或凭据")
    parser.add_argument("--draft", action="store_true")
    args = parser.parse_args()

    try:
        repo = Path(run("git", "rev-parse", "--show-toplevel")).resolve()
        branch = run("git", "branch", "--show-current", cwd=repo)
        head = run("git", "rev-parse", "HEAD", cwd=repo)
    except RuntimeError as error:
        fail(str(error))

    workspace = repo.parent if ROOT.name == "governance" else ROOT
    registry = repo / GOVERNANCE / "v4-module-branch-registry.json" if args.stage == "ci" else workspace / "v4-module-branch-registry.json"
    config = json.loads(registry.read_text())
    integration = config["integrationBranch"]
    if args.stage == "ci":
        branch = args.head_branch or ""
        if args.base_branch != integration:
            fail(f"PR 目标必须为 {integration}")
        if not re.fullmatch(r"[0-9a-f]{40}", args.base or ""):
            fail("CI 缺少完整 PR Base SHA")
    if args.module == "auto":
        if branch in (integration, config["stableBranch"]):
            fail("禁止直接提交集成分支或稳定分支")
        registered = [key for key, item in config["modules"].items() if item["branch"] == branch]
        if not registered:
            if args.hook and branch and not branch.startswith("feature/v4-"):
                print("非迁移功能分支，保留原有提交流程")
                return
            fail(f"迁移分支 {branch!r} 未登记；先更新主计划和注册表")
        args.module = registered[0]
    module = config["modules"].get(args.module)
    if not module:
        fail(f"模块 {args.module!r} 未登记；先更新主计划和注册表")

    expected_repo = (workspace / module["worktree"]).resolve()
    expected_branch = module["branch"]

    if args.stage != "ci" and repo != expected_repo:
        fail(f"Worktree 错误：当前 {repo}，要求 {expected_repo}")
    if branch != expected_branch:
        fail(f"分支错误：当前 {branch}，要求 {expected_branch}")
    if branch in (integration, config["stableBranch"]):
        fail("禁止在集成分支或稳定分支开发")

    if args.stage == "message":
        if not args.message_file:
            fail("缺少提交说明文件")
        lines = [line.strip() for line in args.message_file.read_text().splitlines()
                 if line.strip() and not line.lstrip().startswith("#")]
        title = re.sub(r"^\w+(?:\([^)]*\))?!?:\s*", "", lines[0] if lines else "")
        if not re.search(r"[\u3400-\u4dbf\u4e00-\u9fff]", title):
            fail("新提交标题须使用中文；只在 Conventional Commit scope 中写中文不符合要求")
        print("中文提交标题检查通过")
        return

    try:
        integration_sha = args.base if args.stage == "ci" else remote_sha(repo, integration)
        ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", integration_sha, head], cwd=repo
        ).returncode
    except RuntimeError as error:
        fail(str(error))
    if ancestor:
        fail(f"远程集成基线 {integration_sha[:12]} 不是当前分支祖先；先核对分支来源")

    tracked_status = run("git", "status", "--porcelain", "--untracked-files=no", cwd=repo)
    if args.stage in ("start", "deploy", "pr", "ci") and tracked_status:
        fail(f"{args.stage} 阶段要求 tracked 工作区干净")
    if args.stage == "commit":
        for extra in ((), ("--cached",)):
            result = subprocess.run(["git", "diff", "--check", *extra], cwd=repo)
            if result.returncode:
                fail("git diff --check 工作区或暂存区未通过")

    if args.stage == "ci":
        run("git", "diff", "--check", args.base, head, cwd=repo)
        paths = run("git", "diff", "--name-only", "--no-renames", "-z", args.base, head, cwd=repo)
        args.records_only = args.draft and all(is_record_path(path) for path in paths.split("\0") if path)
        if not args.draft:
            state = json.loads((repo / RECORD).read_text())
            if state.get("phase") != "PR":
                fail("非 Draft PR 必须处于 PR 阶段并完成 DEV/VERIFY")

    phase, phase_message = check_phase(repo, args, branch, head)
    if args.stage == "commit" and (phase != "DEV" or args.records_only):
        check_record_changes(repo)
    # PR/VERIFY 可包含已验证的业务实现；REA/记录通道限制完整 PR 差异。
    if args.stage == "ci" and (phase == "REA" or args.records_only):
        check_record_changes(repo, args.base, head)

    if args.stage in ("deploy", "pr"):
        branch_remote_sha = remote_sha(repo, expected_branch)
        if branch_remote_sha != head:
            fail(f"本地 HEAD {head[:12]} 与远程 {branch_remote_sha[:12]} 不一致")

    if args.stage == "deploy":
        if not args.tag:
            fail("deploy 阶段必须提供 --tag")
        prefix = re.sub(r"[/_]", "-", expected_branch)
        pattern = rf"^{re.escape(prefix)}-[0-9]{{8}}-[0-9]{{6}}-{head[:12]}$"
        if not re.fullmatch(pattern, args.tag):
            fail(f"镜像标签不符合分支+上海时间+当前短 SHA：要求 {pattern}")

    if args.stage == "pr":
        if not args.pr:
            fail("pr 阶段必须提供 --pr")
        data = json.loads(
            run(
                "gh",
                "pr",
                "view",
                str(args.pr),
                "--json",
                "headRefName,baseRefName,headRefOid,isDraft,state",
                cwd=repo,
            )
        )
        if data["headRefName"] != expected_branch or data["baseRefName"] != integration:
            fail(f"PR 分支错误：{data['headRefName']} -> {data['baseRefName']}")
        if data["headRefOid"] != head:
            fail("PR Head SHA 与当前分支不一致")
        if data["state"] != "OPEN":
            fail("PR 不是 Open 状态")
        if args.records_only and not data["isDraft"]:
            fail("记录通道只能更新 Draft PR，不代表正式评审材料通过")

    print("Git/Worktree 身份检查通过")
    print(f"phase={phase}")
    print(f"阶段检查：{phase_message}")
    if args.stage == "ci":
        print("PR 阶段与完整差异检查完成，不代表模块验收；Draft 不授权合并")
    print("未自动验证：测试、CI Run、镜像 digest、Pod imageID、浏览器或证据语义真实性")
    print(f"module={args.module}")
    print(f"scope={module['scope']}")
    print(f"stage={args.stage}")
    print(f"worktree={repo}")
    print(f"branch={branch}")
    print(f"head={head}")
    print(f"integration={integration_sha}")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        fail(str(error))
