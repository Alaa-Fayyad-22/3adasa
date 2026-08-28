// ---------------------------------------------------------------------------
// scripts/sync-instagram-photos.ts
//
// Pulls your own Instagram photos into the gallery using the OFFICIAL
// Instagram Graph API only — no scraping, no session cookies, no passwords.
// The only secret it ever touches is a Graph API access token that YOU paste
// into `.env.local` yourself (see one-time setup below).
//
// This is a manually / cron triggered script. It is deliberately NOT wired
// into `predev` or `build`, because it makes a network call and mutates
// `public/photos/**`.
//
//   npm run sync-instagram          # download new photos
//   npm run generate-photo-data     # regenerate src/data/generatedPhotos.ts
//
// ---------------------------------------------------------------------------
// ONE-TIME SETUP (done once, by hand, outside this repo — no code needed)
// ---------------------------------------------------------------------------
// 1. Convert your Instagram account to a *professional* account
//    (Settings -> Account type and tools -> Switch to professional account).
//    Creator or Business both work with the Instagram API with Instagram Login.
//
// 2. Create a Meta app at https://developers.facebook.com/apps
//    -> "Create app" -> use case "Other" -> type "Business".
//    Add the "Instagram" product to the app. Under
//    Instagram -> API setup with Instagram login, add your Instagram account
//    as an Instagram tester and accept the invite from your Instagram
//    account (Settings -> Apps and websites -> Tester invites).
//
// 3. Generate a token:
//    - In the app dashboard under Instagram -> API setup with Instagram login,
//      use "Generate token" for your connected account. This gives a
//      SHORT-LIVED user access token (valid ~1 hour) with the
//      `instagram_business_basic` scope.
//    - Exchange it for a LONG-LIVED token (valid ~60 days):
//
//        curl -s -X GET "https://graph.instagram.com/access_token\
//          ?grant_type=ig_exchange_token\
//          &client_secret=<YOUR_APP_SECRET>\
//          &access_token=<SHORT_LIVED_TOKEN>"
//
//      The response `access_token` field is your long-lived token.
//    - Long-lived tokens can be refreshed before they expire (once per day,
//      only if older than 24h) with:
//
//        curl -s -X GET "https://graph.instagram.com/refresh_access_token\
//          ?grant_type=ig_refresh_token&access_token=<LONG_LIVED_TOKEN>"
//
// 4. Paste the long-lived token into `.env.local` at the repo root
//    (this file is gitignored — never commit a real token):
//
//        INSTAGRAM_ACCESS_TOKEN=IGQVJ...your-long-lived-token...
//        # INSTAGRAM_USER_ID=17841400000000000   # optional, defaults to "me"
//        # INSTAGRAM_CATEGORY=street              # optional, defaults to "street"
//
//    Then: npm run sync-instagram && npm run generate-photo-data
//
// NOTE ON `.env.local` LOADING: this repo has no dotenv dependency, so run the
// script with the var in your environment. Either export it for the shell
// session, or use a loader, e.g.:
//
//     node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/sync-instagram-photos.ts
//
// or simply:  INSTAGRAM_ACCESS_TOKEN=... npm run sync-instagram
// ---------------------------------------------------------------------------

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const GRAPH_API_VERSION = "v21.0";
const MEDIA_FIELDS = "id,media_type,media_url,permalink,caption,timestamp";

// Defaults to the official Graph API host. Overridable only so the script can
// be pointed at a mock server in tests — leave it unset in normal use.
const GRAPH_API_BASE = (
  process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com"
).replace(/\/+$/, "");

// Instagram photos have no inherent gallery category, so they are nested under
// one. `generate-photo-data.ts` requires the leaf folder under gallery/ to be a
// known category ("portrait" | "landscape" | "street" | "events"); "instagram"
// is just a container directory in the path.
const CATEGORY = (process.env.INSTAGRAM_CATEGORY || "street").toLowerCase();
const VALID_CATEGORIES = ["portrait", "landscape", "street", "events"];

const OUTPUT_DIR = resolve(
  REPO_ROOT,
  "public/photos/gallery/instagram",
  CATEGORY
);
const STATE_FILE = resolve(REPO_ROOT, ".instagram-sync-state.json");

type SyncState = {
  importedIds: string[];
  lastSync: string | null;
};

type InstagramMedia = {
  id: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  caption?: string;
  timestamp?: string;
};

type MediaPage = {
  data?: InstagramMedia[];
  paging?: { next?: string };
  error?: { message?: string; type?: string; code?: number };
};

function fail(message: string): never {
  console.error(`\n[sync-instagram] ${message}\n`);
  process.exit(1);
}

function readState(): SyncState {
  if (!existsSync(STATE_FILE)) return { importedIds: [], lastSync: null };
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<SyncState>;
    return {
      importedIds: Array.isArray(parsed.importedIds) ? parsed.importedIds : [],
      lastSync: typeof parsed.lastSync === "string" ? parsed.lastSync : null,
    };
  } catch {
    fail(
      `Could not parse ${STATE_FILE}. Delete it to re-import everything, or fix the JSON.`
    );
  }
}

