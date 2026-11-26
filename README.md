# 🧠 Repomind

**Paste any GitHub repo. See the whole project as a map. Click any file and get it explained in plain English.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GitHub stars](https://img.shields.io/github/stars/ahmadasif545/repomind?style=social)](https://github.com/ahmadasif545/repomind)

[Report a Bug](https://github.com/ahmadasif545/repomind/issues) · [Request a Feature](https://github.com/ahmadasif545/repomind/issues)


---

## What is Repomind?

Opening an unfamiliar codebase is painful. Repomind fixes that.

Paste a GitHub repository URL (public **or private**) and Repomind fetches the entire project and turns it into an interactive visual map of its file structure. Click any file and an AI explains it in plain English, including **which other files it depends on** and **which files depend on it**.

Free. Open source. Bring your own keys.

## ✨ Features

- 🔗 **Paste a URL, get a map.** Works with public and private repos.
- 🗺️ **Visual file structure.** Explore the whole project as an interactive tree/graph instead of a wall of folders.
- 💬 **Plain-English file explanations.** Click any file to learn what it does and why it exists.
- 🕸️ **Dependency awareness.** See what each file imports and what imports it.
- 🤖 **Bring your own AI.** Plug in your **OpenAI** or **Claude (Anthropic)** API key for deeper, multi-turn conversations about the code.
- 🔑 **Beats GitHub rate limits.** Add a GitHub access token to lift the 60 requests/hour anonymous limit (up to 5,000/hour).
- 🔒 **Private by design.** Your tokens and API keys stay in your browser and are never stored on a server.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or newer
- npm (or yarn / pnpm)

### Run locally

```bash
git clone https://github.com/ahmadasif545/repomind.git
cd repomind
npm install
cp .env.example .env     # optional, see Configuration below
npm run dev
```

Then open the local URL printed in your terminal (usually `http://localhost:3000` or `http://localhost:5173`).

## 🔧 Configuration

Everything is optional. Repomind works out of the box for public repos.

| Setting | Where | Purpose |
|---|---|---|
| GitHub token | In the app (Settings) | Access private repos and raise rate limits |
| OpenAI API key | In the app (Settings) | Use GPT models for explanations and chat |
| Anthropic (Claude) API key | In the app (Settings) | Use Claude models for explanations and chat |

> Keys entered in the app are kept in your browser only. If you self-host and prefer server-side defaults, put them in `.env` (see `.env.example`). **Never commit `.env`.**

### Getting a GitHub token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Click **Generate new token**.
3. Choose the repositories you want Repomind to read.
4. Grant **read-only** access to **Contents** and **Metadata**. Nothing else is needed.
5. Paste the token into Repomind's settings.

For public repos only, a classic token with no scopes is enough to raise your rate limit.

### Getting AI keys

- **OpenAI:** https://platform.openai.com/api-keys
- **Anthropic (Claude):** https://console.anthropic.com/settings/keys

You pay your AI provider directly for usage. Repomind adds no markup and no middleman.

## 🧭 How it works

```
 Paste repo URL
       │
       ▼
 Fetch file tree + contents (GitHub API, optional token)
       │
       ▼
 Parse imports/requires to build a dependency graph
       │
       ▼
 Render interactive visual map
       │
       ▼
 Click a file ──► AI explains it + shows what it relies on / what relies on it
       │
       ▼
 Keep chatting with OpenAI or Claude for deeper answers
```

## 🔐 Privacy & Security

- Tokens and API keys are used only to call GitHub, OpenAI and Anthropic directly. They are **not logged and not stored on any server.**
- Code from private repos is sent only to the AI provider **you** choose, using **your** key.
- Use fine-grained, read-only, short-lived GitHub tokens whenever possible.
- Found a vulnerability? Please read [SECURITY.md](./SECURITY.md) and report it privately rather than opening a public issue.

## 🗺️ Roadmap

- [ ] Support for GitLab and Bitbucket
- [ ] Export the map as PNG / SVG / Markdown
- [ ] More languages for dependency detection
- [ ] Local model support (Ollama)
- [ ] Shareable map links
- [ ] "Explain the whole architecture" one-click summary

Have an idea? [Open an issue](https://github.com/ahmadasif545/repomind/issues).

## 🤝 Contributing

Contributions of every size are welcome: bug fixes, features, docs, design.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details. Good first issues are labeled `good first issue`.

## 📄 License

Released under the [MIT License](./LICENSE). Free to use, modify and distribute.

## 👤 Author

Built by **Ahmad Asif**, founder of [**Dasyal**](https://dasyal.com), an AI-powered website and mobile app builder.

If Repomind saves you time, please ⭐ the repo and check out [Dasyal](https://dasyal.com?utm_source=github&utm_medium=repomind&utm_campaign=readme).

- GitHub: [@ahmadasif545](https://github.com/ahmadasif545)
- Dasyal: https://dasyal.com

---

Made with ❤️ in Lahore, Pakistan
