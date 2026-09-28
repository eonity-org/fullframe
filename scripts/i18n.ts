/**
 * Translation checker — keeps the dictionaries in step with the code.
 *
 *   npm run i18n            report missing, unused, empty and mismatched entries
 *   npm run i18n -- --write add missing keys (empty, to fill in) and drop unused ones
 *
 * Keys are found by scanning src/ for literal calls: t("…"), t.rich("…"),
 * t.n(count, "…", "…"), t.x("context", "…"), msg("…") and msgv("…").
 * The test suite runs the same check and fails on any finding.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const DICTIONARY_DIR = path.join(SRC, "i18n");
export const TRANSLATED_LOCALES = ["es"] as const;

const STRING = String.raw`"((?:[^"\\]|\\.)*)"`;
const PATTERNS: Array<{ re: RegExp; keys: (m: RegExpExecArray) => string[] }> =
  [
    {
      re: new RegExp(String.raw`\bt(?:\.rich)?\(\s*${STRING}`, "g"),
      keys: (m) => [m[1]],
    },
    {
      re: new RegExp(String.raw`\bmsgv?\(\s*${STRING}`, "g"),
      keys: (m) => [m[1]],
    },
    {
      re: new RegExp(
        String.raw`\bt\.n\(\s*[^,]+,\s*${STRING}\s*,\s*${STRING}`,
        "g",
      ),
      keys: (m) => [m[1], m[2]],
    },
    {
      re: new RegExp(String.raw`\bt\.x\(\s*${STRING}\s*,\s*${STRING}`, "g"),
      keys: (m) => [`${m[1]}|${m[2]}`],
    },
  ];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

/** Every translation key used in src/, with the files that use it. */
export function extractKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    // Comments may show example calls; only code counts. Strings are matched
    // first and kept, so a comment marker inside one (`accept="image/*"`, a
    // URL's `//`) doesn't swallow the code after it.
    const source = fs
      .readFileSync(file, "utf8")
      .replace(
        /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        (match, string: string | undefined) => string ?? "",
      );
    for (const { re, keys } of PATTERNS) {
      re.lastIndex = 0;
      for (let m = re.exec(source); m; m = re.exec(source))
        for (const raw of keys(m)) {
          const key = JSON.parse(`"${raw}"`) as string;
          const files = found.get(key) ?? [];
          files.push(path.relative(ROOT, file));
          found.set(key, files);
        }
    }
  }
  return found;
}

export function dictionaryPath(locale: string): string {
  return path.join(DICTIONARY_DIR, `${locale}.json`);
}

export function readDictionary(locale: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(dictionaryPath(locale), "utf8"));
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

export type Report = {
  missing: string[];
  unused: string[];
  empty: string[];
  /** Translations whose {placeholders} differ from the English key's. */
  mismatched: string[];
};

export function check(locale: string, keys = extractKeys()): Report {
  const dictionary = readDictionary(locale);
  const entries = Object.entries(dictionary);
  return {
    missing: [...keys.keys()].filter((k) => !Object.hasOwn(dictionary, k)),
    unused: entries.filter(([k]) => !keys.has(k)).map(([k]) => k),
    empty: entries.filter(([, v]) => !v.trim()).map(([k]) => k),
    mismatched: entries
      .filter(
        ([k, v]) =>
          v.trim() &&
          placeholders(k.replace(/^[^|]*\|/, "")) !== placeholders(v),
      )
      .map(([k]) => k),
  };
}

function main() {
  const write = process.argv.includes("--write");
  const keys = extractKeys();
  let failed = false;
  for (const locale of TRANSLATED_LOCALES) {
    const report = check(locale, keys);
    if (write) {
      const dictionary = readDictionary(locale);
      for (const key of report.unused) delete dictionary[key];
      for (const key of report.missing) dictionary[key] = "";
      fs.writeFileSync(
        dictionaryPath(locale),
        JSON.stringify(dictionary, null, 2) + "\n",
      );
      console.log(
        `${locale}: added ${report.missing.length} empty, removed ${report.unused.length} unused.`,
      );
      report.missing = [];
      report.unused = [];
      report.empty = check(locale, keys).empty;
    }
    for (const [label, list] of Object.entries(report) as [
      string,
      string[],
    ][]) {
      if (!list.length) continue;
      failed = true;
      console.log(`\n${locale} — ${label} (${list.length}):`);
      for (const key of list)
        console.log(
          `  ${JSON.stringify(key)}${label === "missing" ? `  ← ${keys.get(key)?.[0]}` : ""}`,
        );
    }
  }
  console.log(`\n${keys.size} keys in use.`);
  if (failed) process.exitCode = 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  main();
