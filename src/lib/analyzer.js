const API = 'https://api.github.com';

const CODE_EXT = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'rb', 'php', 'vue', 'svelte', 'cs'];
const IGNORE = /(^|\/)(node_modules|dist|build|\.git|vendor|coverage|\.next|\.nuxt|__pycache__|\.venv|venv|target|out|\.cache)(\/|$)/i;
const NOISE = /(\.min\.|\.test\.|\.spec\.|\.d\.ts$|\.config\.|\.stories\.|__tests__|__mocks__|(^|\/)tests?\/|(^|\/)fixtures?\/|(^|\/)migrations?\/)/i;
const ENTRY_RE = /(^|\/)(main|index|app|server|cli|__main__|manage|wsgi|asgi)\.[a-z]+$/i;

export function parseRepoUrl(input) {
  const m = String(input || '').trim().match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], name: m[2].replace(/\.git$/i, '') };
}

let authToken = '';

export function setToken(token) {
  authToken = (token || '').trim();
}

function rateMessage(res) {
  const reset = res.headers.get('x-ratelimit-reset');
  let when = '';
  if (reset) {
    const mins = Math.max(1, Math.ceil((Number(reset) * 1000 - Date.now()) / 60000));
    when = ' It resets in about ' + mins + ' minute' + (mins === 1 ? '' : 's') + '.';
  }
  if (authToken) {
    return 'GitHub rate limit reached even with your token.' + when;
  }
  return 'GitHub allows only 60 requests per hour without a token.' + when + ' Add a free GitHub token (the key button next to Analyze) to raise this to 5,000 per hour.';
}

async function gh(path, raw) {
  let res;
  const headers = { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
  if (authToken) headers.Authorization = 'Bearer ' + authToken;
  try {
    res = await fetch(API + path, { headers: headers });
  } catch (e) {
    throw new Error('Could not reach GitHub. Please check your connection and try again.');
  }
  if (res.status === 401) {
    throw new Error('Your GitHub token was rejected. Open the key button, check it is correct and not expired, then try again.');
  }
  if (res.status === 404) {
    throw new Error(
      authToken
        ? 'Repository not found. Check the URL, and make sure your token has access to this repository (for private repos it needs the "repo" scope).'
        : 'Repository not found. If it is private, add a GitHub token (the key button next to Analyze) so RepoMind can read it. Otherwise check the URL.'
    );
  }
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0' || res.status === 429) throw new Error(rateMessage(res));
    throw new Error(authToken ? 'GitHub denied access. Your token may be missing permission for this repository.' : 'GitHub denied access. If this repository is private, add a GitHub token (the key button next to Analyze).');
  }
  if (!res.ok) throw new Error('GitHub returned an error (' + res.status + '). Please try again.');
  if (raw) return res.text();
  return res.json();
}

export async function checkToken(token) {
  let res;
  try {
    res = await fetch(API + '/rate_limit', {
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token.trim() }
    });
  } catch (e) {
    throw new Error('Could not reach GitHub to check the token.');
  }
  if (res.status === 401) throw new Error('GitHub rejected this token. Please check it and try again.');
  if (!res.ok) throw new Error('Could not verify the token (' + res.status + ').');
  const data = await res.json();
  const core = data && data.resources && data.resources.core;
  return core ? { remaining: core.remaining, limit: core.limit } : { remaining: 0, limit: 0 };
}

export async function fetchFileContent(owner, name, path, branch) {
  const url = '/repos/' + owner + '/' + name + '/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(branch);
  return gh(url, true);
}

