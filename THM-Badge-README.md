# THM Badge

> **Automatically display your TryHackMe profile statistics on your GitHub profile or README.**

THM Badge is a Firefox extension and GitHub Actions-based project that fetches a user's public TryHackMe profile data, stores it in a GitHub repository, and generates a badge image that can be embedded anywhere a public image URL is supported.

**No GitHub Personal Access Token (PAT) is required.**

---

## ✨ Features

- 🔐 GitHub OAuth 2.0 with PKCE
- 🤖 GitHub App-based repository access
- 🚫 No Personal Access Token required
- 👤 TryHackMe username configuration
- 🔄 Automatic update when Firefox starts
- 🖱️ Manual **Update now** action
- ⚙️ Automatic badge generation with GitHub Actions
- 🌐 Free badge hosting through GitHub Pages
- 🖼️ Markdown and HTML embedding
- 🔒 GitHub App client secret kept on the OAuth backend
- 🛡️ Rate-limit aware TryHackMe requests

---

## 🏗️ Architecture

```text
TryHackMe Public Profile
          │
          ▼
   Firefox Extension
       THM Badge
          │
          │ GitHub OAuth + PKCE
          ▼
      GitHub App
          │
          │ GitHub Contents API
          ▼
       data.json
          │
          │ Repository update
          ▼
    GitHub Actions
   update-badge.yml
          │
          │ generate_badge.py
          ▼
docs/tryhackme_badge.png
          │
          ▼
     GitHub Pages
```

---

# 🚀 Getting Started

## 1. Fork the Repository

Fork this repository to your GitHub account.

Your fork is used as the storage location for:

- `data.json`
- Generated badge files
- GitHub Actions workflow

---

## 2. Enable GitHub Pages

In your fork, open:

**Settings → Pages**

Configure:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/docs`

Click **Save**.

Your badge can then be served from:

```text
https://YOUR_USERNAME.github.io/REPOSITORY_NAME/tryhackme_badge.png
```

Replace `YOUR_USERNAME` and `REPOSITORY_NAME` with your GitHub username and repository name.

---

# 🦊 Install the Firefox Extension

### Recommended

Install the signed **THM Badge** extension from Mozilla Add-ons.

### Development / Testing

To load the extension temporarily:

1. Open Firefox.
2. Navigate to:

```text
about:debugging#/runtime/this-firefox
```

3. Select **This Firefox**.
4. Click **Load Temporary Add-on…**
5. Select the extension's `manifest.json`.

> Temporary add-ons are removed when Firefox restarts. For normal use, install the published signed extension.

---

# 🔐 Connect GitHub

Open the THM Badge extension from the Firefox toolbar.

Click:

**Continue with GitHub**

The extension uses the GitHub OAuth Authorization Code flow with PKCE.

```text
Firefox Extension
       │
       │ Authorization Code + PKCE
       ▼
     GitHub
       │
       │ OAuth code
       ▼
 Cloudflare Worker
       │
       │ Token exchange
       ▼
 GitHub OAuth Token
```

The GitHub App client secret is **not bundled inside the extension**.

---

# 📦 Install the GitHub App

After connecting GitHub:

1. Click **Install / manage GitHub App**.
2. Select the repository you want to use.
3. Install the THM Badge GitHub App.
4. Return to the extension.
5. Refresh/select the repository.

For the best security, grant the GitHub App access only to the repository used for the badge.

---

# ⚙️ Configure the Badge

In the extension:

1. Connect GitHub.
2. Install/manage the GitHub App.
3. Select your GitHub repository.
4. Enter your TryHackMe username.
5. Click **Save & Generate Badge**.

The extension fetches your public TryHackMe profile and writes the result to:

```text
data.json
```

The GitHub Actions workflow then generates the badge image.

---

# 🔄 Updating Your Badge

THM Badge supports two update methods.

## Firefox Startup

After the extension has been configured, it can perform an update when Firefox starts.

```text
Firefox starts
      ↓
THM Badge starts
      ↓
Fetch TryHackMe profile
      ↓
Update data.json
      ↓
GitHub Actions
      ↓
