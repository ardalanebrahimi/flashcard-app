// add_articles.js
// Usage: node add_articles.js ./words_B1.json ./words_B1_with_articles.json
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const MODEL = "gpt-4o-mini"; // fast & inexpensive is fine for this task

const client = new OpenAI({
  apiKey: "sk-...-4vi6a880tiMIA",
});

function looksLikeGermanNoun(w) {
  // Heuristics for nouns in German: capitalized common nouns; allow slashes (e.g., "Abteilungsleiter/in")
  // Exclude all-caps abbreviations (e.g., "EU"), and words that start lowercase (likely verbs/adjectives)
  if (!w || typeof w !== "string") return false;
  const first = w[0];
  const isCapitalized =
    first === first.toUpperCase() && first !== first.toLowerCase();
  const isAllCaps = w.toUpperCase() === w && w.length <= 4; // crude filter for acronyms like "EU", "DVD"
  return isCapitalized && !isAllCaps;
}

async function getArticleFor(noun) {
  // Use the standard Chat Completions API with structured outputs
  // https://platform.openai.com/docs/api-reference/chat/create
  // https://platform.openai.com/docs/guides/structured-outputs
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise German grammar helper. For the given German NOUN, return ONLY its nominative singular definite article.",
      },
      {
        role: "user",
        content: `Noun: ${noun}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "german_article",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["article"],
          properties: {
            article: {
              type: "string",
              description: "Nominative singular definite article of the noun",
              enum: ["der", "die", "das"],
            },
          },
        },
      },
    },
  });

  // In the Chat Completions API, the parsed JSON is available via choices[0].message.content
  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);
  return parsed.article;
}

async function backoff(attempt) {
  const ms = Math.min(3000, 250 * 2 ** attempt) + Math.random() * 200;
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error("Usage: node add_articles.js <input.json> <output.json>");
    process.exit(1);
  }

  const raw = await fs.readFile(path.resolve(inPath), "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(
      "Input JSON must be an array of { word, translation, ... }"
    );
  }

  // Batch & retry to be nice to the API
  const updated = [];
  const nouns = data.filter((e) => looksLikeGermanNoun(e.word));
  const notNouns = data.filter((e) => !looksLikeGermanNoun(e.word));

  const concurrency = 5;
  let i = 0;

  async function worker() {
    while (i < nouns.length) {
      const idx = i++;
      const entry = nouns[idx];
      if (entry.article) {
        updated[idx] = entry; // already has article
        continue;
      }

      let attempt = 0;
      // up to 4 attempts with exponential backoff
      for (;;) {
        try {
          const article = await getArticleFor(entry.word);
          updated[idx] = { ...entry, article };
          break;
        } catch (err) {
          if (attempt >= 3) {
            console.warn(`Failed for ${entry.word}: ${err?.message || err}`);
            updated[idx] = { ...entry, article: null };
            break;
          }
          attempt++;
          await backoff(attempt);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  // Reassemble in original order: keep non-nouns unchanged, nouns with the new article
  const result = data.map((e) =>
    looksLikeGermanNoun(e.word)
      ? updated[nouns.findIndex((n) => n.word === e.word)]
      : e
  );

  await fs.writeFile(
    path.resolve(outPath),
    JSON.stringify(result, null, 2),
    "utf8"
  );
  console.log(
    `Wrote ${result.length} entries with articles added for nouns to ${outPath}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
