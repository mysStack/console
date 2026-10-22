"""用隔离的真实 Git 仓库验证门禁，不连接 GitHub 或测试集群。"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class ModuleGateTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "console-workloads"
        self.repo.mkdir()
        scripts = self.root / "scripts"
        scripts.mkdir()
        self.gate = scripts / "v4-module-gate.py"
        shutil.copy(Path(__file__).with_name("v4-module-gate.py"), self.gate)
        (self.root / "v4-module-branch-registry.json").write_text(json.dumps({
            "integrationBranch": "feature/v4-migration", "stableBranch": "release-4.1.5",
            "modules": {"workloads": {"branch": "feature/v4-workloads",
                "worktree": "console-workloads", "scope": "测试 Workload"}},
        }))
        self.git("init", "-q", "-b", "feature/v4-migration")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Gate Test")
        self.docs = self.repo / "docs/v4-migration"
        self.docs.mkdir(parents=True)
        artifact = self.repo / "packages/bootstrap/assets/v3dist/chunk.js"
        artifact.parent.mkdir(parents=True)
        artifact.write_text("/* 固定测试制品 */\n")
        evidence = self.docs / "rea.md"
        evidence.write_text("# 测试证据\n固定能力范围、观察和复核引用。\n")
        self.git("add", ".")
        self.git("commit", "-qm", "baseline")
        base = self.git("rev-parse", "HEAD")
        self.base = base
        self.git("init", "--bare", "-q", str(self.root / "origin.git"))
        self.git("remote", "add", "origin", str(self.root / "origin.git"))
        self.git("push", "-q", "origin", "feature/v4-migration")
        self.git("switch", "-qc", "feature/v4-workloads")
        self.state = {
            "module": "workloads", "branch": "feature/v4-workloads",
            "capability": "deployment-settings", "phase": "REA",
            "rea": {"status": "分析中", "sourceCommit": base,
                "artifactTree": self.git("rev-parse", "HEAD:packages/bootstrap/assets/v3dist"),
                "documents": [{"path": "docs/v4-migration/rea.md",
                    "sha256": hashlib.sha256(evidence.read_bytes()).hexdigest()}],
                "coverage": {key: {"status": "已核对", "evidence": ["docs/v4-migration/rea.md"]}
                    for key in ("entry", "fields", "validation", "api", "store",
                        "action", "rbac", "scope", "cache", "errors", "runtime", "v4")},
                "highRiskUnknowns": ["字段等价尚未闭环"], "review": None},
        }
        self.save_state()

    def git(self, *args):
        result = subprocess.run(["git", *args], cwd=self.repo, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def save_state(self):
        (self.docs / "module-execution.json").write_text(json.dumps(self.state, ensure_ascii=False))
        self.git("add", ".")
        self.git("commit", "-qm", "record", "--allow-empty")

    def invoke(self, operation="start", *args):
        return subprocess.run([sys.executable, str(self.gate), "workloads", operation, *args],
            cwd=self.repo, capture_output=True, text=True)

    def assert_rejected(self, operation="start", *args):
        result = self.invoke(operation, *args)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("门禁失败", result.stderr)

    def approve_fixture(self):
        # 仅隔离测试数据；不写入真实项目的签署或权限。
        self.state["phase"] = "DEV"
        self.state["rea"].update(status="已通过", highRiskUnknowns=[], review={
            "reviewer": "测试负责人", "date": "2026-10-22",
            "reference": "docs/v4-migration/rea.md#测试证据"})

    def test_start_without_record_is_rejected(self):
        self.git("rm", "-q", "docs/v4-migration/module-execution.json")
        self.git("commit", "-qm", "remove record")
        self.assert_rejected()

    def test_rea_can_collect_documents(self):
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rea_cannot_commit_business_code_even_with_record_flag(self):
        (self.repo / "packages/editor.ts").write_text("export const editor = 1;\n")
        self.git("add", ".")
        self.assert_rejected("commit")
        self.assert_rejected("commit", "--records-only")

    def test_staged_whitespace_is_checked(self):
        (self.docs / "bad.md").write_text("错误尾空格   \n")
        self.git("add", ".")
        self.assert_rejected("commit")

    def test_unreviewed_rea_cannot_start_dev(self):
        self.state["phase"] = "DEV"
        self.save_state()
        self.assert_rejected()

    def test_review_does_not_override_open_risk_or_missing_coverage(self):
        self.approve_fixture()
        for mutation in ("risk", "coverage", "review", "artifact", "source", "digest"):
            with self.subTest(mutation=mutation):
                original = json.loads(json.dumps(self.state))
                rea = self.state["rea"]
                if mutation == "risk": rea["highRiskUnknowns"] = ["权限未知"]
                if mutation == "coverage": del rea["coverage"]["fields"]
                if mutation == "review": rea["review"]["reference"] = "docs/missing.md"
                if mutation == "artifact": rea["artifactTree"] = "0" * 40
                if mutation == "source": rea["sourceCommit"] = "0" * 40
                if mutation == "digest": rea["documents"][0]["sha256"] = "0" * 64
                self.save_state()
                self.assert_rejected()
                self.state = original

    def test_bound_reviewed_rea_allows_dev(self):
        self.approve_fixture()
        self.save_state()
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("模块门禁通过", result.stdout)

    def test_explicit_phase_cannot_disagree_with_record(self):
        self.assert_rejected("start", "--phase", "DEV")

    def test_verify_and_pr_require_preceding_delivery(self):
        self.approve_fixture()
        for phase in ("VERIFY", "PR"):
            with self.subTest(phase=phase):
                self.state["phase"] = phase
                self.save_state()
                self.assert_rejected()

    def test_verify_delivery_is_bound_to_application_code(self):
        self.approve_fixture()
        self.state["phase"] = "VERIFY"
        self.state["dev"] = {"status": "已完成", "sourceCommit": self.git("rev-parse", "HEAD"),
            "documents": self.state["rea"]["documents"]}
        self.save_state()
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        (self.repo / "packages/editor.ts").write_text("新代码未经本地验证\n")
        self.git("add", ".")
        self.git("commit", "-qm", "unverified implementation")
        self.assert_rejected()

    def test_verify_cannot_commit_new_business_code(self):
        self.approve_fixture()
        self.state["phase"] = "VERIFY"
        self.state["dev"] = {"status": "已完成", "sourceCommit": self.git("rev-parse", "HEAD"),
            "documents": self.state["rea"]["documents"]}
        self.save_state()
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        self.assert_rejected("commit")

    def test_record_flag_allows_document_commit_without_approving_rea(self):
        (self.docs / "new.md").write_text("# 补充证据\n")
        self.git("add", ".")
        result = self.invoke("commit", "--records-only")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_stage_record_and_evidence_must_match_staged_content(self):
        self.approve_fixture()
        self.save_state()
        (self.docs / "rea.md").write_text("未暂存的变更\n")
        self.assert_rejected("commit")
        self.git("restore", "docs/v4-migration/rea.md")
        self.state["phase"] = "REA"
        (self.docs / "module-execution.json").write_text(json.dumps(self.state))
        self.assert_rejected("commit")

    def test_rea_cannot_deploy(self):
        self.git("push", "-q", "origin", "feature/v4-workloads")
        tag = "feature-v4-workloads-20261022-230000-" + self.git("rev-parse", "HEAD")[:12]
        self.assert_rejected("deploy", "--tag", tag)

    def test_wrong_worktree_branch_and_dirty_start_still_fail(self):
        (self.docs / "rea.md").write_text("已修改\n")
        self.assert_rejected()
        self.git("restore", "docs/v4-migration/rea.md")
        self.git("switch", "-qc", "feature/wrong")
        self.assert_rejected()

    def test_wrong_registered_worktree_is_rejected(self):
        registry = self.root / "v4-module-branch-registry.json"
        config = json.loads(registry.read_text())
        config["modules"]["workloads"]["worktree"] = "other-worktree"
        registry.write_text(json.dumps(config))
        self.assert_rejected()

    def test_complete_previous_deliveries_allow_pr_preparation(self):
        self.approve_fixture()
        self.state["phase"] = "PR"
        report = {"status": "已完成", "sourceCommit": self.git("rev-parse", "HEAD"),
            "documents": self.state["rea"]["documents"]}
        self.state.update(dev=report, verify=report)
        self.save_state()
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_records_only_cannot_be_used_to_deploy(self):
        self.git("push", "-q", "origin", "feature/v4-workloads")
        tag = "feature-v4-workloads-20261022-230000-" + self.git("rev-parse", "HEAD")[:12]
        self.assert_rejected("deploy", "--records-only", "--tag", tag)

    def install_hooks(self):
        source = Path(__file__).resolve().parents[4]
        governance = self.docs / "governance"
        (governance / "scripts").mkdir(parents=True)
        shutil.copy(self.gate, governance / "scripts/v4-module-gate.py")
        shutil.copy(self.root / "v4-module-branch-registry.json",
                    governance / "v4-module-branch-registry.json")
        hooks = self.repo / ".husky"
        (hooks / "_").mkdir(parents=True)
        # CI 不安装 Node/Husky；替代外部启动器，保留钩子的失败即停语义。
        (hooks / "_/husky.sh").write_text("set -e\n")
        for name in ("pre-commit", "commit-msg"):
            if (source / ".husky" / name).exists():
                shutil.copy(source / ".husky" / name, hooks / name)
                (hooks / name).chmod(0o755)
        self.git("add", ".")
        self.git("commit", "-qm", "安装测试钩子")
        self.git("config", "core.hooksPath", ".husky")
        # 格式工具是外部依赖；门禁、Git、钩子和实际提交均真实执行。
        tools = self.root / "bin"
        tools.mkdir()
        formatter = tools / "npx"
        formatter.write_text("#!/bin/sh\nexit 0\n")
        formatter.chmod(0o755)
        self.hook_env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"])
        self.hook_env.pop("HUSKY", None)

    def commit_with_hooks(self, message="docs(迁移): 补充取证记录"):
        return subprocess.run(["git", "commit", "-m", message], cwd=self.repo,
            capture_output=True, text=True, env=self.hook_env)

    def ci(self, draft=True, branch="feature/v4-workloads", base_branch="feature/v4-migration"):
        self.git("add", ".")
        self.git("commit", "-qm", "测试 PR 提交", "--allow-empty")
        args = [sys.executable, str(self.gate), "auto", "ci", "--head-branch", branch,
            "--base-branch", base_branch, "--base", self.base]
        if draft:
            args.append("--draft")
        return subprocess.run(args, cwd=self.repo, capture_output=True, text=True)

    def prepare_ci(self):
        governance = self.docs / "governance"
        governance.mkdir()
        shutil.copy(self.root / "v4-module-branch-registry.json",
                    governance / "v4-module-branch-registry.json")

    def test_real_commit_hook_rejects_rea_business_code(self):
        self.install_hooks()
        before = self.git("rev-parse", "HEAD")
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        result = self.commit_with_hooks()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD"), before)
        self.assertIn("门禁失败", result.stdout + result.stderr)

    def test_real_commit_hook_allows_chinese_evidence_commit(self):
        self.install_hooks()
        (self.docs / "new.md").write_text("# 新增运行时观察\n")
        self.git("add", ".")
        result = self.commit_with_hooks()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_real_commit_msg_hook_rejects_english_title_even_with_chinese_scope(self):
        self.install_hooks()
        (self.docs / "new.md").write_text("# 新证据\n")
        self.git("add", ".")
        before = self.git("rev-parse", "HEAD")
        result = self.commit_with_hooks("docs(迁移): record evidence")
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD"), before)
        self.assertIn("中文", result.stdout + result.stderr)

    def test_real_hook_rejects_unregistered_migration_branch(self):
        self.install_hooks()
        self.git("switch", "-qc", "feature/v4-unregistered")
        (self.docs / "new.md").write_text("# 证据\n")
        self.git("add", ".")
        result = self.commit_with_hooks()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_real_hook_preserves_unrelated_feature_branch(self):
        self.install_hooks()
        self.git("switch", "-qc", "feature/unrelated")
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        result = self.commit_with_hooks("fix: unrelated change")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_hook_checks_final_content_after_formatter(self):
        self.install_hooks()
        (self.docs / "new.md").write_text("# 证据\n")
        self.git("add", ".")
        (self.root / "bin/npx").write_text(
            "#!/bin/sh\nprintf 'export const changed = true;\\n' > packages/editor.ts\n"
            "git add packages/editor.ts\n")
        result = self.commit_with_hooks()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("门禁失败", result.stdout + result.stderr)

    def test_hook_rejects_wrong_worktree_and_direct_integration_commit(self):
        self.install_hooks()
        (self.docs / "new.md").write_text("# 证据\n")
        self.git("add", ".")
        registry = self.root / "v4-module-branch-registry.json"
        config = json.loads(registry.read_text())
        config["modules"]["workloads"]["worktree"] = "another-worktree"
        registry.write_text(json.dumps(config))
        result = self.commit_with_hooks()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Worktree", result.stdout + result.stderr)
        self.git("branch", "-m", "feature/v4-migration-test")
        config["integrationBranch"] = "feature/v4-migration-test"
        registry.write_text(json.dumps(config))
        result = self.commit_with_hooks()
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("禁止直接提交", result.stdout + result.stderr)

    def test_ci_accepts_valid_dev_and_completed_pr_without_requiring_runner_worktree(self):
        self.prepare_ci()
        self.approve_fixture()
        self.save_state()
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        self.git("commit", "-qm", "开发实现")
        result = self.ci()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.state["phase"] = "PR"
        report = {"status": "已完成", "sourceCommit": self.git("rev-parse", "HEAD"),
            "documents": self.state["rea"]["documents"]}
        self.state.update(dev=report, verify=report)
        self.save_state()
        self.git("switch", "--detach", "-q")
        result = self.ci(draft=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_ci_rejects_rea_code_renamed_into_docs(self):
        self.prepare_ci()
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        self.git("commit", "-qm", "先行实现")
        self.base = self.git("rev-parse", "HEAD")
        # 删除源码也属于业务变化，不能利用 Git rename 检测藏到记录目录。
        self.git("mv", "packages/editor.ts", "docs/v4-migration/editor.ts")
        result = self.ci()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)

    def test_ci_allows_draft_evidence_at_runner_path(self):
        self.prepare_ci()
        # Runner 没有根目录生效文件；CI 只能读取仓库中的版本化注册表。
        (self.root / "v4-module-branch-registry.json").unlink()
        result = self.ci()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("不代表模块验收", result.stdout)

    def test_ci_rejects_full_pr_business_diff_even_if_latest_commit_is_docs(self):
        self.prepare_ci()
        (self.repo / "packages/editor.ts").write_text("export const changed = true;\n")
        self.git("add", ".")
        self.git("commit", "-qm", "历史先行实现")
        (self.docs / "new.md").write_text("# 最后一次只改文档\n")
        result = self.ci()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("REA", result.stderr)

    def test_ci_rejects_ready_pr_without_verify(self):
        self.prepare_ci()
        result = self.ci(draft=False)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("PR", result.stderr)

    def test_ci_rejects_wrong_target(self):
        self.prepare_ci()
        result = self.ci(base_branch="release-4.1.5")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)

    def test_records_channel_allows_only_authorized_hook_and_workflow_files(self):
        for name in (".husky/pre-commit", ".husky/commit-msg", ".github/workflows/v4-module-gate.yml"):
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("# 治理工具修复\n")
        self.git("add", ".")
        result = self.invoke("commit", "--records-only")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        (self.repo / ".github/workflows/deploy.yml").write_text("# 未授权工作流\n")
        self.git("add", ".")
        self.assert_rejected("commit", "--records-only")


if __name__ == "__main__":
    unittest.main(verbosity=2)
