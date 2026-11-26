import { fetchFileContent, describeFile, makeSnippet, extractImports, resolveImport, extOf, baseName } from './analyzer';

const TEXT_EXT = [
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'rb', 'php', 'vue', 'svelte', 'cs',
  'json', 'md', 'mdx', 'txt', 'yml', 'yaml', 'toml', 'ini', 'env', 'css', 'scss', 'sass', 'less', 'html',
  'xml', 'svg', 'sh', 'bash', 'sql', 'prisma', 'graphql', 'gql', 'c', 'h', 'cpp', 'hpp', 'kt', 'swift',
  'lock', 'gitignore', 'dockerfile', 'makefile', 'cfg', 'conf', 'properties', 'gradle'
];

const BINARY_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'gz', 'tar', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'mov', 'webm', 'exe', 'dll', 'so', 'bin', 'class', 'jar'];

const SPECIAL = {
  'package.json': 'Lists the project name, its scripts and every library it depends on.',
  'package-lock.json': 'A locked list of the exact library versions installed. Generated automatically.',
  'yarn.lock': 'A locked list of the exact library versions installed. Generated automatically.',
  'readme.md': 'The project introduction. It usually explains what the project is and how to run it.',
  'dockerfile': 'Instructions for packaging this project into a container so it runs the same everywhere.',
  'docker-compose.yml': 'Describes several containers (like app and database) that start together.',
  '.gitignore': 'Tells Git which files should never be saved to the repository.',
  'license': 'The legal terms for how others may use this code.',
  'tsconfig.json': 'Settings for the TypeScript compiler.',
  'vite.config.js': 'Settings for the Vite build tool.',
  'vite.config.ts': 'Settings for the Vite build tool.',
  'makefile': 'Shortcuts for common commands such as build and test.',
  '.env.example': 'A template showing which environment variables the project needs.'
};

export function isBinaryPath(path) {
  return BINARY_EXT.indexOf(extOf(path)) !== -1;
}

function lineCount(text) {
  return text ? text.split('\n').length : 0;
}

function describeNonCode(path, content, ext) {
  const name = baseName(path);
  const lower = name.toLowerCase();
  let summary = SPECIAL[lower] || '';
  const details = [];

  if (!summary) {
    if (ext === 'md' || ext === 'mdx') summary = name + ' is a documentation file written in Markdown.';
    else if (ext === 'json') summary = name + ' is a data or settings file in JSON format.';
    else if (ext === 'yml' || ext === 'yaml') summary = name + ' is a configuration file, often used for automation or deployment.';
    else if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') summary = name + ' holds styling rules that control how things look.';
    else if (ext === 'html') summary = name + ' is a web page template.';
    else if (ext === 'sql') summary = name + ' contains database commands.';
    else if (ext === 'sh' || ext === 'bash') summary = name + ' is a script of terminal commands.';
    else if (ext === 'svg') summary = name + ' is a vector image stored as text.';
    else if (ext === 'prisma' || ext === 'graphql' || ext === 'gql') summary = name + ' describes the shape of the data used by the project.';
    else summary = name + ' is a supporting file for the project.';
  }

  if (ext === 'json' && content) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        const keys = Object.keys(parsed).slice(0, 6);
        if (keys.length) details.push('Top-level keys: ' + keys.join(', '));
        if (parsed.scripts && typeof parsed.scripts === 'object') details.push('Scripts: ' + Object.keys(parsed.scripts).slice(0, 5).join(', '));
        if (parsed.dependencies && typeof parsed.dependencies === 'object') details.push(Object.keys(parsed.dependencies).length + ' runtime libraries');
      }
    } catch (e) {
      /* ignore */
    }
  }
  if (ext === 'md' || ext === 'mdx') {
    const heads = (content.match(/^#{1,3}\s+.+$/gm) || []).slice(0, 4).map((h) => h.replace(/^#+\s*/, ''));
    if (heads.length) details.push('Sections: ' + heads.join(', '));
  }
  if (ext === 'css' || ext === 'scss') {
    const sel = (content.match(/^[.#][\w-]+/gm) || []).length;
    if (sel) details.push('About ' + sel + ' style rules');
  }
  if (!details.length) details.push(lineCount(content) + ' lines of ' + (ext || 'plain') + ' text');
  return { type: 'util', summary: summary, details: details };
}

export async function inspectFile(owner, name, branch, path, fileList) {
  const ext = extOf(path);
  const base = baseName(path);
  const entry = fileList.find((f) => f.path === path);
  const size = entry ? entry.size : 0;

  const id = path;
  if (isBinaryPath(path)) {
    return {
      id: id, label: base, path: path, type: 'util', x: 0, y: 0, lines: 0, snippet: '', binary: true,
      summary: base + ' is a binary file (such as an image, font or archive), so there is no readable code to show.',
      details: ['Size: ' + (size > 1024 ? Math.round(size / 1024) + ' KB' : size + ' bytes')]
    };
  }
  if (size > 400000) {
    return {
      id: id, label: base, path: path, type: 'util', x: 0, y: 0, lines: 0, snippet: '', binary: false,
      summary: base + ' is very large (' + Math.round(size / 1024) + ' KB), so it is skipped to keep things fast. It is probably generated data.',
      details: ['Open it directly on GitHub to read it']
    };
  }

  const content = await fetchFileContent(owner, name, path, branch);
  const known = TEXT_EXT.indexOf(ext) !== -1 || base.toLowerCase() in SPECIAL || !ext;
  const isCode = ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'rb', 'php', 'vue', 'svelte', 'cs'].indexOf(ext) !== -1;

  let desc;
  const allPaths = fileList.map((f) => f.path);
  const pathSet = {};
  allPaths.forEach((p) => { pathSet[p] = true; });

  const deps = [];
  if (isCode) {
    extractImports(content, ext).forEach((spec) => {
      const target = resolveImport(spec, path, ext, pathSet, allPaths);
      if (target && target !== path && deps.indexOf(target) === -1) deps.push(target);
    });
    const isEntry = /(^|\/)(main|index|app|server|cli|__main__|manage|wsgi|asgi)\.[a-z]+$/i.test(path);
    desc = describeFile(path, content, ext, isEntry, deps.length, 0);
  } else if (known) {
    desc = describeNonCode(path, content, ext);
  } else {
    desc = describeNonCode(path, content, ext);
  }

  return {
    id: id, label: base, path: path, type: desc.type, x: 0, y: 0,
    summary: desc.summary, details: desc.details, lines: lineCount(content),
    snippet: isCode ? makeSnippet(content) : content.split('\n').slice(0, 14).join('\n').slice(0, 900),
    deps: deps, binary: false
  };
}
