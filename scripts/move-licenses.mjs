import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, '..', 'dist', 'xls-to-ynab-csv');

await fs.promises.rename(
  path.join(outDir, '3rdpartylicenses.txt'),
  path.join(outDir, 'browser', '3rdpartylicenses.txt'),
);
