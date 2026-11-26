import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, GitFork, Star, Menu, KeyRound, PanelLeftOpen } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ArchitectureMap from '../components/ArchitectureMap';
import DetailPanel from '../components/DetailPanel';
import StatCards from '../components/StatCards';
import TokenDialog from '../components/TokenDialog';
import { NODES, REPO, EDGES, TREE, CODE_SNIPPETS, INSIGHTS } from '../data';
import { analyzeRepo, parseRepoUrl, setToken, fetchFileContent, extractImports, resolveImport, extOf } from '../lib/analyzer';
import { inspectFile } from '../lib/inspect';
import { load, save, loadToken, saveToken, loadCached, saveCached } from '../lib/storage';

const STEPS = [
  'Connecting to GitHub...',
  'Reading the folder structure...',
  'Finding entry points and key files...',
  'Tracing real file dependencies...',
  'Writing plain English explanations...'
];

const SAMPLE_OVERVIEW = [
  'shopflow is split into a React storefront in the client folder and a Node API in the server folder. Customers browse products, fill a cart that is remembered on their device, and check out through a payment flow handled by Stripe.',
  'The two best places to begin reading are client/src/main.tsx and server/src/server.ts. Every other file branches out from those entry points.'
];

const CACHE_MS = 30 * 60 * 1000;

function timeAgo(ts) {
  if (!ts) return 'Sample project';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + ' hr ago';
  return Math.round(hrs / 24) + ' day' + (Math.round(hrs / 24) === 1 ? '' : 's') + ' ago';
}

