// 从已确认的 storyboard.md 生成 shots.js，时间只保留这一个来源。用法：node 嘉宾/MV/gen-shots.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const seconds = text => {
  const [m, s] = text.split(':');
  return Number(m) * 60 + Number(s);
};

export function parseStoryboard(text) {
  const parts = text.split(/^## Frame (\d+) — (.+)$/m).slice(1);
  const shots = [];
  for (let i = 0; i < parts.length; i += 3) {
    const fields = Object.fromEntries([...parts[i + 2].matchAll(/^- (\w+): (.*)$/gm)].map(m => [m[1], m[2]]));
    const [start, end] = fields.time.split(' → ').map(seconds);
    const [id, ...name] = parts[i + 1].split(' ');
    shots.push({
      n: Number(parts[i]), id, name: name.join(' '), start, end, poster: Number(fields.poster), act: fields.act,
      facing: fields.clawd.match(/\b(front|back|left|right)\b/)?.[1] ?? null,
      absent: fields.clawd.includes('未入画'), action: fields.action,
    });
  }
  return shots;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const shots = parseStoryboard(readFileSync(new URL('../storyboard.md', import.meta.url), 'utf8'));
  const body = shots.map(s => `  ${JSON.stringify(s)},`).join('\n');
  writeFileSync(new URL('./shots.js', import.meta.url), `// 由 gen-shots.mjs 生成，修改 storyboard.md 后重新运行。\nexport const SHOTS = [\n${body}\n];\nexport const DURATION = ${shots.at(-1).end};\n`);
  console.log(`写入 ${shots.length} 镜`);
}
