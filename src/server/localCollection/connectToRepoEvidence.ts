/**
 * Connects file paths touched during a local session to the actual project.
 * Every connection here is a correlation, not a causal claim --
 * CLAUDE_LOCAL_COLLECTION_POC prompt: "경로가 같다는 이유만으로 그 세션이
 * 현재 코드를 만들었다고 단정하지 않는다", "작업 트리의 현재 상태와 세션
 * 당시 상태를 구분한다".
 *
 * Two independent, separately-labeled facts are produced per path:
 *  - whether the path is one of this project's known repo-evidence
 *    candidates (from a prior GitHub ingestion snapshot, if supplied), and
 *  - whether the path currently exists in the local working tree, as of
 *    collection time (never claimed to be "as of session time").
 * A path outside the declared project root is never resolved against
 * either -- it is reported as out-of-project, reusing the same root-escape
 * check the evaluation module's excerpt reader uses.
 */
import { existsSync } from "node:fs";
import { resolveWithinRoot } from "../evaluation/fixtureRoot.js";
import type { FileTouchEvent } from "./extractCollaborationEvents.js";

export type FileConnectionStatus =
  | "path_referenced_in_repo_evidence"
  | "path_exists_in_working_tree_now"
  | "path_not_found_in_working_tree"
  | "outside_project_root";

export interface FileConnection {
  path: string;
  status: FileConnectionStatus;
  note: string;
}

export function connectFileTouchesToProject(params: {
  fileTouches: FileTouchEvent[];
  projectRoot: string;
  /** Repo-relative paths already known as evidence candidates from a prior GitHub ingestion of the SAME project (Task 1), if the caller has one. Optional -- this PoC does not require running ingestion first. */
  repoEvidencePaths?: Set<string>;
}): FileConnection[] {
  const { fileTouches, projectRoot, repoEvidencePaths } = params;
  const uniquePaths = [...new Set(fileTouches.map((t) => t.path))];
  const connections: FileConnection[] = [];

  for (const path of uniquePaths) {
    const resolved = resolveWithinRoot(projectRoot, path);
    if (!resolved) {
      connections.push({ path, status: "outside_project_root", note: "이 경로는 선언된 프로젝트 루트 밖을 가리켜 연결을 시도하지 않았다" });
      continue;
    }
    if (repoEvidencePaths?.has(path)) {
      connections.push({
        path,
        status: "path_referenced_in_repo_evidence",
        note: "이 경로는 이전 GitHub 수집(Task 1)의 evidence 후보 경로와 일치한다 -- 세션이 이 코드를 작성했다는 뜻이 아니라 경로가 같다는 사실만 확인된다",
      });
      continue;
    }
    if (existsSync(resolved)) {
      connections.push({
        path,
        status: "path_exists_in_working_tree_now",
        note: "이 경로는 지금(수집 시점) 작업 트리에 존재한다 -- 세션 당시 상태와 같다고 가정하지 않는다",
      });
    } else {
      connections.push({ path, status: "path_not_found_in_working_tree", note: "이 경로는 지금 작업 트리에 존재하지 않는다(삭제/이동됐거나 세션 이후 변경됨)" });
    }
  }

  return connections;
}