function writeState(state: SyncState): void {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Turn a caption into a short, filesystem-friendly slug matching the repo's
// `NN-title.jpeg` convention. Falls back to the media id when there is no
// usable caption.
function titleSlugFor(media: InstagramMedia): string {
  const firstLine = (media.caption || "").split(/\r?\n/)[0] ?? "";
  const slug = slugify(firstLine).split("-").slice(0, 6).join("-");
  return slug || `ig-${media.id}`;
}

function nextSortPrefix(dir: string): number {
  if (!existsSync(dir)) return 1;
  let max = 0;
  for (const name of readdirSync(dir)) {
    const match = name.match(/^(\d+)-/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

async function fetchJson(url: string): Promise<MediaPage> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    fail(
      `Network error calling the Instagram Graph API: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  let body: MediaPage;
  try {
    body = (await res.json()) as MediaPage;
  } catch {
    fail(`Instagram Graph API returned a non-JSON response (HTTP ${res.status}).`);
  }
  if (body.error) {
    fail(
      `Instagram Graph API error (HTTP ${res.status}): ${
        body.error.message || body.error.type || "unknown error"
      }. If this is an auth error, your token is likely expired — generate a ` +
        `fresh long-lived token (see the setup notes at the top of this file).`
    );
  }
  if (!res.ok) {
    fail(`Instagram Graph API returned HTTP ${res.status}.`);
  }
  return body;
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `download failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buffer);
}

async function main(): Promise<void> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    fail(
      "INSTAGRAM_ACCESS_TOKEN is not set. This script needs a long-lived " +
        "Instagram Graph API access token — see the one-time setup block at " +
        "the top of scripts/sync-instagram-photos.ts. Paste the token into " +
        "`.env.local` and run again, e.g.\n\n" +
        "    INSTAGRAM_ACCESS_TOKEN=... npm run sync-instagram\n"
    );
  }

  if (!VALID_CATEGORIES.includes(CATEGORY)) {
    fail(
      `INSTAGRAM_CATEGORY="${CATEGORY}" is not a valid gallery category. ` +
        `Use one of: ${VALID_CATEGORIES.join(", ")}.`
    );
  }

  const userId = process.env.INSTAGRAM_USER_ID || "me";
  const state = readState();
  const alreadyImported = new Set(state.importedIds);

  console.log(
    `[sync-instagram] Fetching media for "${userId}" ` +
      `(${alreadyImported.size} already imported)...`
  );

  // Walk every page of /media, collecting IMAGE items we have not imported yet.
  const params = new URLSearchParams({
    fields: MEDIA_FIELDS,
    access_token: token,
  });
  let nextUrl:
    | string
    | undefined = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${encodeURIComponent(
    userId
  )}/media?${params.toString()}`;

  const newImages: InstagramMedia[] = [];
  let pageCount = 0;
  while (nextUrl) {
    const page = await fetchJson(nextUrl);
    pageCount += 1;
    for (const media of page.data ?? []) {
      if (media.media_type !== "IMAGE") continue;
      if (alreadyImported.has(media.id)) continue;
      if (!media.media_url) continue;
      newImages.push(media);
    }
    nextUrl = page.paging?.next;
  }

  console.log(
    `[sync-instagram] Scanned ${pageCount} page(s); ${newImages.length} new image(s) to import.`
  );

  if (newImages.length === 0) {
    state.lastSync = new Date().toISOString();
    writeState(state);
    console.log("[sync-instagram] Nothing new. Done.");
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Import oldest first so numeric prefixes track chronological order.
  newImages.sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));

  let prefix = nextSortPrefix(OUTPUT_DIR);
  const usedNames = new Set(readdirSync(OUTPUT_DIR));
  let imported = 0;

  for (const media of newImages) {
    let slug = titleSlugFor(media);
    let filename = `${pad(prefix)}-${slug}.jpeg`;
    if (usedNames.has(filename)) {
      slug = `${slug}-${media.id.slice(-6)}`;
      filename = `${pad(prefix)}-${slug}.jpeg`;
    }
    const destPath = resolve(OUTPUT_DIR, filename);

    try {
      await downloadImage(media.media_url as string, destPath);
    } catch (err) {
      console.warn(
        `[sync-instagram] Skipped ${media.id}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      continue;
    }

    usedNames.add(filename);
    state.importedIds.push(media.id);
    alreadyImported.add(media.id);
    prefix += 1;
    imported += 1;
    console.log(
      `[sync-instagram]  + ${filename}  (${media.permalink ?? media.id})`
    );

    // Persist after every download so an interrupted run is resumable.
    writeState(state);
  }

  state.lastSync = new Date().toISOString();
  writeState(state);

  console.log(
    `\n[sync-instagram] Imported ${imported} photo(s) into ` +
      `public/photos/gallery/instagram/${CATEGORY}/.\n` +
      `[sync-instagram] Next: run \`npm run generate-photo-data\` to update ` +
      `src/data/generatedPhotos.ts.`
  );
}

await main();
