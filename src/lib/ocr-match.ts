import type {
  DocReadMatchStatus,
  DocumentReadResult,
  DocReaderProvider,
  ParentInfo,
} from "@/types";

/**
 * OCR-ийн гаргасан текст болон эцэг эхийн оруулсан мэдээллийг тааруулах.
 *
 * Энэ модуль нь зөвхөн ЦЭВЭР тааруулалтын логик агуулна — сервер-only биш.
 * Ингэснээр demo store (client bundle-д ордог) болон prod repo (server-only)
 * хоёулаа ижил тааруулалтын логик ашиглана. OCR үнэхээр унших ажиллагаа
 * (`readDocumentText`) нь тусад нь server-only `document-reader.ts`-д байна.
 *
 * Монгол төрсний гэрчилгээнд эцэг эхийн нэр "Эцэг: ...", "Эх: ..." эсвэл
 * "Ээж: ..." гэсэн мөрөнд бичигдсэн байдаг. OCR текстээс эдгээрийг олж,
 * оруулсан нэртэй тааруулна.
 */

export interface MatchScore {
  matched: boolean;
  score: number; // 0-1
}

/** Text-ийг тааруулалтад зориулж normalize: lowercase, үсэг/цифрээс бусад устгах */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Жижигрүүлсэн нормчлогдсон текст */
function normText(s: string): string {
  return normalizeName(s);
}

/**
 * Хоёр нэрийн token-ийн олонлогийн давхцал (Dice coefficient 0-1).
 * "Бат-Эрдэнэ Цэнгэл" vs "Цэнгэл Бат-Эрдэнэ" зэрэг дараалал эргэлзээг тэсвэрлэнэ.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = normalizeName(a).split(" ").filter(Boolean);
  const tb = normalizeName(b).split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  let common = 0;
  for (const tok of tb) {
    if (setA.has(tok)) common++;
  }
  // Dice coefficient = 2*|A∩B| / (|A|+|B|)
  return (2 * common) / (ta.length + tb.length);
}

/** Тааруулалтын босго — энэ хэмжээний давхцалд "таарсан" гэж үзнэ */
const MATCH_THRESHOLD = 0.6;

/** Төрсний гэрчилгээний OCR текстээс тухайн эцэг/эхийн нэрийн мөрийг олох */
function findParentLine(
  text: string,
  owner: "father" | "mother"
): string | null {
  // Label-ууд: Эцэг / Эх / Ээж, араас нь ":" эсвэл хоосон зай, дараа нь нэр
  const labels = owner === "father" ? ["эцэг"] : ["эх", "ээж"];
  for (const label of labels) {
    // Мөр бүрийг шалгана: "эцэг: батбаяр ..."
    const lines = text.split(/\n/);
    for (const line of lines) {
      const m = line.match(new RegExp(`^\\s*${label}\\s*[:\\.]?\\s+(.+)$`, "i"));
      if (m && m[1]) return m[1]!.trim();
    }
    // Мөр эхлэлгүйгээр "…эцэг: нэр" байж болох тул бүх текстэд хайна
    const m = text.match(new RegExp(`${label}\\s*[:\\.]\\s*([^\\n]+)`, "i"));
    if (m && m[1]) return m[1]!.trim();
  }
  return null;
}

/** Бүх текстэд нэр байгаа эсэхийг ойролцоогоор шалгах (мөр танигдахгүй үед) */
function nameAppearsInText(text: string, name: string): MatchScore {
  const t = normText(text);
  const tokens = normalizeName(name).split(" ").filter(Boolean);
  if (tokens.length === 0) return { matched: false, score: 0 };
  const n = tokens.length;
  let hit = 0;
  for (const tok of tokens) {
    // Токен бүтэн тохирсон эсвэл нэрийн эхний үе давхцаж байвал
    if (t.includes(tok)) hit++;
    else if (tok.length > 3 && t.includes(tok.slice(0, Math.max(2, tok.length - 1)))) hit++;
  }
  const score = hit / n;
  return { matched: score >= MATCH_THRESHOLD, score: Math.round(score * 100) / 100 };
}

/**
 * Цэвэр тааруулалт — server эсвэл demo хоёулаа дуудаж болно.
 * @param extractedText OCR-ийн гаргасан бүрэн текст (null = уншиж чадаагүй)
 */
export function matchParentsToBirthCertificate(
  extractedText: string | null,
  father: ParentInfo,
  mother: ParentInfo
): {
  matchStatus: DocReadMatchStatus;
  father: MatchScore;
  mother: MatchScore;
  issues: string[];
} {
  if (!extractedText || extractedText.trim().length === 0) {
    return {
      matchStatus: "pending",
      father: { matched: false, score: 0 },
      mother: { matched: false, score: 0 },
      issues: ["OCR текст хоосон — admin гараар төрсний гэрчилгээг шалгана уу."],
    };
  }

  const issues: string[] = [];

  // Эцэг — "Эцэг:" мөрөөс нэр гаргаж тааруулах
  const fatherLine = findParentLine(extractedText, "father");
  let fatherMatch: MatchScore;
  if (fatherLine) {
    const score = nameSimilarity(father.name, fatherLine);
    fatherMatch = { matched: score >= MATCH_THRESHOLD, score: Math.round(score * 100) / 100 };
  } else {
    fatherMatch = nameAppearsInText(extractedText, father.name);
  }

  // Эх — "Эх:"/"Ээж:" мөрөөс нэр гаргаж тааруулах
  const motherLine = findParentLine(extractedText, "mother");
  let motherMatch: MatchScore;
  if (motherLine) {
    const score = nameSimilarity(mother.name, motherLine);
    motherMatch = { matched: score >= MATCH_THRESHOLD, score: Math.round(score * 100) / 100 };
  } else {
    motherMatch = nameAppearsInText(extractedText, mother.name);
  }

  if (!fatherMatch.matched) {
    issues.push(`Эцэгийн нэр таарахгүй байна (оруулсан: "${father.name}").`);
  }
  if (!motherMatch.matched) {
    issues.push(`Эхийн нэр таарахгүй байна (оруулсан: "${mother.name}").`);
  }

  const bothOk = fatherMatch.matched && motherMatch.matched;
  const matchStatus: DocReadMatchStatus = bothOk ? "matched" : "mismatch";

  return { matchStatus, father: fatherMatch, mother: motherMatch, issues };
}

/**
 * OCR үр дүнг бүрэн `DocumentReadResult` болгон нэгтгэнэ — demo болон prod нийтлэг.
 * @param provider ашигласан OCR provider
 * @param extractedText OCR-ийн гаргасан текст (null байж болно)
 */
export function buildDocumentReadResult(
  provider: DocReaderProvider,
  extractedText: string | null,
  father: ParentInfo,
  mother: ParentInfo,
  birthCertificateKey: string
): DocumentReadResult {
  const m = matchParentsToBirthCertificate(extractedText, father, mother);
  return {
    provider,
    extractedText,
    matchStatus: m.matchStatus,
    father: m.father,
    mother: m.mother,
    issues: m.issues,
    birthCertificateKey,
  };
}

/** OCR ашиглах боломжгүй үеийн default (provider "none" / fail-open) */
export function buildPendingDocumentRead(
  birthCertificateKey: string,
  issue = "OCR ашиглах боломжгүй — admin гараар шалгана уу."
): DocumentReadResult {
  return {
    provider: "none",
    extractedText: null,
    matchStatus: "pending",
    father: { matched: false, score: 0 },
    mother: { matched: false, score: 0 },
    issues: [issue],
    birthCertificateKey,
  };
}
