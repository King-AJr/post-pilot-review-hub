export type DiffToken = { text: string; type: "same" | "removed" | "added" };

/**
 * Simple word-level LCS diff. Splits on whitespace boundaries (keeping the
 * whitespace itself as tokens) so spacing is preserved exactly.
 * Returns the old text's tokens (same/removed) and the new text's tokens (same/added).
 */
export function diffWords(oldText: string, newText: string): { oldTokens: DiffToken[]; newTokens: DiffToken[] } {
  const a = (oldText || "").split(/(\s+)/);
  const b = (newText || "").split(/(\s+)/);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i] ?? [];
    const nextRow = dp[i + 1] ?? [];
    for (let j = m - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? (nextRow[j + 1] ?? 0) + 1 : Math.max(nextRow[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const oldTokens: DiffToken[] = [];
  const newTokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const ai = a[i] ?? "";
    const bj = b[j] ?? "";
    const dpRow = dp[i] ?? [];
    const dpNextRow = dp[i + 1] ?? [];
    if (ai === bj) {
      oldTokens.push({ text: ai, type: "same" });
      newTokens.push({ text: bj, type: "same" });
      i++;
      j++;
    } else if ((dpNextRow[j] ?? 0) >= (dpRow[j + 1] ?? 0)) {
      oldTokens.push({ text: ai, type: "removed" });
      i++;
    } else {
      newTokens.push({ text: bj, type: "added" });
      j++;
    }
  }
  while (i < n) {
    oldTokens.push({ text: a[i] ?? "", type: "removed" });
    i++;
  }
  while (j < m) {
    newTokens.push({ text: b[j] ?? "", type: "added" });
    j++;
  }
  return { oldTokens, newTokens };
}
