// Vice Nights — GTA 6-style cover art maker (make.fun gta6-cover-art-01).
// SPDX-License-Identifier: MIT
// Entry program: copies the static app and the screenshots into the output
// directory and writes the dossier buildDossier produces from them, so the
// grader sees exactly the files this repository holds. Runs twice and must
// write byte-identical output both times: every step below is deterministic
// (no timestamps, no random ids, files copied in sorted order).

import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = dirname(fileURLToPath(new URL('./main.ts', import.meta.url)));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyEntryTree(): void {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(join(REPO_ROOT, 'app'), join(OUTPUT_DIR, 'app'), { recursive: true });
  cpSync(join(REPO_ROOT, 'screenshots'), join(OUTPUT_DIR, 'screenshots'), { recursive: true });
}

function writeDossier(): void {
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

// The hand-in runs in two passes so a half-written output can never be
// mistaken for a finished one: first the tree is copied, then the dossier
// is built from the copied tree itself (never from the repository), so the
// dossier the grader re-builds from /output matches byte for byte.
copyEntryTree();
writeDossier();
console.log(`vice-nights: wrote ${OUTPUT_DIR}/dossier.json`);
