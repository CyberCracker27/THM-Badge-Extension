# THM Badge Extension 🛡️

A Firefox browser extension that automatically keeps your **TryHackMe profile badge** updated on GitHub.

THM Badge connects your TryHackMe profile with a GitHub repository through **GitHub OAuth** and a **GitHub App**, without requiring users to create or enter a GitHub Personal Access Token (PAT).

---

## ✨ Features

- 🔐 GitHub OAuth authentication
- 🔑 GitHub App-based repository access
- 🛡️ OAuth authorization with PKCE
- 👤 TryHackMe username configuration
- 📦 GitHub repository selection
- 🔄 Manual **Update now** action
- 🚀 Update check when Firefox starts
- ⚡ GitHub Actions-based badge generation
- 🚫 No GitHub Personal Access Token required
- 🚦 Rate-limit aware TryHackMe requests
- 🦊 Built for Firefox

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │   TryHackMe Profile │
                    │     Public Data     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Firefox Extension │
                    │      THM Badge      │
                    └──────────┬──────────┘
                               │
                         GitHub OAuth
                               │
                               ▼
                    ┌─────────────────────┐
                    │    GitHub App       │
                    │  Repository Access  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   User's GitHub     │
                    │   THM-Badge Repo    │
                    └──────────┬──────────┘
                               │
                          data.json
                               │
                               ▼
                    ┌─────────────────────┐
                    │   GitHub Actions    │
                    │  Badge Generation   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ tryhackme_badge.png │
                    │    GitHub Pages     │
                    └─────────────────────┘
```

---

## 📁 Project Structure

```text
THM-Badge-Extension/
│
├── extension/
│   ├── manifest.json       # Firefox extension manifest
│   ├── background.js       # OAuth, TryHackMe and GitHub logic
│   ├── popup.html          # Extension popup interface
│   ├── popup.js            # Popup UI logic
│   └── icon.png            # Extension icon
└── README.md
```

> The extension does **not** use a separate `config.js`. Configuration required by the extension is contained in the extension source.

---

## 🔐 Authentication

THM Badge uses **GitHub OAuth through a GitHub App**.

Users do not need to create or enter a GitHub Personal Access Token.

The authentication flow is:

```text
Firefox Extension
        │
        ▼
GitHub OAuth
        │
        ▼
GitHub App Authorization
        │
        ▼
Repository Access
        │
        ▼
