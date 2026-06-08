import fs from 'node:fs';
import path from 'node:path';

const screenshotRoot = path.resolve(process.cwd(), 'test-artifacts', 'screenshots');

export function screenshotPath(...segments: string[]) {
  const filePath = path.join(screenshotRoot, ...segments);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}
