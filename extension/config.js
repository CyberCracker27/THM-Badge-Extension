/* Public configuration only. NEVER put the GitHub App client secret here. */
const THM_BADGE_CONFIG = Object.freeze({
    githubClientId: 'Iv23liOIOIy5wPEy1ngW',
    githubAppSlug: 'thm-badge',
    githubApiVersion: '2022-11-28',

    // Deploy backend/oauth-worker.js and put its HTTPS URL here.
    oauthBackendUrl: 'https://thm-badge-oauth.goldenking2734.workers.dev'
});