export default function Dashboard() {
  const saved = useRef(load('session', null)).current;
  const initialToken = useRef(loadToken()).current;
  setToken(initialToken);

  const [url, setUrl] = useState(saved ? saved.url : 'https://github.com/acme-labs/shopflow');
  const [repo, setRepo] = useState(saved ? saved.repo : REPO);
  const [nodes, setNodes] = useState(saved ? saved.nodes : NODES);
  const [edges, setEdges] = useState(saved ? saved.edges : EDGES);
  const [tree, setTree] = useState(saved ? saved.tree : TREE);
  const [snippets, setSnippets] = useState(saved ? saved.snippets : CODE_SNIPPETS);
  const [insights, setInsights] = useState(saved ? saved.insights : INSIGHTS);
  const [overview, setOverview] = useState(saved ? saved.overview : SAMPLE_OVERVIEW);
  const [fileList, setFileList] = useState(saved ? saved.fileList || [] : []);
  const [extraNodes, setExtraNodes] = useState(saved ? saved.extraNodes || [] : []);
  const [showAll, setShowAll] = useState(false);
  const [extraEdges, setExtraEdges] = useState([]);
  const [linking, setLinking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [isSample, setIsSample] = useState(saved ? !!saved.isSample : true);
  const [history, setHistory] = useState(load('history', [{ label: 'acme-labs/shopflow (sample)', url: 'https://github.com/acme-labs/shopflow', time: 0 }]));
  const [selectedId, setSelectedId] = useState(saved ? saved.selectedId : 'routes');
  const [view, setView] = useState('map');
  const [stepIndex, setStepIndex] = useState(-1);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(load('collapsed', false));
  const [token, setTokenState] = useState(initialToken);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [extra, setExtra] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [notice, setNotice] = useState('');
  const extraCache = useRef({});

  const analyzing = stepIndex >= 0;

  useEffect(() => {
    save('session', {
      url: url,
      repo: repo,
      nodes: nodes,
      edges: edges,
      tree: tree,
      snippets: snippets,
      insights: insights,
      overview: overview,
      fileList: fileList,
      extraNodes: extraNodes,
      isSample: isSample,
      selectedId: selectedId && String(selectedId).indexOf('path:') === 0 ? null : selectedId
    });
  }, [repo, nodes, edges, tree, snippets, insights, overview, fileList, extraNodes, isSample, selectedId]);

  useEffect(() => {
    save('history', history);
  }, [history]);

  useEffect(() => {
    save('collapsed', collapsed);
  }, [collapsed]);

  function applyResult(result, sample) {
    setRepo(result.repo);
    setNodes(result.nodes);
    setEdges(result.edges);
    setTree(result.tree);
    setSnippets(result.snippets);
    setInsights(result.insights);
    setFileList(result.fileList || []);
    setExtraNodes(result.extraNodes || []);
    setExtraEdges([]);
    setShowAll(false);
    setOverview(
      result.overview && result.overview.length
        ? result.overview
        : ['No readable README was found, so this overview is built from the code itself. ' + result.repo.name + ' has ' + result.repo.files + ' files, mostly written in ' + result.repo.language + '.']
    );
    setIsSample(!!sample);
    setExtra(null);
    setFileError('');
    extraCache.current = {};
    const firstEntry = result.nodes.find((n) => n.type === 'entry');
    setSelectedId(firstEntry ? firstEntry.id : null);
    setView('map');
  }

  async function runAnalysis(targetUrl, forceFresh) {
    if (analyzing) return;
    const parsed = parseRepoUrl(targetUrl);
    if (!parsed) {
      setError('Please paste a valid GitHub URL, like https://github.com/owner/repo');
      return;
    }
    setError('');
    setNotice('');

    if (!forceFresh) {
      const cached = loadCached(parsed.owner, parsed.name);
      if (cached && Date.now() - cached.time < CACHE_MS) {
        applyResult(cached.result, false);
        setNotice('Loaded from your saved copy (' + timeAgo(cached.time) + '). No GitHub requests used. Use "Refresh" to fetch it again.');
        recordHistory(cached.result.repo, targetUrl);
        return;
      }
    }

    setStepIndex(0);
    try {
      const result = await analyzeRepo(parsed.owner, parsed.name, (i) => setStepIndex(i));
      applyResult(result, false);
      saveCached(parsed.owner, parsed.name, result);
      recordHistory(result.repo, targetUrl);
    } catch (err) {
      setError(err.message || 'Something went wrong while analyzing this repository.');
    } finally {
      setStepIndex(-1);
    }
  }

  function recordHistory(r, targetUrl) {
    const label = r.owner + '/' + r.name;
    setHistory((prev) => [{ label: label, url: targetUrl, time: Date.now() }].concat(prev.filter((h) => h.label !== label)).slice(0, 10));
  }

  function handleAnalyze(event) {
    event.preventDefault();
    runAnalysis(url, false);
  }

  function handleRefresh() {
    runAnalysis(url, true);
  }

  function handleHistoryClick(h) {
    if (!h.url) return;
    setUrl(h.url);
    runAnalysis(h.url, false);
  }

  function handleTokenSave(value) {
    setTokenState(value);
    setToken(value);
    saveToken(value);
  }

  function placeExtraNodes() {
    const startX = 30;
    const startY = (nodes.length ? Math.max(...nodes.map((n) => n.y)) : 0) + 140;
    const perRow = 6;
    return extraNodes.map((n, i) => ({
      ...n,
      x: startX + (i % perRow) * 215,
      y: startY + Math.floor(i / perRow) * 82
    }));
  }

  const [extraPlaced, setExtraPlaced] = useState([]);

  async function buildExtraEdges() {
    if (isSample || !repo || !repo.owner || !extraNodes.length) return;
    setLinking(true);
    try {
      const branch = repo.branch || 'main';
      const allPaths = fileList.map((f) => f.path);
      const pathSet = {};
      allPaths.forEach((p) => { pathSet[p] = true; });
      const known = {};
      nodes.concat(extraNodes).forEach((n) => { known[n.id] = true; });
      const found = [];
      const seen = {};
      const queue = extraNodes.slice(0, 60);
      let cursor = 0;
      async function worker() {
        while (cursor < queue.length) {
          const n = queue[cursor++];
          let content = '';
          try {
            content = await fetchFileContent(repo.owner, repo.name, n.path, branch);
          } catch (e) {
            content = '';
          }
          if (!content) continue;
          const ext = extOf(n.path);
          extractImports(content, ext).forEach((spec) => {
            const target = resolveImport(spec, n.path, ext, pathSet, allPaths);
            if (target && target !== n.path && known[target]) {
              const key = n.path + '>' + target;
              if (!seen[key]) {
                seen[key] = true;
                found.push({ from: n.path, to: target });
              }
            }
          });
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      setExtraEdges(found);
    } finally {
      setLinking(false);
    }
  }

  function handleToggleAll() {
    if (!showAll) {
      setExtraPlaced(placeExtraNodes());
      if (!extraEdges.length) buildExtraEdges();
    }
    setShowAll(!showAll);
  }

  const mapNodes = showAll ? nodes.concat(extraPlaced) : nodes;
  const mapEdges = showAll ? edges.concat(extraEdges) : edges;
  const setMapNodes = (updater) => {
    const apply = (list) => (typeof updater === 'function' ? updater(list) : updater);
    if (!showAll) {
      setNodes(apply);
      return;
    }
    const combined = apply(nodes.concat(extraPlaced));
    const baseIds = {};
    nodes.forEach((n) => { baseIds[n.id] = true; });
    setNodes(combined.filter((n) => baseIds[n.id]));
    setExtraPlaced(combined.filter((n) => !baseIds[n.id]));
  };

  async function openPath(path) {
    const mapped = mapNodes.find((n) => n.id === path && !n.lazy);
    if (mapped) {
      setSelectedId(mapped.id);
      setExtra(null);
      setFileError('');
      return;
    }
    if (isSample) {
      setFileError('This is the built-in sample project. Analyze a real GitHub repository to open any of its files.');
      setSelectedId('path:' + path);
      return;
    }
    const cachedExtra = extraCache.current[path];
    if (cachedExtra) {
      setExtra(cachedExtra);
      setSelectedId(cachedExtra.id);
      setFileError('');
      return;
    }
    setFileLoading(true);
    setFileError('');
    setSelectedId('path:' + path);
    try {
      const data = await inspectFile(repo.owner, repo.name, repo.branch || 'main', path, fileList);
      const withId = { ...data, id: 'path:' + path };
      extraCache.current[path] = withId;
      setExtra(withId);
    } catch (err) {
      setFileError(err.message || 'This file could not be opened.');
    } finally {
      setFileLoading(false);
    }
  }

  function handleOpenFile(fileNode) {
    setView('map');
    setMenuOpen(false);
    openPath(fileNode.path || fileNode.nodeId);
  }

  function handleSelect(id) {
    if (typeof id === 'string' && id.indexOf('path:') === 0) {
      openPath(id.slice(5));
      return;
    }
    const lazyNode = mapNodes.find((n) => n.id === id && n.lazy);
    if (lazyNode) {
      openPath(lazyNode.path);
      return;
    }
    setExtra(null);
    setFileError('');
    setSelectedId(id);
  }

  const selectedPath = (() => {
    if (!selectedId) return null;
    if (String(selectedId).indexOf('path:') === 0) return String(selectedId).slice(5);
    const n = mapNodes.find((x) => x.id === selectedId);
    return n ? n.path : null;
  })();

  const loadingPath = fileLoading && selectedId ? String(selectedId).replace(/^path:/, '') : null;

  function toggleSidebar() {
    if (window.innerWidth <= 820) setMenuOpen(!menuOpen);
    else setCollapsed(!collapsed);
  }

  return (
    <div className="app-shell">
      <div className={'sidebar-wrap' + (menuOpen ? ' sidebar-wrap-open' : '') + (collapsed ? ' sidebar-wrap-collapsed' : '')}>
        <Sidebar
          tree={tree}
          selectedPath={selectedPath}
          loadingPath={loadingPath}
          onOpenFile={handleOpenFile}
          view={view}
          onView={(v) => { setView(v); setMenuOpen(false); }}
          onCollapse={() => { setCollapsed(true); setMenuOpen(false); }}
        />
      </div>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
          </button>
          <form className="url-form" onSubmit={handleAnalyze}>
            <Search size={16} className="url-icon" />
            <input
              className="url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a GitHub repository URL"
              aria-label="GitHub repository URL"
            />
            <button className="btn btn-primary" type="submit" disabled={analyzing}>
              {analyzing ? <Loader2 size={16} className="spin" /> : null}
              {analyzing ? 'Analyzing' : 'Analyze repo'}
            </button>
          </form>
          <button
            className={'icon-btn token-btn' + (token ? ' token-btn-on' : '')}
            onClick={() => setTokenOpen(true)}
            aria-label="GitHub token"
            title={token ? 'GitHub token active (5,000 requests per hour, private repos allowed)' : 'Add a GitHub token for private repos and higher limits'}
          >
            <KeyRound size={16} />
          </button>
        </header>

        {error && <div className="error-bar">{error}</div>}
        {notice && !error && (
          <div className="notice-bar">
            <span>{notice}</span>
            <button className="notice-link" onClick={handleRefresh}>Refresh</button>
          </div>
        )}

        {analyzing ? (
          <div className="analyzing">
            <Loader2 size={34} className="spin analyzing-icon" />
            <h2>Reading the codebase</h2>
            <ul className="step-list">
              {STEPS.map((step, i) => (
                <li key={step} className={i < stepIndex ? 'step step-done' : i === stepIndex ? 'step step-now' : 'step'}>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="content">
            <div className="repo-head">
              <div>
                <h1 className="repo-title">
                  <span className="repo-owner">{repo.owner} /</span> {repo.name}
                </h1>
                <p className="repo-desc">{repo.description}</p>
              </div>
              <div className="repo-badges">
                <span className="meta-pill"><span className="lang-dot" />{repo.language}</span>
                {repo.branch && <span className="meta-pill"><GitFork size={13} /> branch: {repo.branch}</span>}
                <span className="meta-pill"><Star size={13} /> {repo.stars}</span>
                <span className="meta-pill"><GitFork size={13} /> {repo.forks}</span>
              </div>
            </div>

            <StatCards repo={repo} />

            {repo.languages && repo.languages.length > 0 && (
              <div className="lang-bar-wrap">
                <div className="lang-bar">
                  {repo.languages.map((l, i) => (
                    <span key={l.name} className={'lang-seg lang-seg-' + (i % 4)} style={{ width: Math.max(l.pct, 2) + '%' }} title={l.name + ' ' + l.pct + '%'} />
                  ))}
                </div>
                <div className="lang-legend">
                  {repo.languages.map((l, i) => (
                    <span key={l.name} className="lang-legend-item"><span className={'lang-swatch lang-seg-' + (i % 4)} />{l.name} {l.pct}%</span>
                  ))}
                </div>
              </div>
            )}

            <div className="workspace">
              {view === 'map' && (
                <ArchitectureMap
                  nodes={mapNodes}
                  edges={mapEdges}
                  linking={linking}
                  setNodes={setMapNodes}
                  selectedId={selectedId && String(selectedId).indexOf('path:') === 0 ? String(selectedId).slice(5) : selectedId}
                  onSelect={handleSelect}
                  showAll={showAll}
                  onToggleAll={handleToggleAll}
                  canShowAll={!isSample && extraNodes.length > 0}
                  extraCount={extraNodes.length}
                  fullscreen={fullscreen}
                  onToggleFullscreen={() => setFullscreen(!fullscreen)}
                />
              )}
              {view === 'overview' && (
                <div className="panel-card">
                  <h3>Project overview</h3>
                  <p>{repo.description}</p>
                  {overview.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </div>
              )}
              {view === 'history' && (
                <div className="panel-card">
                  <h3>Analysis history</h3>
                  <ul className="history-list">
                    {history.map((h) => (
                      <li key={h.label}>
                        <button className="history-btn" onClick={() => handleHistoryClick(h)}>{h.label}</button>
                        <span>{timeAgo(h.time)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <DetailPanel
                nodes={nodes}
                edges={edges}
                snippets={snippets}
                insights={insights}
                selectedId={selectedId}
                extra={extra}
                loading={fileLoading}
                fileError={fileError}
                onSelect={handleSelect}
                repo={repo}
                isSample={isSample}
              />
            </div>
          </div>
        )}
      </main>


      {tokenOpen && <TokenDialog token={token} onSave={handleTokenSave} onClose={() => setTokenOpen(false)} />}
    </div>
  );
}
