// HTML page templates for blog posts (SSR).
// Mirrors the static blog-bacnet.html shell so dynamic posts look identical.

const { mdToArticleHtml, escHtml } = require('./md');

const CAT_META = {
  'building-automation': { label: 'Building Automation', badge: 'badge-cyan' },
  'cybersecurity':       { label: 'Cybersecurity',       badge: 'badge-violet' },
  'networking':          { label: 'Networking',          badge: 'badge-blue' },
  'public-safety':       { label: 'Public Safety',       badge: 'badge-green' },
  'web':                 { label: 'Web Development',     badge: 'badge-orange' },
  'tech':                { label: 'Tech',                badge: 'badge-blue' },
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00Z');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function renderPost(post) {
  const cat = CAT_META[post.category] || CAT_META.tech;
  const dateFmt = fmtDate(post.date);
  const bodyHtml = mdToArticleHtml(post.body_md);
  const tags = (post.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    author: { '@type': 'Person', name: 'Ryan Pfister', url: 'https://rdpfister.com' },
    datePublished: post.date,
    publisher: { '@type': 'Person', name: 'Ryan Pfister' },
    description: post.excerpt,
  });

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(post.title)} | Ryan Pfister</title>
  <meta name="description" content="${escHtml(post.excerpt)}">
  <link rel="canonical" href="https://rdpfister.com/blog/${escHtml(post.slug)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escHtml(post.title)}">
  <meta property="og:description" content="${escHtml(post.excerpt)}">
  <meta property="og:url" content="https://rdpfister.com/blog/${escHtml(post.slug)}">
  <meta property="article:published_time" content="${escHtml(post.date)}">
  <meta property="article:author" content="Ryan Pfister">
  <script type="application/ld+json">${ld}<\/script>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/main.css?v=20260518c">
  <style>
    .article-wrap{max-width:720px;margin:0 auto}
    .article-header{padding:140px 0 56px;position:relative}
    .article-back{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--text-lo);margin-bottom:32px;transition:var(--ease)}
    .article-back:hover{color:var(--blue)}
    .article-back svg{width:14px;height:14px}
    .article-meta{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}
    .article-date{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-faint)}
    .article-h1{font-size:clamp(32px,6vw,52px);font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px}
    .article-intro{font-size:18px;color:var(--text-lo);line-height:1.85;border-left:3px solid var(--blue);padding-left:20px}
    .article-author{display:flex;align-items:center;gap:12px;margin-top:32px;padding-top:28px;border-top:1px solid var(--border)}
    .author-avatar{width:44px;height:44px;border-radius:50%;background:var(--blue-dim);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--blue);font-size:16px;flex-shrink:0}
    .author-name{font-size:14px;font-weight:700}
    .author-role{font-size:12px;color:var(--text-lo)}
    .article-body{padding:56px 0 80px;font-size:16px;color:var(--text-lo);line-height:1.9}
    .article-body h2{font-size:26px;font-weight:800;color:var(--text-hi);letter-spacing:-.3px;margin:48px 0 16px}
    .article-body h3{font-size:19px;font-weight:700;color:var(--text-hi);margin:32px 0 12px}
    .article-body p{margin-bottom:20px}
    .article-body strong{color:var(--text-hi);font-weight:600}
    .article-body a{color:var(--blue);text-decoration:underline;text-underline-offset:3px}
    .article-body ul,.article-body ol{margin:0 0 20px 20px}
    .article-body li{margin-bottom:8px;line-height:1.75}
    .article-body li::marker{color:var(--blue)}
    .article-body code{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);padding:1px 7px;border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:.88em;color:var(--blue)}
    .article-body img{max-width:100%;border-radius:var(--r);margin:20px 0;border:1px solid var(--border)}
    .article-body hr{border:none;border-top:1px solid var(--border);margin:36px 0}
    .code-block{background:var(--bg-0);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin:28px 0;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.9;overflow-x:auto;color:var(--text-lo)}
    .callout{background:var(--blue-dim);border:1px solid rgba(6,182,212,.2);border-radius:var(--r);padding:20px 24px;margin:28px 0;font-size:15px;backdrop-filter:blur(12px)}
    .callout strong{color:var(--blue)}
    .article-tags{display:flex;flex-wrap:wrap;gap:8px;padding-top:32px;border-top:1px solid var(--border);margin-bottom:48px}
  </style>
