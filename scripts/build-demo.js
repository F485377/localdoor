// ブラウザだけで動くデモ版を、1枚の HTML（dist-demo/haisai-demo.html）にまとめる。
// 共有用のプレビューURLを作るときに使う。`npm run build:demo`
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'dist-demo';
execSync(`npx vite build --outDir ${outDir} --emptyOutDir`, {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEMO: '1' },
});

const read = (rel) => fs.readFileSync(path.join(outDir, rel), 'utf8');
const html = read('index.html');
const css = [...html.matchAll(/href="\/(assets\/[^"]+\.css)"/g)].map((m) => read(m[1])).join('\n');
const js = [...html.matchAll(/src="\/(assets\/[^"]+\.js)"/g)].map((m) => read(m[1])).join('\n');

const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)?.[0] ?? '';
const page = `<title>Haisai</title>
<meta name="description" content="Haisai – find local restaurants anywhere in the world, in your language.">
${fonts}
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js.replaceAll('</script', '<\\/script')}
</script>
`;
fs.writeFileSync(path.join(outDir, 'haisai-demo.html'), page);
console.log(`Wrote ${outDir}/haisai-demo.html (${(page.length / 1024).toFixed(0)} KB)`);
