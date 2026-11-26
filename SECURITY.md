# Security Policy

## Reporting a Vulnerability

Please **do not open a public issue** for security problems.

Report privately using GitHub's **"Report a vulnerability"** button under the repo's **Security** tab (Security → Advisories → Report a vulnerability).

Please include:
- What the problem is and where it is
- Steps to reproduce
- The impact you think it has

You can expect a first reply within **72 hours**. We will keep you updated and credit you in the fix unless you prefer to stay anonymous.

## Supported Versions

Only the latest version on the `main` branch receives security fixes.

## What Repomind Does With Your Secrets

- GitHub tokens and OpenAI / Anthropic API keys are used only to call those services directly.
- They are not logged and not stored on any server.
- Keys entered in the app stay in your browser.

## Tips for Users

- Use **fine-grained, read-only** GitHub tokens with an expiry date.
- Never commit `.env` files or paste keys into issues.
- If you think a key leaked, **revoke it immediately** at the provider.