</head>
<body>

<div class="c-dot" id="cDot"></div>
<div class="c-ring" id="cRing"></div>
<div id="progress"></div>

<nav id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">Ryan <span>Pfister</span></a>
    <ul class="nav-links">
      <li><a href="/#about">About</a></li>
      <li><a href="/projects">Projects</a></li>
      <li><a href="/resume">Resume</a></li>
      <li><a href="/certifications">Certs</a></li>
      <li><a href="/blog" class="active">Blog</a></li>
    </ul>
    <div class="nav-right">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <a href="/#contact" class="nav-cta">Contact</a>
    </div>
  </div>
</nav>

<div class="page-bg"></div>
<div class="page-dots"></div>

<div class="container">
  <div class="article-wrap">
    <div class="article-header">
      <a href="/blog" class="article-back">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Blog
      </a>
      <div class="article-meta">
        <span class="article-date">${escHtml(dateFmt)}</span>
        <span class="badge ${cat.badge}">${escHtml(cat.label)}</span>
      </div>
      <h1 class="article-h1">${escHtml(post.title)}</h1>
      ${post.intro ? `<p class="article-intro">${escHtml(post.intro)}</p>` : ''}
      <div class="article-author">
        <div class="author-avatar">RP</div>
        <div><div class="author-name">Ryan Pfister</div><div class="author-role">Smart Building Intern at Siemens &middot; Security Systems Student</div></div>
      </div>
    </div>

    <div class="article-body">
${bodyHtml}
    </div>

    ${tags.length ? `<div class="article-tags">${tags.map(t => `<span class="chip">${escHtml(t)}</span>`).join('\n      ')}</div>` : ''}

  </div>
</div>

<footer>
  <div class="footer-inner">
    <p class="footer-copy">&copy; 2025 Ryan Pfister</p>
    <div class="footer-links">
      <a href="https://www.linkedin.com/in/rdpfister/" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://github.com/ryanpfister" target="_blank" rel="noopener">GitHub</a>
      <a href="mailto:mifd413@gmail.com">Email</a>
    </div>
  </div>
</footer>

<script>
  const html=document.documentElement,toggle=document.getElementById('themeToggle');
  (function(){const t=localStorage.getItem('theme')||'dark';html.setAttribute('data-theme',t);setIcon(t);})();
  toggle.addEventListener('click',()=>{const n=html.getAttribute('data-theme')==='dark'?'light':'dark';html.setAttribute('data-theme',n);localStorage.setItem('theme',n);setIcon(n);});
  function setIcon(t){toggle.querySelector('.icon-sun').style.display=t==='dark'?'block':'none';toggle.querySelector('.icon-moon').style.display=t==='light'?'block':'none';}
  const nav=document.getElementById('nav');window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',window.scrollY>20);},{passive:true});if(window.scrollY>20)nav.classList.add('scrolled');
  const dot=document.getElementById('cDot'),ring=document.getElementById('cRing');
  if(dot&&ring&&matchMedia('(hover:hover)').matches){let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});(function track(){rx+=(mx-rx)*.13;ry+=(my-ry)*.13;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(track);})();document.querySelectorAll('a,button').forEach(el=>{el.addEventListener('mouseenter',()=>ring.classList.add('big'));el.addEventListener('mouseleave',()=>ring.classList.remove('big'));});}
  const bar=document.getElementById('progress');window.addEventListener('scroll',()=>{bar.style.width=Math.min(window.scrollY/(document.body.scrollHeight-window.innerHeight)*100,100)+'%';},{passive:true});
<\/script>
</body>
</html>`;
}

module.exports = { renderPost, CAT_META, fmtDate };