Generate badge
```

## Manual Update

Open the extension and click:

**Update now**

This requests fresh TryHackMe profile data and updates `data.json`.

### No periodic polling

THM Badge does **not** continuously poll TryHackMe every 30 minutes.

This avoids unnecessary requests and reduces unnecessary API traffic.

---

# 🖼️ Add the Badge to Your GitHub README

Once GitHub Pages is enabled:

### Markdown

```markdown
![TryHackMe Badge](https://YOUR_USERNAME.github.io/REPOSITORY_NAME/tryhackme_badge.png)
```

### HTML

```html
<img
  src="https://YOUR_USERNAME.github.io/REPOSITORY_NAME/tryhackme_badge.png"
  alt="TryHackMe Badge"
>
```

---

# 📁 Repository Structure

```text
THM-Badge/
│
├── .github/
│   └── workflows/
│       └── update-badge.yml
│
├── docs/
│   └── tryhackme_badge.png
│
├── data.json
├── generate_badge.py
├── requirements.txt
└── README.md
```

The Firefox extension source/package is distributed separately when published as an add-on.

---

# ⚙️ GitHub Actions

The workflow:

```text
.github/workflows/update-badge.yml
```

runs when `data.json` changes or when the workflow is manually triggered.

It:

1. Checks out the repository.
2. Sets up Python.
3. Installs dependencies from `requirements.txt`.
4. Runs `generate_badge.py`.
5. Generates:

```text
docs/tryhackme_badge.png
```

6. Commits the generated files back to the repository.

---

# 🐍 Run the Generator Locally

Install the dependencies:

```bash
pip install -r requirements.txt
```

Then run:

```bash
python generate_badge.py
```

The generated badge is placed in:

```text
docs/tryhackme_badge.png
```

---

# 🛡️ Rate Limiting

TryHackMe may temporarily rate-limit requests.

If the endpoint returns:

```text
HTTP 429 Too Many Requests
```

the extension records a cooldown and does not repeatedly retry the request.

The extension does **not** attempt to bypass TryHackMe rate limits.

If you receive a rate-limit error, wait and use **Update now** later.

---

# 🔐 Security

THM Badge is designed to avoid requiring users to create or manually manage GitHub Personal Access Tokens.

### GitHub Authentication

Authentication uses:

- GitHub OAuth
- Authorization Code flow
- PKCE
- OAuth state validation

### GitHub App

The GitHub App provides access to the selected repository.

Recommended permissions:

```text
Contents: Read & write
Metadata: Read-only
```

### Client Secret

The GitHub App client secret is stored only by the OAuth backend.

It is never bundled into the Firefox extension.

### Local Storage

OAuth session information and extension configuration are stored using the extension's `storage.local`.

---

# 📊 TryHackMe Data

The extension uses information from the public TryHackMe profile endpoint to generate the badge.

The retrieved data is written to:

```text
data.json
```

in the GitHub repository selected by the user.

If the repository is public, the contents of `data.json` may also be publicly accessible.

Do not store passwords, tokens, API keys, or other secrets in `data.json`.

---

# 🧰 Requirements

### Firefox

- Firefox **140+**
- Firefox for Android **142+**, where supported

### GitHub

- GitHub account
- Repository for the badge
- THM Badge GitHub App installed on the selected repository
- GitHub Pages enabled

### TryHackMe

- TryHackMe profile
- Public TryHackMe username/profile

### Local Badge Generation

- Python
- Pillow
- Requests

See `requirements.txt` for the exact Python dependencies.

---

# 🐛 Troubleshooting

## Badge is not updating

Open:

**GitHub repository → Actions**

Check the latest **Generate TryHackMe Badge** workflow run.

If the workflow failed, open the run to inspect the error.

---

## "THM Badge is not installed"

The GitHub App has not been installed on the selected repository.

Click:

**Install / manage GitHub App**

Install it for the required repository, then return to the extension and refresh the repository list.

---

## "GitHub session expired"

Reconnect GitHub using:

**Continue with GitHub**

The extension will start a new OAuth flow.

---

## HTTP 429 from TryHackMe

This means the TryHackMe endpoint is temporarily rate-limiting requests.

Wait before trying again.

Do not attempt to bypass the rate limit.

---

## Badge image is not available

Verify that:

1. GitHub Pages is enabled.
2. Pages is configured for the `main` branch.
3. Pages is configured to use `/docs`.
4. GitHub Actions completed successfully.
5. `docs/tryhackme_badge.png` exists.

---

# 🤝 Contributing

Contributions are welcome.

You can contribute by:

- Reporting bugs
- Suggesting features
- Improving the badge design
- Improving the Firefox extension
- Improving the GitHub Actions workflow
- Improving documentation
- Submitting pull requests

---

# 📜 License

This project is licensed under the **MIT License**.

---

# 🙏 Credits

Inspired by GitHub profile stat trackers and LeetCode-style activity badges.

Built with:

- Firefox WebExtensions
- GitHub Apps
- GitHub OAuth
- GitHub API
- GitHub Actions
- GitHub Pages
- Python
- Pillow
- Cloudflare Workers
- TryHackMe public profile data

---

## ⭐ Support the Project

If you find THM Badge useful:

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest improvements
- 🔧 Submit pull requests

---

**THM Badge — Turn your TryHackMe progress into a GitHub badge.**