function decodeBase64(b64) {
  try {
    const bin = atob(String(b64).replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return '';
  }
}

export function extOf(path) {
  const m = path.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

export function baseName(path) {
  return path.split('/').pop();
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ---------- Tree ---------- */

function buildTree(files) {
  const root = [];
  const dirs = { '': root };
  const sorted = files.slice().sort((a, b) => a.path.localeCompare(b.path));
  sorted.forEach((f) => {
    const parts = f.path.split('/');
    let current = '';
    let list = root;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? current + '/' + parts[i] : parts[i];
      if (!dirs[current]) {
        const folder = { name: parts[i], type: 'folder', note: folderNote(parts[i]), children: [] };
        dirs[current] = folder.children;
        list.push(folder);
      }
      list = dirs[current];
    }
    list.push({ name: parts[parts.length - 1], type: 'file', path: f.path, nodeId: null });
  });
  const sortLevel = (items) => {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    items.forEach((it) => it.children && sortLevel(it.children));
  };
  sortLevel(root);
  return root;
}

const FOLDER_NOTES = {
  src: 'Main source code',
  lib: 'Shared helper code',
  utils: 'Small helper functions',
  util: 'Small helper functions',
  components: 'Reusable UI pieces',
  pages: 'One file per screen',
  routes: 'URL and API endpoints',
  api: 'API endpoints',
  hooks: 'Reusable React logic',
  store: 'Shared app state',
  state: 'Shared app state',
  services: 'Business logic',
  models: 'Data models',
  controllers: 'Request handlers',
  middleware: 'Checks that run on requests',
  config: 'Configuration',
  test: 'Automated tests',
  tests: 'Automated tests',
  docs: 'Documentation',
  public: 'Static files served as-is',
  assets: 'Images, fonts and media',
  styles: 'Styling',
  scripts: 'Helper scripts',
  server: 'Back-end code',
  client: 'Front-end code',
  packages: 'Sub-packages of this project',
  examples: 'Usage examples',
  bin: 'Command-line entry files',
  cmd: 'Command-line programs',
  internal: 'Private application code',
  pkg: 'Reusable packages'
};

function folderNote(name) {
  return FOLDER_NOTES[name.toLowerCase()] || '';
}

/* ---------- File selection ---------- */

function scoreFile(path) {
  const depth = path.split('/').length - 1;
  let score = 0;
  if (ENTRY_RE.test(path)) score += 100;
  score += Math.max(0, 30 - depth * 7);
  if (/(^|\/)src\//i.test(path)) score += 10;
  if (/(route|router|controller|handler|service|store|context|api|model|schema|middleware|provider)/i.test(path)) score += 14;
  if (/(^|\/)(utils?|lib|helpers?)\//i.test(path)) score += 4;
  return score;
}

function pickFiles(blobs, limit) {
  const code = blobs.filter((b) => CODE_EXT.indexOf(extOf(b.path)) !== -1 && !IGNORE.test(b.path) && !NOISE.test(b.path));
  return code
    .map((b) => ({ ...b, score: scoreFile(b.path) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------- Imports & resolution ---------- */

export function extractImports(content, ext) {
  const out = [];
  const add = (s) => {
    if (s && out.indexOf(s) === -1) out.push(s);
  };
  let m;
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue', 'svelte'].indexOf(ext) !== -1) {
    const patterns = [
      /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
      /export\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
      /require\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    patterns.forEach((re) => {
      re.lastIndex = 0;
      while ((m = re.exec(content))) add(m[1]);
    });
  } else if (ext === 'py') {
    const re1 = /^\s*from\s+([.\w]+)\s+import\s+/gm;
    const re2 = /^\s*import\s+([\w.]+)/gm;
    while ((m = re1.exec(content))) add(m[1]);
    while ((m = re2.exec(content))) add(m[1]);
  } else if (ext === 'go') {
    const re = /"([^"\n]+)"/g;
    const block = content.match(/import\s*\(([\s\S]*?)\)/);
    const src = block ? block[1] : (content.match(/import\s+"[^"\n]+"/) || [''])[0];
    while ((m = re.exec(src))) add(m[1]);
  } else if (ext === 'rs') {
    const re = /^\s*(?:pub\s+)?(?:use|mod)\s+(?:crate::|self::|super::)?([\w:]+)/gm;
    while ((m = re.exec(content))) add(m[1]);
  } else if (ext === 'java' || ext === 'cs') {
    const re = /^\s*(?:import|using)\s+(?:static\s+)?([\w.]+)\s*;/gm;
    while ((m = re.exec(content))) add(m[1]);
  } else if (ext === 'rb') {
    const re = /require(?:_relative)?\s+['"]([^'"]+)['"]/g;
    while ((m = re.exec(content))) add(m[1]);
  } else if (ext === 'php') {
    const re = /(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g;
    while ((m = re.exec(content))) add(m[1]);
  }
  return out;
}

function normalizePath(path) {
  const parts = [];
  path.split('/').forEach((p) => {
    if (p === '' || p === '.') return;
    if (p === '..') parts.pop();
    else parts.push(p);
  });
  return parts.join('/');
}

export function resolveImport(spec, fromPath, ext, pathSet, allPaths) {
  const dir = fromPath.split('/').slice(0, -1).join('/');
  const tryCandidates = (base) => {
    const exts = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.py', '.rb', '.php'];
    for (let i = 0; i < exts.length; i++) {
      if (pathSet[base + exts[i]]) return base + exts[i];
    }
    const idx = ['index.js', 'index.jsx', 'index.ts', 'index.tsx', '__init__.py', 'mod.rs'];
    for (let j = 0; j < idx.length; j++) {
      if (pathSet[base + '/' + idx[j]]) return base + '/' + idx[j];
    }
    return null;
  };

  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue', 'svelte', 'rb', 'php'].indexOf(ext) !== -1) {
    if (spec.charAt(0) === '.') return tryCandidates(normalizePath(dir + '/' + spec));
    if (spec.charAt(0) === '@' && spec.charAt(1) === '/') {
      return tryCandidates('src/' + spec.slice(2)) || tryCandidates(spec.slice(2));
    }
    if (spec.charAt(0) === '~' && spec.charAt(1) === '/') return tryCandidates('src/' + spec.slice(2));
    return null;
  }
  if (ext === 'py') {
    if (spec.charAt(0) === '.') {
      const dots = spec.match(/^\.+/)[0].length;
      const rest = spec.slice(dots).replace(/\./g, '/');
      const upDir = dir.split('/').slice(0, dir.split('/').length - (dots - 1)).join('/');
      return tryCandidates(normalizePath(upDir + '/' + rest));
    }
    const asPath = spec.replace(/\./g, '/');
    return tryCandidates(asPath) || tryCandidates('src/' + asPath);
  }
  if (ext === 'go') {
    const tail = spec.split('/').slice(-2).join('/');
    const found = allPaths.find((p) => p.indexOf('/' + tail + '/') !== -1 && extOf(p) === 'go');
    return found || null;
  }
  return null;
}

/* ---------- Plain-English explanation ---------- */

export function describeFile(path, content, ext, isEntry, importCount, usedByCount) {
  const name = baseName(path);
  const lower = path.toLowerCase();
  const details = [];

  const funcs = [];
  let fm;
  const funcRe = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^\s*def\s+([A-Za-z_]\w*)|^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)|^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*))/gm;
  while ((fm = funcRe.exec(content)) && funcs.length < 12) {
    const n = fm[1] || fm[2] || fm[3] || fm[4] || fm[5];
    if (n && funcs.indexOf(n) === -1) funcs.push(n);
  }
  const classes = [];
  const classRe = /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_]\w*)/gm;
  while ((fm = classRe.exec(content)) && classes.length < 5) classes.push(fm[1]);

  const routes = [];
  const routeRe = /\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
  while ((fm = routeRe.exec(content)) && routes.length < 5) routes.push(fm[1].toUpperCase() + ' ' + fm[2]);

  let type = 'util';
  let summary = '';

  if (isEntry) {
    type = 'entry';
    summary = name + ' is an entry point. It is where the program starts running and wires the main pieces together.';
  } else if (/(route|router|controller|handler|endpoint)/.test(lower) || routes.length > 0) {
    type = 'route';
    summary = name + ' handles incoming requests and decides what to send back. It is the layer between the outside world and the logic.';
  } else if (/(middleware|guard|interceptor)/.test(lower)) {
    type = 'middleware';
    summary = name + ' runs checks on requests before they reach the main logic, for example security or validation.';
  } else if (/(schema|model|entity|migration|prisma|database|\bdb\b|orm)/.test(lower)) {
    type = 'database';
    summary = name + ' describes how data is shaped and stored.';
  } else if (/(service|manager|provider|client|adapter|worker)/.test(lower)) {
    type = 'service';
    summary = name + ' contains business logic or talks to an outside system on behalf of the rest of the app.';
  } else if (/(store|state|context|reducer|slice|atom)/.test(lower)) {
    type = 'state';
    summary = name + ' keeps shared information that several parts of the app need to read and update.';
  } else if (/(component|view|page|screen|layout|widget)/.test(lower) || ['jsx', 'tsx', 'vue', 'svelte'].indexOf(ext) !== -1) {
    type = 'component';
    summary = name + ' defines part of the user interface that people see and interact with.';
  } else {
    summary = name + ' holds helper code that other files reuse.';
  }

  if (classes.length) details.push('Defines ' + (classes.length > 1 ? 'classes ' : 'the class ') + classes.slice(0, 3).join(', '));
  if (funcs.length) details.push('Key functions: ' + funcs.slice(0, 5).join(', '));
  if (routes.length) details.push('Handles: ' + routes.slice(0, 3).join(', '));
  if (importCount > 0) details.push('Relies on ' + importCount + ' other file' + (importCount === 1 ? '' : 's') + ' in this project');
  if (usedByCount > 0) details.push('Used by ' + usedByCount + ' other file' + (usedByCount === 1 ? '' : 's'));
  if (!details.length) details.push('Small file with no named functions detected');

  const top = content.match(/^\s*(?:\/\*\*?([\s\S]*?)\*\/|\/\/\s*(.+)|#\s*(.+)|"""([\s\S]*?)""")/);
  if (top) {
    const doc = (top[1] || top[2] || top[3] || top[4] || '').replace(/\n\s*\*?\s*/g, ' ').trim();
    if (doc.length > 15 && doc.length < 220 && !/^(copyright|license|eslint|@ts-|use strict)/i.test(doc)) {
      summary += ' The author notes: "' + doc + '"';
    }
  }

  return { type, summary, details };
}

export function makeSnippet(content) {
  const lines = content.split('\n');
  let start = 0;
  while (start < lines.length && /^\s*(import|from|using|package|use|require|#!|\/\/|\/\*|\*|'use|"use|#)/.test(lines[start] || '') || (lines[start] || '').trim() === '') {
    start++;
    if (start > 60) break;
  }
  if (start >= lines.length) start = 0;
  return lines.slice(start, start + 12).join('\n').slice(0, 700);
}

/* ---------- Layout ---------- */

function layoutNodes(nodes, edges) {
  const incoming = {};
  const outgoing = {};
  nodes.forEach((n) => {
    incoming[n.id] = [];
    outgoing[n.id] = [];
  });
  edges.forEach((e) => {
    incoming[e.to].push(e.from);
    outgoing[e.from].push(e.to);
  });

  const layer = {};
  nodes.forEach((n) => {
    layer[n.id] = n.type === 'entry' && incoming[n.id].length === 0 ? 0 : -1;
  });
  nodes.forEach((n) => {
    if (layer[n.id] === -1 && incoming[n.id].length === 0) layer[n.id] = 0;
  });

  for (let pass = 0; pass < nodes.length + 2; pass++) {
    let changed = false;
    edges.forEach((e) => {
      if (layer[e.from] >= 0) {
        const want = layer[e.from] + 1;
        if (layer[e.to] < want && want <= 6) {
          layer[e.to] = want;
          changed = true;
        }
      }
    });
    if (!changed) break;
  }
  nodes.forEach((n) => {
    if (layer[n.id] < 0) layer[n.id] = 0;
  });

  const cols = {};
  nodes.forEach((n) => {
    (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n);
  });

  const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b);
  colKeys.forEach((c) => {
    const list = cols[c].sort((a, b) => outgoing[b.id].length + incoming[b.id].length - (outgoing[a.id].length + incoming[a.id].length));
    list.forEach((n, i) => {
      n.x = 30 + c * 235;
      n.y = 24 + i * 82 + (c % 2) * 22;
    });
  });
}

/* ---------- Main ---------- */

export async function analyzeRepo(owner, name, onStep) {
  const step = (i) => onStep && onStep(i);

  step(0);
  const info = await gh('/repos/' + owner + '/' + name);
  const branch = info.default_branch || 'main';

  step(1);
  const treeData = await gh('/repos/' + owner + '/' + name + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1');
  const blobs = (treeData.tree || []).filter((t) => t.type === 'blob' && !IGNORE.test(t.path));
  if (!blobs.length) throw new Error('This repository looks empty, so there is nothing to map yet.');

  const allPaths = blobs.map((b) => b.path);
  const pathSet = {};
  allPaths.forEach((p) => {
    pathSet[p] = true;
  });

  step(2);
  const chosen = pickFiles(blobs, authToken ? 40 : 18);
  const extraAll = pickFiles(blobs, 400).filter((f) => !chosen.some((c) => c.path === f.path));
  if (!chosen.length) throw new Error('No supported source files were found in this repository.');

  const [langs, contribs, readmeData] = await Promise.all([
    gh('/repos/' + owner + '/' + name + '/languages').catch(() => ({})),
    gh('/repos/' + owner + '/' + name + '/contributors?per_page=100').catch(() => []),
    gh('/repos/' + owner + '/' + name + '/readme').catch(() => null)
  ]);

  const contents = {};
  let rateError = null;
  await Promise.all(
    chosen.map(async (f) => {
      try {
        contents[f.path] = await fetchFileContent(owner, name, f.path, branch);
      } catch (e) {
        contents[f.path] = '';
        if (/rate limit/i.test(e.message || '')) rateError = e;
      }
    })
  );
  if (rateError && Object.keys(contents).every((k) => !contents[k])) throw rateError;

  step(3);
  const chosenSet = {};
  chosen.forEach((f) => {
    chosenSet[f.path] = true;
  });

  const edgeMap = {};
  const edges = [];
  chosen.forEach((f) => {
    const content = contents[f.path] || '';
    const specs = extractImports(content, extOf(f.path));
    specs.forEach((spec) => {
      const target = resolveImport(spec, f.path, extOf(f.path), pathSet, allPaths);
      if (target && target !== f.path && chosenSet[target]) {
        const key = f.path + '>' + target;
        if (!edgeMap[key]) {
          edgeMap[key] = true;
          edges.push({ from: f.path, to: target });
        }
      }
    });
  });

  const usedBy = {};
  const uses = {};
  chosen.forEach((f) => {
    usedBy[f.path] = 0;
    uses[f.path] = 0;
  });
  edges.forEach((e) => {
    uses[e.from]++;
    usedBy[e.to]++;
  });

  step(4);
  let nodes = chosen.map((f) => {
    const content = contents[f.path] || '';
    const ext = extOf(f.path);
    const isEntry = ENTRY_RE.test(f.path) && usedBy[f.path] === 0;
    const desc = describeFile(f.path, content, ext, isEntry, uses[f.path], usedBy[f.path]);
    return {
      id: f.path,
      label: baseName(f.path),
      path: f.path,
      type: desc.type,
      x: 0,
      y: 0,
      summary: desc.summary,
      details: desc.details,
      lines: content ? content.split('\n').length : 0,
      snippet: makeSnippet(content)
    };
  });

  const connected = {};
  edges.forEach((e) => {
    connected[e.from] = true;
    connected[e.to] = true;
  });
  const withEdges = nodes.filter((n) => connected[n.id]);
  const loners = nodes.filter((n) => !connected[n.id]).slice(0, 4);
  nodes = withEdges.concat(loners);
  const keepSet = {};
  nodes.forEach((n) => {
    keepSet[n.id] = true;
  });
  const finalEdges = edges.filter((e) => keepSet[e.from] && keepSet[e.to]);

  layoutNodes(nodes, finalEdges);

  /* Tree with node links */
  const tree = buildTree(blobs);
  const linkTree = (items) => {
    items.forEach((it) => {
      if (it.type === 'file') {
        it.nodeId = keepSet[it.path] ? it.path : null;
      } else if (it.children) {
        linkTree(it.children);
      }
    });
  };
  linkTree(tree);

  const fileList = blobs.map((b) => ({ path: b.path, size: b.size || 0 }));

  /* Extra (lightweight) nodes for the "show all files" mode. Built from the
     file list only, so no extra GitHub requests are needed. */
  const extraNodes = extraAll.map((f) => {
    const ext = extOf(f.path);
    const lower = f.path.toLowerCase();
    let type = 'util';
    if (/(route|router|controller|handler|endpoint)/.test(lower)) type = 'route';
    else if (/(middleware|guard)/.test(lower)) type = 'middleware';
    else if (/(schema|model|entity|prisma|database|\bdb\b)/.test(lower)) type = 'database';
    else if (/(service|manager|provider|client|adapter|worker)/.test(lower)) type = 'service';
    else if (/(store|state|context|reducer|slice)/.test(lower)) type = 'state';
    else if (/(component|view|page|screen|layout)/.test(lower) || ['jsx', 'tsx', 'vue', 'svelte'].indexOf(ext) !== -1) type = 'component';
    return {
      id: f.path,
      label: baseName(f.path),
      path: f.path,
      type: type,
      x: 0,
      y: 0,
      summary: 'Click to read this file and get a plain English explanation. It was left off the main map because it is less central to the project.',
      details: ['Not analyzed yet. Opening it will fetch and explain it'],
      lines: 0,
      snippet: '',
      lazy: true
    };
  });

  /* Stats */
  const langTotal = Object.keys(langs).reduce((s, k) => s + langs[k], 0);
  const approxLines = Math.round(langTotal / 38);
  const repo = {
    owner: info.owner.login,
    name: info.name,
    description: info.description || 'No description provided for this repository.',
    stars: fmtNum(info.stargazers_count || 0),
    forks: fmtNum(info.forks_count || 0),
    language: info.language || 'Mixed',
    files: blobs.length,
    lines: fmtNum(approxLines),
    contributors: Array.isArray(contribs) ? (contribs.length >= 100 ? '100+' : contribs.length) : '-',
    branch: branch,
    languages: Object.keys(langs)
      .map((k) => ({ name: k, pct: langTotal ? Math.round((langs[k] / langTotal) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4),
    readme: readmeData && readmeData.content ? decodeBase64(readmeData.content) : ''
  };

  /* Insights */
  const insights = [];
  const entries = nodes.filter((n) => n.type === 'entry');
  if (entries.length) {
    insights.push({
      title: 'Start reading here',
      text: 'Begin with ' + entries.slice(0, 2).map((n) => n.path).join(' and ') + '. Everything else branches out from there.'
    });
  }
  const hub = nodes.slice().sort((a, b) => usedBy[b.id] - usedBy[a.id])[0];
  if (hub && usedBy[hub.id] > 0) {
    insights.push({
      title: 'Most depended on',
      text: hub.path + ' is imported by ' + usedBy[hub.id] + ' other file' + (usedBy[hub.id] === 1 ? '' : 's') + ', so changes there ripple the furthest.'
    });
  }
  const topDirs = {};
  blobs.forEach((b) => {
    const d = b.path.indexOf('/') > -1 ? b.path.split('/')[0] : '(root)';
    topDirs[d] = (topDirs[d] || 0) + 1;
  });
  const bigDirs = Object.keys(topDirs)
    .filter((d) => d !== '(root)')
    .sort((a, b) => topDirs[b] - topDirs[a])
    .slice(0, 3);
  if (bigDirs.length) {
    insights.push({
      title: 'Where the code lives',
      text: 'Most files sit inside ' + bigDirs.join(', ') + '. These folders hold the heart of the project.'
    });
  }
  if (treeData.truncated) {
    insights.push({
      title: 'Very large repository',
      text: 'GitHub trimmed the file list because this repo is huge, so the map shows the most important files found.'
    });
  }
  insights.push({
    title: 'How this map was built',
    text: 'Showing the ' + nodes.length + ' most important of ' + allPaths.length + ' files, based on real imports found in the source code.'
  });

  const snippets = {};
  nodes.forEach((n) => {
    snippets[n.id] = n.snippet;
  });

  /* Overview text */
  const readmeText = repo.readme
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/[`*_>]/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 60)
    .slice(0, 2);

  return { repo, nodes, edges: finalEdges, tree, insights, snippets, overview: readmeText, fileList, extraNodes };
}
