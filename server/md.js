// Server-side markdown to HTML. Mirrors the parser in admin.html.
// Kept minimal — supports the patterns the composer toolbar generates.

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img src="${u}" alt="${escHtml(a)}">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${escHtml(t)}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

function mdToArticleHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '', state = null, listType = null;
  let listItems = [], codeBuf = [], quoteBuf = [];

  function flushList() {
    if (listItems.length) {
      html += `<${listType}>${listItems.map(i => `<li>${inline(i)}</li>`).join('')}</${listType}>`;
      listItems = []; listType = null;
    }
  }
  function flushQuote() {
    if (quoteBuf.length) {
      html += `<div class="callout">${inline(quoteBuf.join(' '))}</div>`;
      quoteBuf = [];
    }
  }
  function flushCode() {
    if (codeBuf.length) {
      const escaped = codeBuf.map(l => l ? escHtml(l) : '&nbsp;').join('<br>');
      html += `<div class="code-block">${escaped}</div>`;
      codeBuf = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (state === 'code') {
      if (line.trim() === '```') { flushCode(); state = null; }
      else codeBuf.push(line);
      continue;
    }
    if (line.trim().startsWith('```')) { flushList(); flushQuote(); state = 'code'; continue; }

    if (line.startsWith('### ')) { flushList(); flushQuote(); html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    if (line.startsWith('## '))  { flushList(); flushQuote(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
    if (line.startsWith('# '))   { flushList(); flushQuote(); html += `<h2>${inline(line.slice(2))}</h2>`; continue; }
    if (line.trim() === '---')   { flushList(); flushQuote(); html += '<hr>'; continue; }

    if (line.startsWith('> ')) { flushList(); quoteBuf.push(line.slice(2)); continue; }
    else flushQuote();

    const ul = line.match(/^- (.+)/);
    const ol = line.match(/^\d+\. (.+)/);
    if (ul) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul'; listItems.push(ul[1]); continue;
    }
    if (ol) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol'; listItems.push(ol[1]); continue;
    }
    flushList();

    if (line.trim() === '') continue;

    // Raw HTML block passthrough — lines that look like an opening HTML tag
    // are emitted verbatim, along with subsequent non-blank lines (until a blank
    // line breaks the block). Lets posts include <table>, <div class="callout">,
    // <div class="code-block">, etc. without paragraph-wrapping.
    if (/^<[a-z][a-z0-9-]*(\s|>|\/>|$)/i.test(line.trim())) {
      const htmlLines = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '') {
        i++;
        htmlLines.push(lines[i]);
      }
      html += htmlLines.join('\n');
      continue;
    }

    html += `<p>${inline(line)}</p>`;
  }
  flushList(); flushQuote(); flushCode();
  return html;
}

module.exports = { mdToArticleHtml, escHtml };
