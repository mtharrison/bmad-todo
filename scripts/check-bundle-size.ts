import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "..", "apps", "web", "dist", "assets");
const INITIAL_BUDGET_KB = 50;
const TOTAL_BUDGET_KB = 150;

if (!existsSync(DIST_DIR)) {
  // eslint-disable-next-line no-console
  console.error(`dist/assets not found at ${DIST_DIR} — run pnpm build first`);
  process.exit(1);
}

function getGzipSize(filePath: string): number {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

const files = readdirSync(DIST_DIR);

if (files.length === 0) {
  // eslint-disable-next-line no-console
  console.error("No assets found in dist/assets — build produced no output");
  process.exit(1);
}

let totalGzipBytes = 0;
let initialJsGzipBytes = 0;

for (const file of files) {
  const filePath = join(DIST_DIR, file);
  const stat = statSync(filePath);
  if (!stat.isFile()) continue;

  const gzipSize = getGzipSize(filePath);
  totalGzipBytes += gzipSize;

  if (file.endsWith(".js")) {
    initialJsGzipBytes += gzipSize;
  }

  const sizeKb = (gzipSize / 1024).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`  ${file}: ${sizeKb} KB (gzipped)`);
}

const initialKb = initialJsGzipBytes / 1024;
const totalKb = totalGzipBytes / 1024;

// eslint-disable-next-line no-console
console.log(`\nInitial JS (gzipped): ${initialKb.toFixed(2)} KB / ${INITIAL_BUDGET_KB} KB budget`);
// eslint-disable-next-line no-console
console.log(`Total assets (gzipped): ${totalKb.toFixed(2)} KB / ${TOTAL_BUDGET_KB} KB budget`);

if (initialKb > INITIAL_BUDGET_KB) {
  // eslint-disable-next-line no-console
  console.error(
    `\nBUDGET EXCEEDED: Initial JS bundle ${initialKb.toFixed(2)} KB > ${INITIAL_BUDGET_KB} KB`,
  );
  process.exit(1);
}

if (totalKb > TOTAL_BUDGET_KB) {
  // eslint-disable-next-line no-console
  console.error(`\nBUDGET EXCEEDED: Total assets ${totalKb.toFixed(2)} KB > ${TOTAL_BUDGET_KB} KB`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("\nBundle size check passed.");
