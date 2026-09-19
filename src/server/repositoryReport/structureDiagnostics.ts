import type {
  IngestedFile,
  RepositoryInventory,
  RepositoryStructureDiagnostics,
} from "../../shared/contracts/ingestion.js";
import { isRepositoryReferencePath, isRepositorySourcePath } from "../../shared/repositorySignals.js";

function isGeneratedOrStructuralException(path: string): boolean {
  const value = path.toLowerCase();
  return isRepositoryReferencePath(value) ||
    /(^|\/)(generated|migrations?|vendor|snapshots?|__snapshots__)(\/|$)/.test(value) ||
    /(?:\.d\.ts|\.min\.[cm]?js)$/.test(value);
}

export function buildRepositoryStructureDiagnostics(
  files: IngestedFile[],
  inventory: RepositoryInventory,
): RepositoryStructureDiagnostics {
  const selectedSources = files.filter(file => isRepositorySourcePath(file.path) && !isGeneratedOrStructuralException(file.path));
  const withLines = selectedSources.filter((file): file is IngestedFile & { lineCount: number } => file.lineCount !== null);
  const largestSelectedSourceFiles = [...withLines]
    .sort((a, b) => b.lineCount - a.lineCount || a.path.localeCompare(b.path, "en"))
    .slice(0, 5)
    .map(file => ({ path: file.path, lineCount: file.lineCount }));
  const topFiveBytes = inventory.largestSourceFiles.reduce((sum, file) => sum + file.byteSize, 0);

  return {
    basis: "selected_source_content_and_scanned_tree_sizes",
    selectedSourceFiles: selectedSources.length,
    selectedSourceFilesWithLineCount: withLines.length,
    sourceFilesOver400Lines: withLines.filter(file => file.lineCount > 400).length,
    sourceFilesOver800Lines: withLines.filter(file => file.lineCount > 800).length,
    largestSelectedSourceFiles,
    topFiveSourceByteShare: inventory.sourceBytes > 0 ? topFiveBytes / inventory.sourceBytes : null,
  };
}
