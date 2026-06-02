const PROMPT_INJECTION_PATTERNS = [
  {
    name: "ignore previous instructions",
    pattern: /ignore (all )?(previous|prior|above) instructions/i
  },
  {
    name: "prompt disclosure request",
    pattern: /reveal (the )?(system|developer) prompt/i
  },
  {
    name: "secret exfiltration request",
    pattern: /print (all )?(environment variables|secrets|tokens)/i
  },
  {
    name: "policy bypass request",
    pattern: /bypass (the )?(policy|safety|rules)/i
  },
  {
    name: "role override request",
    pattern: /act as (an? )?(admin|maintainer|system)/i
  }
];

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;

export interface SanitizedText {
  text: string;
  changed: boolean;
  promptInjectionSignals: string[];
}

export function detectPromptInjectionSignals(input: string): string[] {
  const signals = new Set<string>();
  for (const { name, pattern } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      signals.add(name);
    }
  }
  return [...signals];
}

export function sanitizeText(input: string, maxChars: number): SanitizedText {
  const signals = detectPromptInjectionSignals(input);
  let output = input
    .replace(HTML_COMMENTS, " ")
    .replace(ZERO_WIDTH, "")
    .replace(CONTROL_CHARS, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  for (const { pattern } of PROMPT_INJECTION_PATTERNS) {
    output = output.replace(pattern, "[removed unsafe instruction]");
  }

  if (output.length > maxChars) {
    output = `${output.slice(0, maxChars)}\n[truncated by TriagePilot]`;
  }

  return {
    text: output,
    changed: output !== input.trim(),
    promptInjectionSignals: signals
  };
}

export function shortSnippet(input: string, maxLength = 160): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}
