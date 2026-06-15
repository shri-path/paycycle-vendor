// Audit locale files: key parity + values that still look like English
// (Latin letters present, but no native-script characters for that language).
const fs = require("fs");
const path = require("path");

const LOC = path.join(__dirname, "..", "src", "locales");

// Unicode script ranges per language code.
const SCRIPTS = {
  hi: /[ऀ-ॿ]/, mr: /[ऀ-ॿ]/,
  ta: /[஀-௿]/, te: /[ఀ-౿]/,
  bn: /[ঀ-৿]/, kn: /[ಀ-೿]/,
  ml: /[ഀ-ൿ]/, gu: /[઀-૿]/,
};

// Tokens that are legitimately Latin in every language (brands / tech / units).
const ALLOW_LATIN = /^(UPI|SMS|WhatsApp|Email|QR|PayCycle|OTP|PIN|ID|IP|km|kg|ml|₹)$/i;

function flatten(o, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

// Strip placeholders, then check if any "real" English word (2+ letters) remains.
function hasEnglishWord(s) {
  const stripped = s.replace(/\{\{[^}]*\}\}/g, " ");
  const words = stripped.match(/[A-Za-z][A-Za-z'’]+/g) || [];
  return words.some((w) => !ALLOW_LATIN.test(w));
}

const data = {};
for (const f of fs.readdirSync(LOC).filter((f) => f.endsWith(".json"))) {
  const lang = f.replace(/\.json$/, "");
  data[lang] = flatten(JSON.parse(fs.readFileSync(path.join(LOC, f), "utf8")));
}

const en = data.en;
const enKeys = Object.keys(en);
console.log(`en leaf keys: ${enKeys.length}\n`);

const langs = Object.keys(data).filter((l) => l !== "en").sort();
const union = new Set();

for (const lang of langs) {
  const keys = new Set(Object.keys(data[lang]));
  const missing = enKeys.filter((k) => !keys.has(k));
  const script = SCRIPTS[lang];
  const suspect = [];
  for (const k of enKeys) {
    if (!keys.has(k)) continue;
    const v = data[lang][k];
    if (typeof v !== "string") continue;
    // Suspect if it contains a real English word but no native script char.
    if (hasEnglishWord(v) && !script.test(v)) { suspect.push(k); union.add(k); }
  }
  console.log(`=== ${lang} ===  missing:${missing.length}  englishLeftover:${suspect.length}`);
}

console.log(`\n=== union of english-leftover keys across all langs: ${union.size} ===`);
if (union.size > 0) {
  const byNs = {};
  for (const k of union) { const ns = k.split(".")[0]; byNs[ns] = (byNs[ns] || 0) + 1; }
  console.log("by namespace:", JSON.stringify(byNs));
  for (const k of [...union].sort()) console.log(`  ${k} = ${JSON.stringify(en[k])}`);
  process.exitCode = 1; // fail CI when any non-en locale still holds English
} else {
  console.log("All non-en locales are fully translated.");
}
