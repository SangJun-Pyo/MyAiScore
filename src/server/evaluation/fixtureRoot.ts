/**
 * Resolves a relative path (e.g. from external_excerpts) against a declared
 * root directory, refusing anything that would escape it (path traversal via
 * "..", or an absolute path override). Astra Phase 2 review (R3): "fixture
 * 로컬 파일 해석은 명시된 fixture 루트 안으로 제한하고 외부 URL을 자동 조회하지
 * 않는다."
 *
 * Returns null (never throws) when the path would escape the root, so
 * callers can treat it exactly like "file not found" -- an explicit
 * unresolved reference, not a crash.
 */
import { isAbsolute, relative, resolve } from "node:path";

export function resolveWithinRoot(root: string, relativePath: string): string | null {
  if (isAbsolute(relativePath)) return null;
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, relativePath);
  const rel = relative(resolvedRoot, target);
  if (rel === "" ) return null; // resolves to the root itself, not a file inside it
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return target;
}