GitHub API
```

The OAuth Client Secret is handled by the backend and must never be included in the Firefox extension.

---

## 🔑 Permissions

The extension uses these Firefox permissions:

```text
storage
identity
```

### `storage`

Used for extension state and configuration such as:

- GitHub authentication state
- Selected repository
- TryHackMe username
- Last update information

### `identity`

Used for the Firefox OAuth redirect flow.

---

## 🌐 Host Permissions

The extension communicates with the following services:

```text
https://tryhackme.com/*
https://api.github.com/*
https://github.com/*
https://thm-badge-oauth.goldenking2734.workers.dev/*
```

These are used for:

- TryHackMe public profile data
- GitHub API communication
- GitHub OAuth
- THM Badge OAuth backend communication

---

## 🚀 Installation

### Mozilla Add-ons

The recommended installation method is Mozilla Add-ons:

**THM Badge:**  
https://addons.mozilla.org/en-US/firefox/addon/thm-badge/

Install the extension and open it from the Firefox toolbar.

---

## 🛠️ Development Installation

### 1. Clone the repository

```bash
git clone https://github.com/CyberCracker27/THM-Badge-Extension.git
cd THM-Badge-Extension
```

### 2. Open Firefox

Navigate to:

```text
about:debugging
```

### 3. Select

```text
This Firefox
```

### 4. Click

```text
Load Temporary Add-on...
```

### 5. Select

```text
extension/manifest.json
```

The extension will now be loaded temporarily in Firefox.

---

## ⚙️ How to Use

### 1. Connect GitHub

Open the extension and click:

```text
Continue with GitHub
```

Authorize the THM Badge GitHub App when prompted.

### 2. Select a repository

Choose the GitHub repository where your THM Badge data will be stored.

### 3. Enter your TryHackMe username

For example:

```text
CyberCracker27
```

### 4. Generate the badge

Click:

```text
Save & Generate Badge
```

The extension retrieves the public TryHackMe profile data and updates:

```text
data.json
```

in the selected repository.

GitHub Actions then generates:

```text
docs/tryhackme_badge.png
```

---

## 🔄 Update Behavior

THM Badge does **not** continuously poll TryHackMe.

Updates are triggered by:

### Firefox startup

The extension checks for an update when Firefox starts.

### Manual update

You can request an immediate update using:

```text
Update now
```

This design reduces unnecessary requests and helps avoid excessive traffic to TryHackMe.

---

## 🚦 Rate Limiting

TryHackMe may temporarily rate-limit requests.

If the service returns:

```text
HTTP 429
Too Many Requests
```

the extension respects the rate limit and applies a cooldown rather than repeatedly retrying.

The extension does **not** attempt to bypass TryHackMe rate limits.

---

## 🔒 Security

THM Badge follows these security principles:

- GitHub App authentication instead of PATs
- OAuth authorization
- PKCE-based authorization flow
- Minimal repository permissions
- No GitHub Client Secret in the extension
- No hardcoded user credentials
- Rate-limit aware requests
- User-controlled repository selection

### GitHub App Permissions

The GitHub App should use only the permissions required for the badge workflow.

Recommended permissions:

```text
Contents: Read & Write
Metadata: Read-only
```

No unnecessary organization or enterprise permissions are required.

---

## 🔗 Related Project

### THM Badge

The main badge repository contains:

- `data.json`
- Python badge generator
- GitHub Actions workflow
- GitHub Pages output

Repository:

https://github.com/CyberCracker27/THM-Badge

The extension is designed to work with this repository.

---

## ☁️ OAuth Backend

The GitHub OAuth exchange is handled by a Cloudflare Worker.

The backend keeps the GitHub OAuth Client Secret outside the browser extension.

The extension communicates with the backend through its configured HTTPS endpoint.

---

## 🧪 Development

The extension is built using standard WebExtension technologies:

```text
JavaScript
HTML
WebExtension APIs
GitHub REST API
GitHub OAuth
```

No frontend framework is required.

---

## 📦 Release Packaging

The extension source is located inside:

```text
extension/
```

When creating a Firefox extension ZIP, `manifest.json` must be at the root of the ZIP.

From the repository root:

```bash
cd extension
zip -r ../thm-badge-extension.zip .
```

The resulting package should contain:

```text
thm-badge-extension.zip
├── manifest.json
├── background.js
├── popup.html
├── popup.js
└── icon.png
```

Do **not** ZIP the parent `THM-Badge-Extension` directory itself.

---

## 🐛 Troubleshooting

### GitHub connection fails

Check that:

- Firefox is online
- The GitHub App is available
- The OAuth backend is running
- The OAuth redirect URI is correctly configured

### Repository does not appear

Make sure the THM Badge GitHub App has been installed for the GitHub account and that the required repository has been granted access.

### TryHackMe returns HTTP 429

This means TryHackMe has temporarily rate-limited the request.

Wait for the cooldown period and try again later.

Avoid repeatedly clicking **Update now** while the service is rate-limiting requests.

### Badge does not update

Check:

1. Selected GitHub repository
2. TryHackMe username
3. GitHub App repository permissions
4. GitHub Actions workflow status
5. Latest commit to `data.json`

---

## 🤝 Contributing

Contributions, bug reports and improvements are welcome.

### Development workflow

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/my-feature
```

3. Make your changes.
4. Test the extension in Firefox.
5. Commit your changes:

```bash
git commit -m "feat: improve extension"
```

6. Push your branch:

```bash
git push origin feature/my-feature
```

7. Open a Pull Request.

---

## ⭐ Support

If you find THM Badge useful:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest improvements
- 🔀 Submit pull requests

---

## ⚠️ Disclaimer

THM Badge is an independent community project and is not affiliated with or endorsed by TryHackMe, GitHub, Mozilla, or Cloudflare.

Use the extension responsibly and respect the terms, policies, API limitations, and rate limits of the services it interacts with.
