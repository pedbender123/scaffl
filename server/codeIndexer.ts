import { CodeIndex } from './labAgent.types.js';

export function buildCodeIndex(htmlContent: string): CodeIndex {
  const lines = htmlContent.split('\n');
  const index: CodeIndex = {};

  const fnDeclRegex = /(?:^|\s)function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\(.*?\)\s*=>)/;

  let currentFn: string | null = null;
  let startLine = 0;
  let braceDepth = 0;
  let inFunction = false;
  let fnStartBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const match = line.match(fnDeclRegex);
    if (match && !inFunction) {
      const fnName = match[1] || match[2];
      if (fnName) {
        currentFn = fnName;
        startLine = i;
        fnStartBraceDepth = braceDepth;
        inFunction = true;
      }
    }

    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    if (inFunction && currentFn && braceDepth <= fnStartBraceDepth && i > startLine) {
      index[currentFn] = {
        startLine,
        endLine: i,
        rawCode: lines.slice(startLine, i + 1).join('\n'),
      };
      currentFn = null;
      inFunction = false;
    }
  }

  return index;
}

export function extractFunctionsFromIndex(
  _htmlContent: string,
  codeIndex: CodeIndex,
  targetFunctions: string[]
): { [fnName: string]: string } {
  const result: { [fnName: string]: string } = {};
  for (const fnName of targetFunctions) {
    if (codeIndex[fnName]) {
      result[fnName] = codeIndex[fnName].rawCode;
    }
  }
  return result;
}

export function patchHtmlWithFunctions(
  htmlContent: string,
  codeIndex: CodeIndex,
  newFunctions: { [fnName: string]: string }
): string {
  const lines = htmlContent.split('\n');

  const sortedFns = Object.entries(newFunctions).sort(([a], [b]) => {
    const lineA = codeIndex[a]?.startLine ?? 0;
    const lineB = codeIndex[b]?.startLine ?? 0;
    return lineB - lineA;
  });

  for (const [fnName, newCode] of sortedFns) {
    const entry = codeIndex[fnName];
    if (!entry) continue;

    const existingCode = lines.slice(entry.startLine, entry.endLine + 1).join('\n');
    if (existingCode.trim() !== entry.rawCode.trim()) {
      // Fallback: regex replace
      const fnRegex = new RegExp(
        `(function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\})`,
        'g'
      );
      const joined = lines.join('\n');
      const replaced = joined.replace(fnRegex, newCode);
      return replaced;
    } else {
      lines.splice(entry.startLine, entry.endLine - entry.startLine + 1, ...newCode.split('\n'));
    }
  }

  return lines.join('\n');
}
