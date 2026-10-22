"""用隔离的真实 Git 仓库验证门禁，不连接 GitHub 或测试集群。"""

import hashlib
import json
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
