import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const DIST_DIR = join(import.meta.dirname, "..", "apps", "web", "dist", "assets");
const INITIAL_BUDGET_KB = 50;
const TOTAL_BUDGET_KB = 150;

function getGzipSize(filePath: string): number {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

const files = readdirSync(DIST_DIR);
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
  console.error(`\nBUDGET EXCEEDED: Initial JS bundle ${initialKb.toFixed(2)} KB > ${INITIAL_BUDGET_KB} KB`);
  process.exit(1);
}

if (totalKb > TOTAL_BUDGET_KB) {
  // eslint-disable-next-line no-console
  console.error(`\nBUDGET EXCEEDED: Total assets ${totalKb.toFixed(2)} KB > ${TOTAL_BUDGET_KB} KB`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("\nBundle size check passed.");
