/**
 * Deterministic secret-pattern masking (PRIVACY_SECURITY.md section 4).
 * Pattern matching only -- no LLM call, no guarantee every secret is caught.
 * This runs on every file's text content before it is stored in
 * IngestedFile.redactedContent or used to build an Evidence summary.
 */

interface SecretPattern {
  name: string;
  pattern: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: "openai_key", pattern: /sk-[A-Za-z0-9]{20,}/g },
  { name: "generic_aws_key", pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "github_token", pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "private_key_block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { name: "generic_bearer", pattern: /Bearer [A-Za-z0-9._-]{20,}/g },
];

export function redactSecrets(content: string): { redacted: string; masked: boolean } {
  let masked = false;
  let redacted = content;
  for (const { pattern } of SECRET_PATTERNS) {
    if (pattern.test(redacted)) {
      masked = true;
    }
    // reset lastIndex for global regexes reused across calls
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, "***masked***");
  }
  return { redacted, masked };
}
