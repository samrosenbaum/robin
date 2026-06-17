// Lightweight, regex-based syntax highlighter for TS/JSON/YAML/Markdown.
// Returns a flat array of {text, color} tokens per line so the viewer can
// render them as <span>s. Not a real parser — just enough for the demo.

export type Token = { text: string; color?: string };

export type Lang = "ts" | "json" | "yml" | "md" | "plain";

export function detectLang(filename: string): Lang {
  if (filename.endsWith(".ts") || filename.endsWith(".tsx")) return "ts";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".yml") || filename.endsWith(".yaml")) return "yml";
  if (filename.endsWith(".md")) return "md";
  return "plain";
}

const COLOR = {
  comment: "var(--text3)",
  string: "#fda4af", // soft rose
  keyword: "#94a3b8", // slate-blue
  key: "#7dd3fc", // sky
  value: "#86efac", // soft green
  number: "#fbbf24",
  punct: "var(--text2)",
  heading: "var(--v0)",
  text: "var(--text)",
};

const TS_KEYWORDS = new Set([
  "import",
  "export",
  "const",
  "let",
  "var",
  "async",
  "await",
  "return",
  "function",
  "type",
  "interface",
  "class",
  "new",
  "from",
  "default",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "true",
  "false",
  "null",
  "undefined",
  "throw",
  "try",
  "catch",
  "finally",
  "extends",
  "implements",
  "as",
  "in",
  "of",
  "typeof",
  "void",
]);

// Combined regex: capture comments, strings, numbers, identifiers separately.
const TS_REGEX =
  /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

function highlightTs(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TS_REGEX.lastIndex = 0;
  while ((m = TS_REGEX.exec(line))) {
    if (m.index > last) {
      tokens.push({ text: line.slice(last, m.index), color: COLOR.text });
    }
    if (m[1] || m[2]) {
      tokens.push({ text: m[0], color: COLOR.comment });
    } else if (m[3]) {
      tokens.push({ text: m[0], color: COLOR.string });
    } else if (m[4]) {
      tokens.push({ text: m[0], color: COLOR.number });
    } else if (m[5]) {
      const isKw = TS_KEYWORDS.has(m[5]);
      tokens.push({ text: m[0], color: isKw ? COLOR.keyword : COLOR.text });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    tokens.push({ text: line.slice(last), color: COLOR.text });
  }
  return tokens;
}

function highlightJson(line: string): Token[] {
  // Match: "key":, "string", numbers, booleans/null, punctuation
  const tokens: Token[] = [];
  // Key-then-colon
  const keyMatch = line.match(/^(\s*)("[^"]*")(\s*:)/);
  let rest = line;
  let prefix = "";
  if (keyMatch) {
    tokens.push({ text: keyMatch[1], color: COLOR.text });
    tokens.push({ text: keyMatch[2], color: COLOR.key });
    tokens.push({ text: keyMatch[3], color: COLOR.punct });
    rest = line.slice(keyMatch[0].length);
  }

  const VAL_REGEX = /("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = VAL_REGEX.exec(rest))) {
    if (m.index > last) {
      tokens.push({ text: rest.slice(last, m.index), color: COLOR.punct });
    }
    if (m[1]) tokens.push({ text: m[0], color: COLOR.value });
    else if (m[2]) tokens.push({ text: m[0], color: COLOR.number });
    else if (m[3]) tokens.push({ text: m[0], color: COLOR.keyword });
    last = m.index + m[0].length;
  }
  if (last < rest.length) {
    tokens.push({ text: rest.slice(last), color: COLOR.punct });
  }
  return prefix ? [{ text: prefix }, ...tokens] : tokens;
}

function highlightYml(line: string): Token[] {
  // Comments first
  const commentIdx = line.indexOf("#");
  let code = line;
  let comment = "";
  if (commentIdx >= 0) {
    code = line.slice(0, commentIdx);
    comment = line.slice(commentIdx);
  }

  const tokens: Token[] = [];
  // Key: value patterns. Indentation + key + colon + value
  const m = code.match(/^(\s*-?\s*)([A-Za-z_][\w.-]*)(:)(.*)$/);
  if (m) {
    tokens.push({ text: m[1], color: COLOR.text });
    tokens.push({ text: m[2], color: COLOR.key });
    tokens.push({ text: m[3], color: COLOR.punct });
    const value = m[4];
    if (value.trim()) {
      tokens.push({ text: value, color: COLOR.value });
    }
  } else if (code.trim().startsWith("- ")) {
    // list item without key
    const idx = code.indexOf("- ");
    tokens.push({ text: code.slice(0, idx + 2), color: COLOR.punct });
    tokens.push({ text: code.slice(idx + 2), color: COLOR.value });
  } else {
    tokens.push({ text: code, color: COLOR.text });
  }
  if (comment) tokens.push({ text: comment, color: COLOR.comment });
  return tokens;
}

function highlightMd(line: string): Token[] {
  if (/^#{1,6}\s/.test(line)) {
    return [{ text: line, color: COLOR.heading }];
  }
  // Inline code spans
  const tokens: Token[] = [];
  const RE = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(line))) {
    if (m.index > last) {
      tokens.push({ text: line.slice(last, m.index), color: COLOR.text });
    }
    if (m[1]) tokens.push({ text: m[0], color: COLOR.string });
    else if (m[2]) tokens.push({ text: m[0], color: COLOR.value });
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    tokens.push({ text: line.slice(last), color: COLOR.text });
  }
  return tokens.length ? tokens : [{ text: line, color: COLOR.text }];
}

export function highlightLine(line: string, lang: Lang): Token[] {
  if (line.length === 0) return [{ text: "" }];
  switch (lang) {
    case "ts":
      return highlightTs(line);
    case "json":
      return highlightJson(line);
    case "yml":
      return highlightYml(line);
    case "md":
      return highlightMd(line);
    default:
      return [{ text: line, color: COLOR.text }];
  }
}

export function tabAccent(filename: string): string {
  if (filename.endsWith(".tsx") || filename.endsWith(".ts"))
    return "var(--workflow)";
  if (filename.endsWith(".json")) return "var(--gateway)";
  if (filename.endsWith(".md")) return "var(--v0)";
  if (filename.endsWith(".yml") || filename.endsWith(".yaml"))
    return "var(--sandbox)";
  return "var(--border2)";
}
