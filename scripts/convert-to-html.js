/**
 * Markdown → HTML 変換スクリプト（GitHub Pages 公開用）
 *
 * 使い方:
 *   node scripts/convert-to-html.js [対象ファイルまたはディレクトリ]
 *
 * 例:
 *   node scripts/convert-to-html.js projects/member
 *   node scripts/convert-to-html.js projects/POMS
 *
 * 出力先: docs/ (projects/ のディレクトリ構造をそのまま再現)
 *   - projects/ 配下のファイル → docs/{projects以降のパス}
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { marked } = require('marked');

// ---- 設定 ----------------------------------------------------------------
const OUTPUT_DIR = path.join(__dirname, '..', 'docs');

// インラインCSS（doc-style.less に準拠 + SharePoint検証用スタイル）
const INLINE_CSS = `
  /* === レイアウト（サイドバー + メインコンテンツ） === */
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Meiryo UI", Meiryo, "Segoe UI", "Yu Gothic UI", sans-serif;
    font-size: 14px;
    line-height: 1.7;
    color: #1e1e1e;
    display: flex;
    min-height: 100vh;
  }
  #toc-sidebar {
    width: 230px;
    min-width: 230px;
    position: sticky;
    top: 0;
    max-height: 100vh;
    overflow-y: auto;
    background: #f7f7f7;
    border-right: 1px solid #ddd;
    padding: 20px 10px;
    box-sizing: border-box;
    font-size: 12px;
    flex-shrink: 0;
  }
  #toc-sidebar .toc-title {
    font-weight: bold;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #999;
    margin-bottom: 8px;
  }
  #toc-sidebar ul { list-style: none; margin: 0; padding: 0; }
  #toc-sidebar li { margin: 1px 0; }
  #toc-sidebar li.toc-h1 > a { font-weight: bold; color: #1e1e1e; }
  #toc-sidebar li.toc-h2 { padding-left: 10px; }
  #toc-sidebar li.toc-h2 > a { color: #555; }
  #toc-sidebar li.toc-h3 { padding-left: 20px; }
  #toc-sidebar li.toc-h3 > a { color: #888; font-size: 11px; }
  #toc-sidebar a { text-decoration: none; display: block; padding: 3px 6px; border-radius: 3px; line-height: 1.4; }
  #toc-sidebar a:hover { background: #e5e5e5; color: #0078d4; }
  #toc-sidebar a.active { background: #ddeeff; color: #0078d4; }
  /* TOC項番 */
  #toc-sidebar > ul { counter-reset: toc-chapter; }
  #toc-sidebar li.toc-h2 { counter-increment: toc-chapter; counter-reset: toc-sub; }
  #toc-sidebar li.toc-h2 > a::before { content: counter(toc-chapter) ".  "; color: #aaa; font-size: 11px; }
  #toc-sidebar li.toc-h3 { counter-increment: toc-sub; }
  #toc-sidebar li.toc-h3 > a::before { content: counter(toc-chapter) "." counter(toc-sub) "  "; color: #bbb; font-size: 10px; }
  #main-content {
    flex: 1;
    max-width: 960px;
    padding: 24px 36px;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  /* === 見出し（doc-style.less 準拠） + CSS counter === */
  #main-content h1 {
    counter-reset: chapter;
    font-size: 1.5em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 6px;
    margin-top: 32px;
  }
  #main-content h2 {
    counter-reset: sub-chapter;
    font-size: 1.2em;
    margin-top: 28px;
    margin-bottom: 8px;
  }
  #main-content h2::before {
    counter-increment: chapter;
    content: counter(chapter) ". ";
    color: #555;
  }
  #main-content h3 {
    counter-reset: section;
    font-size: 1.0em;
    margin-top: 20px;
    margin-bottom: 6px;
  }
  #main-content h3::before {
    counter-increment: sub-chapter;
    content: counter(chapter) "." counter(sub-chapter) ". ";
    color: #555;
  }
  #main-content h4 {
    font-size: 0.95em;
    margin-top: 16px;
  }
  #main-content h4::before {
    counter-increment: section;
    content: "(" counter(section) ") ";
    color: #555;
  }

  /* === テーブル（doc-style.less 準拠） === */
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th { background: #eee; padding: 5px; border: 1px solid #ccc; font-size: 0.8em; text-align: left; }
  td { border: 1px solid #ccc; padding: 5px; font-size: 0.8em; }
  tr:nth-child(even) td { background: #fafafa; }

  /* === コード === */
  code { background: #f3f2f1; padding: 2px 5px; border-radius: 3px; font-size: 0.875em; font-family: Consolas, "Courier New", monospace; }
  pre { background: #f3f2f1; padding: 14px; border-radius: 4px; overflow-x: auto; }
  pre code { background: none; padding: 0; }

  /* === その他 === */
  blockquote { border-left: 4px solid #0078d4; margin-left: 0; padding-left: 14px; color: #555; }
  img { max-width: 100%; }
  a { color: #0078d4; }
  hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  p { margin: 8px 0; }
  #main-content p, #main-content li { font-size: 0.95em; }

  /* === 図表（PlantUML / Mermaid） === */
  .plantuml-diagram { margin: 16px 0; text-align: left; }
  .plantuml-diagram img { max-width: 100%; height: auto; border: 1px solid #e0e0e0; border-radius: 4px; background: #fff; padding: 8px; }
  .mermaid { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 16px; margin: 16px 0; overflow-x: auto; }
`;

// ---- PlantUML エンコーダ（zlib deflate raw + PlantUML カスタム base64）-----------

function encodePlantUML(uml) {
  const deflated = zlib.deflateRawSync(Buffer.from(uml, 'utf8'), { level: 9 });
  // PlantUML 専用アルファベット：0-9A-Za-z-_
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let r = '';
  for (let i = 0; i < deflated.length; i += 3) {
    const b0 = deflated[i];
    const b1 = (i + 1 < deflated.length) ? deflated[i + 1] : 0;
    const b2 = (i + 2 < deflated.length) ? deflated[i + 2] : 0;
    r += chars[b0 >> 2];
    r += chars[((b0 & 3) << 4) | (b1 >> 4)];
    r += chars[((b1 & 15) << 2) | (b2 >> 6)];
    r += chars[b2 & 63];
  }
  return r; // プレフィックスなし（plantuml.com 標準フォーマット）
}

// marked に PlantUML / Mermaid カスタムレンダラーを登録
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'plantuml') {
        const encoded = encodePlantUML(text);
        const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
        return `<div class="plantuml-diagram"><img src="${url}" alt="PlantUML diagram" loading="lazy" /></div>\n`;
      }
      if (lang === 'mermaid') {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
      }
      return false; // その他はデフォルトレンダラーに委貸
    }
  }
});

// --------------------------------------------------------------------------

// TOCサイドバーHTML生成（h1/h2/h3・depth_from:1 depth_to:3 準拠）
function buildTocHtml(bodyHtml) {
  const headings = [];
  const re = /<h([123])\b[^>]*>([\s\S]*?)<\/h[123]>/gi;
  let match;
  while ((match = re.exec(bodyHtml)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    headings.push({ level, text });
  }
  if (headings.length === 0) return '';
  const items = headings.map(h => {
    const anchor = '#' + slugify(h.text);
    return `<li class="toc-h${h.level}"><a href="${anchor}">${escapeHtml(h.text)}</a></li>`;
  }).join('\n');
  return `<nav id="toc-sidebar"><div class="toc-title">目次</div><ul>\n${items}\n</ul></nav>`;
}

// 見出しにid属性を付与
function addHeadingIds(bodyHtml) {
  return bodyHtml.replace(/<(h[123])>([\s\S]*?)<\/h[123]>/gi, (m, tag, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = slugify(text);
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
}

function slugify(text) {
  return encodeURIComponent(text.replace(/[\s\u3000]+/g, '-').substring(0, 80));
}
// --------------------------------------------------------------------------

/**
 * frontmatter（---ブロック）と @import 行を除去して本文のみ返す
 */
function stripFrontmatter(content) {
  // BOM除去
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  // YAMLフロントマター除去: ファイルが --- で始まる場合のみ（文字列比較で先頭を確実に判定）
  if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx !== -1) {
      content = content.slice(closeIdx + 4);
    }
  }
  // @import 行除去
  content = content.replace(/^@import\s+.*$/mg, '');
  return content.trim();
}

/**
 * 見出しに手動で書かれた項番プレフィックスを除去（CSS counter と二重にならないよう）
 *   h2: "1. テキスト"    → "テキスト"
 *   h3: "4.1 テキスト"   → "テキスト"
 *   h4: "(1) テキスト"   → "テキスト"
 */
function stripHeadingNumbers(html) {
  return html
    .replace(/(<h2(?:\s[^>]*)?>)\s*\d+\.\s+/gi, '$1')
    .replace(/(<h3(?:\s[^>]*)?>)\s*\d+\.\d+\.?\s+/gi, '$1')
    .replace(/(<h4(?:\s[^>]*)?>)\s*\(\d+\)\s+/gi, '$1');
}

/**
 * HTML中の href/src 内の .md を .html に変換
 * marked の後処理として実行するため、日本語パスの影響を受けない
 */
function convertLinksInHtml(html) {
  // href="...something.md" または href="...something.md#anchor"
  return html.replace(/href="([^"]*\.md)(#[^"]*)?"/g, (match, mdPath, anchor) => {
    const htmlPath = mdPath.replace(/\.md$/, '.html');
    return `href="${htmlPath}${anchor || ''}"`;
  });
}

/**
 * Markdown → HTML 変換
 */
function convertFile(mdFilePath, rootDocsDir) {
  const content = fs.readFileSync(mdFilePath, 'utf8');
  const stripped = stripFrontmatter(content);

  // HTMLタイトルを最初のH1から取得
  const titleMatch = stripped.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : path.basename(mdFilePath, '.md');

  // marked でHTML化 → 手動項番除去 → href変換 → 見出しにid付与
  const rawHtml = marked.parse(stripped);
  const cleanedHtml = stripHeadingNumbers(rawHtml);
  const linkedHtml = convertLinksInHtml(cleanedHtml);
  const bodyHtml = addHeadingIds(linkedHtml);

  // TOCサイドバー生成
  const tocHtml = buildTocHtml(bodyHtml);

  // 出力先パスを計算
  const relPath = path.relative(rootDocsDir, mdFilePath);
  const outPath = path.join(OUTPUT_DIR, relPath.replace(/\.md$/, '.html'));

  // assetsフォルダのコピー用に相対パスを計算
  const depth = relPath.split(path.sep).length - 1;
  const rootRel = depth > 0 ? '../'.repeat(depth) : './';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${INLINE_CSS}</style>
</head>
<body>
${tocHtml}
<div id="main-content">
${bodyHtml}
</div>
<script>
(function() {
  const links = document.querySelectorAll('#toc-sidebar a');
  if (!links.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const id = e.target.getAttribute('id');
      links.forEach(a => {
        if (a.getAttribute('href') === '#' + id) a.classList.toggle('active', e.isIntersecting);
      });
    });
  }, { rootMargin: '0px 0px -75% 0px' });
  document.querySelectorAll('#main-content h1[id], #main-content h2[id], #main-content h3[id]').forEach(h => observer.observe(h));
})();
<\/script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default' });
<\/script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * ディレクトリを再帰的に走査して .md ファイルを収集
 */
function collectMdFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile() && targetPath.endsWith('.md')) {
    return targetPath.endsWith('_extracted.md') ? [] : [targetPath];
  }
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(targetPath, entry.name);
      if (entry.isDirectory() && !['node_modules', '.git', 'docs'].includes(entry.name)) {
        files.push(...collectMdFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('_extracted.md')) {
        files.push(full);
      }
    }
    return files;
  }
  return [];
}

/**
 * assets フォルダをまるごとコピー
 */
function copyAssets(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

// ---- メイン --------------------------------------------------------------

const arg = process.argv[2];
const workspaceDir = path.join(__dirname, '..');
const docsDir = path.join(workspaceDir, 'docs');
const projectsDir = path.join(workspaceDir, 'projects');
const targetPath = arg ? path.resolve(arg) : docsDir;

// targetPath が projects/ 配下なら projectsDir を起点に docs/member/... 形式で出力
// targetPath が docs/ 配下なら docsDir を起点に出力
// それ以外（ワークスペースルートのファイル等）は workspaceDir を起点に docs/ 直下へ出力
const rootDocsDir = targetPath.startsWith(projectsDir) ? projectsDir
                  : targetPath.startsWith(docsDir)     ? docsDir
                  : workspaceDir;

if (!fs.existsSync(targetPath)) {
  console.error(`対象が見つかりません: ${targetPath}`);
  process.exit(1);
}

console.log(`変換対象: ${targetPath}`);
console.log(`出力先: ${OUTPUT_DIR}\n`);

// Markdownファイルを変換
const mdFiles = collectMdFiles(targetPath);
let success = 0;
for (const file of mdFiles) {
  try {
    const out = convertFile(file, rootDocsDir);
    console.log(`  OK: ${path.relative(process.cwd(), file)} → ${path.relative(process.cwd(), out)}`);
    success++;
  } catch (e) {
    console.error(`  NG: ${file}\n     ${e.message}`);
  }
}

// assetsフォルダをコピー（画像・Excel等）
console.log('\nassets コピー中...');
const assetsEntries = [];
function findAssets(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name === 'image') {
          assetsEntries.push(full);
        } else if (!['node_modules', '.git', 'docs'].includes(entry.name)) {
          findAssets(full);
        }
    }
  }
}
// targetPath がファイルの場合はその親ディレクトリ、ディレクトリの場合はそのまま検索
const assetsSearchRoot = fs.statSync(targetPath).isFile() ? path.dirname(targetPath) : targetPath;
findAssets(assetsSearchRoot);
for (const aDir of assetsEntries) {
  const rel = path.relative(rootDocsDir, aDir);
  const dst = path.join(OUTPUT_DIR, rel);
  copyAssets(aDir, dst);
  console.log(`  コピー: ${rel}`);
}

console.log(`\n完了: ${success}/${mdFiles.length} ファイル変換`);
