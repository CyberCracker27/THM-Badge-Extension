const THM_BADGE_CONFIG = Object.freeze({
    githubClientId: 'Iv23liOIOIy5wPEy1ngW',
    githubAppSlug: 'thm-badge',
    githubApiVersion: '2022-11-28',
    oauthBackendUrl: 'https://thm-badge-oauth.goldenking2734.workers.dev'
});
const GITHUB_API = 'https://api.github.com';
const GITHUB_LOGIN = 'https://github.com';
const THM_API =
    'https://tryhackme.com/api/v2/public-profile';

const api = globalThis.browser ?? globalThis.chrome;


/* =========================================================
   GitHub helpers
   ========================================================= */

function githubHeaders(
    token,
    includeContentType = false
) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version':
            THM_BADGE_CONFIG.githubApiVersion
    };

    if (includeContentType) {
        headers['Content-Type'] =
            'application/json';
    }

    return headers;
}


const storageGet = (keys) =>
    api.storage.local.get(keys);

const storageSet = (values) =>
    api.storage.local.set(values);


/* =========================================================
   Random / PKCE helpers
   ========================================================= */

function randomBytes(length) {
    const bytes =
        new Uint8Array(length);

    crypto.getRandomValues(bytes);

    return bytes;
}


function base64Url(bytes) {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}


function randomString(length = 64) {
    return base64Url(
        randomBytes(length)
    ).slice(0, length);
}


async function sha256Base64Url(value) {
    const data =
        new TextEncoder().encode(value);

    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            data
        );

    return base64Url(
        new Uint8Array(digest)
    );
}


/* =========================================================
   Configuration
   ========================================================= */

function isConfigured() {
    return Boolean(
        THM_BADGE_CONFIG.githubClientId &&
        THM_BADGE_CONFIG.githubAppSlug &&
        THM_BADGE_CONFIG.oauthBackendUrl &&
        !THM_BADGE_CONFIG.oauthBackendUrl.includes(
            'YOUR-OAUTH-BACKEND'
        )
    );
}


/* =========================================================
   Generic GitHub API
   ========================================================= */

async function githubJson(
    url,
    options = {}
) {
    const response =
        await fetch(url, options);

    let body = null;

    try {
        body = await response.json();
    } catch (_) {
        // Response may not contain JSON.
    }

    if (!response.ok) {
        throw new Error(
            `GitHub: ${
                body?.message ||
                `HTTP ${response.status}`
            }`
        );
    }

    return body;
}


/* =========================================================
   OAuth backend API
   ========================================================= */

async function backendJson(
    path,
    body
) {
    const response =
        await fetch(
            `${THM_BADGE_CONFIG.oauthBackendUrl}${path}`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json',

                    Accept:
                        'application/json'
                },

                body:
                    JSON.stringify(body)
            }
        );

    let data = null;

    try {
        data = await response.json();
    } catch (_) {
        // Response may not contain JSON.
    }

    if (!response.ok) {
        throw new Error(
            data?.error ||
            `OAuth backend error: HTTP ${response.status}`
        );
    }

    return data;
}


/* =========================================================
   GitHub Authentication
   ========================================================= */

async function authenticateGitHub() {
    if (!isConfigured()) {
        throw new Error(
            'OAuth backend is not configured. ' +
            'Check extension/config.js.'
        );
    }

    const redirectUri =
        api.identity.getRedirectURL();

    const state =
        randomString(48);

    const verifier =
        randomString(96);

    const challenge =
        await sha256Base64Url(
            verifier
        );


    /*
     * Save OAuth state and PKCE verifier
     * before opening GitHub.
     */

    await storageSet({
        oauthState: state,
        oauthVerifier: verifier
    });


    const params =
        new URLSearchParams({
            client_id:
                THM_BADGE_CONFIG.githubClientId,

            redirect_uri:
                redirectUri,

            state,

            code_challenge:
                challenge,

            code_challenge_method:
                'S256',

            allow_signup:
                'true'
        });


    const callbackUrl =
        await api.identity.launchWebAuthFlow({
            url:
                `${GITHUB_LOGIN}/login/oauth/authorize?${params.toString()}`,

            interactive:
                true
        });


    const callback =
        new URL(callbackUrl);

    const returnedState =
        callback.searchParams.get(
            'state'
        );

    const code =
        callback.searchParams.get(
            'code'
        );

    const error =
        callback.searchParams.get(
            'error'
        );


    const saved =
        await storageGet([
            'oauthState',
            'oauthVerifier'
        ]);


    /*
     * Clear temporary OAuth values.
     */

    await storageSet({
        oauthState: null,
        oauthVerifier: null
    });


    if (error) {
        throw new Error(
            callback.searchParams.get(
                'error_description'
            ) ||
            `GitHub authorization failed: ${error}`
        );
    }


    if (!code) {
        throw new Error(
            'GitHub did not return an authorization code.'
        );
    }


    if (
        !saved.oauthState ||
        returnedState !== saved.oauthState
    ) {
        throw new Error(
            'GitHub authorization state validation failed. ' +
            'Please try again.'
        );
    }


    if (!saved.oauthVerifier) {
        throw new Error(
            'PKCE verifier was lost. Please try again.'
        );
    }


    /*
     * Exchange authorization code
     * through the Cloudflare Worker.
     */

    const token =
        await backendJson(
            '/auth/github',
            {
                code,

                code_verifier:
                    saved.oauthVerifier,

                redirect_uri:
                    redirectUri
            }
        );


    if (!token.access_token) {
        throw new Error(
            'OAuth backend did not return an access token.'
        );
    }


    /*
     * Get authenticated GitHub user.
     */

    const user =
        await githubJson(
            `${GITHUB_API}/user`,
            {
                headers:
                    githubHeaders(
                        token.access_token
                    )
            }
        );


    /*
     * Save GitHub session.
     */

    await storageSet({
        githubToken:
            token.access_token,

        githubUsername:
            user.login,

        githubAvatarUrl:
            user.avatar_url || '',

        githubTokenExpiresAt:
            token.expires_in
                ? Date.now() +
                  token.expires_in * 1000
                : null,

        githubRefreshToken:
            token.refresh_token ||
            null,

        githubRefreshTokenExpiresAt:
            token.refresh_token_expires_in
                ? Date.now() +
                  token.refresh_token_expires_in *
                      1000
                : null,

        lastError:
            null
    });


    return user;
}


/* =========================================================
   Refresh GitHub OAuth token
   ========================================================= */

async function refreshGitHubToken() {
    const saved =
        await storageGet([
            'githubRefreshToken'
        ]);


    if (!saved.githubRefreshToken) {
        return false;
    }


    try {
        const data =
            await backendJson(
                '/auth/refresh',
                {
                    refresh_token:
                        saved.githubRefreshToken
                }
            );


        if (!data.access_token) {
            return false;
        }


        await storageSet({
            githubToken:
                data.access_token,

            githubTokenExpiresAt:
                data.expires_in
                    ? Date.now() +
                      data.expires_in * 1000
                    : null,

            githubRefreshToken:
                data.refresh_token ||
                saved.githubRefreshToken,

            githubRefreshTokenExpiresAt:
                data.refresh_token_expires_in
                    ? Date.now() +
                      data.refresh_token_expires_in *
                          1000
                    : null
        });


        return true;

    } catch (_) {
        return false;
    }
}


/* =========================================================
   Get valid GitHub token
   ========================================================= */

async function getValidToken() {
    const saved =
        await storageGet([
            'githubToken',
            'githubTokenExpiresAt'
        ]);


    if (!saved.githubToken) {
        throw new Error(
            'Connect GitHub first.'
        );
    }


    /*
     * Refresh token 5 minutes before expiry.
     */

    if (
        saved.githubTokenExpiresAt &&
        Date.now() >
            saved.githubTokenExpiresAt -
                5 * 60 * 1000
    ) {
        const refreshed =
            await refreshGitHubToken();


        if (!refreshed) {
            throw new Error(
                'GitHub session expired. ' +
                'Please connect GitHub again.'
            );
        }


        const updated =
            await storageGet([
                'githubToken'
            ]);


        return updated.githubToken;
    }


    return saved.githubToken;
}


/* =========================================================
   TryHackMe API
   ========================================================= */

async function fetchTHMData(username) {

    /*
     * Check if TryHackMe has recently
     * rate-limited this extension.
     */

    const saved =
        await storageGet([
            'thmRateLimitedUntil'
        ]);


    if (
        saved.thmRateLimitedUntil &&
        Date.now() <
            saved.thmRateLimitedUntil
    ) {
        const remaining =
            Math.ceil(
                (
                    saved.thmRateLimitedUntil -
                    Date.now()
                ) / 60000
            );


        throw new Error(
            'TryHackMe is temporarily rate-limiting requests. ' +
            `Please try again in about ${remaining} minute(s).`
        );
    }


    const url =
        `${THM_API}?username=${encodeURIComponent(username)}`;


    let response;


    try {
        response =
            await fetch(
                url,
                {
                    headers: {
                        Accept:
                            'application/json'
                    },

                    cache:
                        'no-store'
                }
            );

    } catch (error) {

        throw new Error(
            'Unable to connect to TryHackMe: ' +
            (
                error instanceof Error
                    ? error.message
                    : String(error)
            )
        );
    }


    /*
     * Handle HTTP 429.
     */

    if (response.status === 429) {

        const retryAfter =
            response.headers.get(
                'Retry-After'
            );


        let retrySeconds =
            3600;


        if (retryAfter) {

            const parsed =
                Number.parseInt(
                    retryAfter,
                    10
                );


            if (
                Number.isFinite(parsed) &&
                parsed > 0
            ) {
                retrySeconds =
                    parsed;
            }
        }


        /*
         * Never store a cooldown
         * longer than 24 hours.
         */

        retrySeconds =
            Math.min(
                retrySeconds,
                24 * 60 * 60
            );


        const retryUntil =
            Date.now() +
            retrySeconds * 1000;


        await storageSet({
            thmRateLimitedUntil:
                retryUntil
        });


        throw new Error(
            'TryHackMe is temporarily rate-limiting requests. ' +
            'Please try again later.'
        );
    }


    /*
     * Other HTTP errors.
     */

    if (!response.ok) {

        throw new Error(
            `TryHackMe API error: HTTP ${response.status}`
        );
    }


    /*
     * Parse JSON.
     */

    let data;


    try {
        data =
            await response.json();

    } catch (_) {

        throw new Error(
            'TryHackMe returned an invalid JSON response.'
        );
    }


    /*
     * Validate response.
     */

    if (
        !data ||
        data.status === 'error' ||
        !data.data
    ) {

        throw new Error(
            'TryHackMe returned an invalid profile response. ' +
            'Check the username.'
        );
    }


    /*
     * Successful request.
     */

    await storageSet({
        lastData:
            data,

        lastTHMFetch:
            Date.now(),

        thmRateLimitedUntil:
            null
    });


    return data;
}


/* =========================================================
   Base64 UTF-8 encoder
   ========================================================= */

function toBase64Utf8(value) {

    const bytes =
        new TextEncoder().encode(
            value
        );


    let binary = '';


    for (
        let i = 0;
        i < bytes.length;
        i += 0x8000
    ) {
        binary +=
            String.fromCharCode(
                ...bytes.subarray(
                    i,
                    i + 0x8000
                )
            );
    }


    return btoa(binary);
}


/* =========================================================
   GitHub App repositories
   ========================================================= */

async function listRepositories() {

    const token =
        await getValidToken();


    /*
     * Get GitHub App installations
     * available to the authenticated user.
     */

    const installations =
        await githubJson(
            `${GITHUB_API}/user/installations?per_page=100`,
            {
                headers:
                    githubHeaders(token)
            }
        );


    /*
     * Find THM Badge installation.
     */

    const installation =
        (
            installations.installations ||
            []
        ).find(
            item =>
                String(
                    item.app_slug || ''
                ).toLowerCase() ===
                THM_BADGE_CONFIG.githubAppSlug
                    .toLowerCase()
        );


    if (!installation) {

        throw new Error(
            'THM Badge is not installed. ' +
            'Click “Install / manage GitHub App”, ' +
            'choose a repository, then refresh.'
        );
    }


    const repositories = [];


    /*
     * GitHub returns repositories
     * in pages of up to 100.
     */

    for (
        let page = 1;
        page <= 10;
        page++
    ) {

        const result =
            await githubJson(
                `${GITHUB_API}/user/installations/${installation.id}/repositories?per_page=100&page=${page}`,
                {
                    headers:
                        githubHeaders(token)
                }
            );


        const batch =
            Array.isArray(
                result.repositories
            )
                ? result.repositories
                : [];


        repositories.push(
            ...batch
        );


        if (
            batch.length < 100
        ) {
            break;
        }
    }


    /*
     * Return usable repositories only.
     */

    return repositories
        .filter(
            repo =>
                !repo.archived &&
                !repo.disabled
        )
        .map(
            repo => ({
                id:
                    repo.id,

                fullName:
                    repo.full_name,

                owner:
                    repo.owner?.login ||
                    repo.full_name.split('/')[0],

                name:
                    repo.name,

                private:
                    Boolean(
                        repo.private
                    ),

                defaultBranch:
                    repo.default_branch ||
                    'main'
            })
        );
}


/* =========================================================
   Verify selected repository
   ========================================================= */

async function verifyRepository(
    token,
    owner,
    repo
) {

    const repository =
        await githubJson(
            `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            {
                headers:
                    githubHeaders(token)
            }
        );


    if (
        repository.archived ||
        repository.disabled
    ) {

        throw new Error(
            'The selected GitHub repository is unavailable for updates.'
        );
    }


    return repository;
}


/* =========================================================
   Commit data.json to GitHub
   ========================================================= */

async function commitDataToGitHub(
    data,
    token,
    owner,
    repo
) {

    /*
     * Make sure repository exists
     * and is available.
     */

    await verifyRepository(
        token,
        owner,
        repo
    );


    const url =
        `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.json`;


    const headers =
        githubHeaders(
            token,
            true
        );


    let sha;


    /*
     * Check whether data.json already exists.
     */

    const existing =
        await fetch(
            url,
            {
                headers
            }
        );


    if (existing.ok) {

        const existingData =
            await existing.json();

        sha =
            existingData.sha;

    } else if (
        existing.status !== 404
    ) {

        throw new Error(
            `GitHub file check failed: HTTP ${existing.status}`
        );
    }


    /*
     * GitHub Contents API request body.
     */

    const body = {
        message:
            'Update THM stats from extension',

        content:
            toBase64Utf8(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ),

        ...(sha
            ? { sha }
            : {})
    };


    /*
     * Update or create data.json.
     */

    const response =
        await fetch(
            url,
            {
                method:
                    'PUT',

                headers,

                body:
                    JSON.stringify(body)
            }
        );


    if (!response.ok) {

        if (
            response.status === 409
        ) {

            throw new Error(
                'GitHub rejected the update because data.json changed at the same time. ' +
                'Try again.'
            );
        }


        let message = '';


        try {

            message =
                (
                    await response.json()
                ).message || '';

        } catch (_) {
            // Ignore invalid JSON.
        }


        throw new Error(
            `GitHub commit failed: HTTP ${response.status}` +
            (
                message
                    ? ` — ${message}`
                    : ''
            )
        );
    }


    return response.json();
}


/* =========================================================
   UPDATE BADGE
   ========================================================= */

async function updateBadge() {

    /*
     * Load saved configuration.
     */

    const config =
        await storageGet([
            'repoOwner',
            'repoName',
            'thmUsername'
        ]);


    /*
     * Make sure setup is complete.
     */

    if (
        !config.repoOwner ||
        !config.repoName ||
        !config.thmUsername
    ) {

        throw new Error(
            'Finish setup first: select a GitHub repository ' +
            'and enter your TryHackMe username.'
        );
    }


    /*
     * Get a valid GitHub OAuth token.
     */

    const token =
        await getValidToken();


    /*
     * IMPORTANT:
     *
     * Every call to updateBadge()
     * performs a fresh TryHackMe request.
     *
     * Therefore:
     *
     * Manual button = fresh update
     * Firefox startup = fresh update
     */

    const data =
        await fetchTHMData(
            config.thmUsername
        );


    /*
     * Write the fresh data to GitHub.
     */

    await commitDataToGitHub(
        data,
        token,
        config.repoOwner,
        config.repoName
    );


    /*
     * Save local state.
     */

    await storageSet({
        lastData:
            data,

        lastUpdate:
            Date.now(),

        lastError:
            null
    });


    return data;
}


/* =========================================================
   Run update safely
   ========================================================= */

async function runUpdate() {

    try {

        const data =
            await updateBadge();


        return {
            success:
                true,

            data
        };

    } catch (error) {

        const message =
            error instanceof Error
                ? error.message
                : String(error);


        console.error(
            'THM badge update failed:',
            error
        );


        await storageSet({
            lastError:
                message
        });


        return {
            success:
                false,

            error:
                message
        };
    }
}


/* =========================================================
   FIREFOX STARTUP UPDATE
   ========================================================= */

/*
 * This runs when Firefox starts.
 *
 * There is NO recurring alarm.
 *
 * It will not run every 30 minutes.
 */

api.runtime.onStartup.addListener(
    async () => {

        try {

            /*
             * Check whether the extension
             * has enough configuration.
             */

            const config =
                await storageGet([
                    'githubToken',
                    'repoOwner',
                    'repoName',
                    'thmUsername'
                ]);


            /*
             * Don't automatically attempt
             * an update before setup is complete.
             */

            if (
                !config.githubToken ||
                !config.repoOwner ||
                !config.repoName ||
                !config.thmUsername
            ) {

                console.log(
                    'THM Badge: setup incomplete. ' +
                    'Skipping startup update.'
                );

                return;
            }


            console.log(
                'THM Badge: Firefox started. ' +
                'Updating badge...'
            );


            await runUpdate();

        } catch (error) {

            console.error(
                'THM Badge startup update failed:',
                error
            );
        }
    }
);


/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

api.runtime.onMessage.addListener(
    (
        message,
        sender,
        sendResponse
    ) => {

        (async () => {

            try {

                /*
                 * GitHub OAuth
                 */

                if (
                    message.action ===
                    'authenticateGitHub'
                ) {

                    sendResponse({
                        success:
                            true,

                        user:
                            await authenticateGitHub()
                    });

                    return;
                }


                /*
                 * List GitHub repositories
                 */

                if (
                    message.action ===
                    'listRepositories'
                ) {

                    sendResponse({
                        success:
                            true,

                        repositories:
                            await listRepositories()
                    });

                    return;
                }


                /*
                 * MANUAL UPDATE
                 *
                 * This is called when the
                 * user clicks "Update Badge".
                 */

                if (
                    message.action ===
                    'manualUpdate'
                ) {

                    console.log(
                        'THM Badge: manual update requested.'
                    );


                    const result =
                        await runUpdate();


                    sendResponse(
                        result
                    );

                    return;
                }


                /*
                 * Logout
                 */

                if (
                    message.action ===
                    'logout'
                ) {

                    await storageSet({

                        githubToken:
                            null,

                        githubUsername:
                            null,

                        githubAvatarUrl:
                            null,

                        githubTokenExpiresAt:
                            null,

                        githubRefreshToken:
                            null,

                        githubRefreshTokenExpiresAt:
                            null,

                        oauthState:
                            null,

                        oauthVerifier:
                            null,

                        repoOwner:
                            null,

                        repoName:
                            null,

                        repoId:
                            null,

                        lastData:
                            null,

                        lastUpdate:
                            null,

                        lastError:
                            null,

                        thmRateLimitedUntil:
                            null,

                        lastTHMFetch:
                            null
                    });


                    sendResponse({
                        success:
                            true
                    });

                    return;
                }


                /*
                 * Unknown message
                 */

                sendResponse({
                    success:
                        false,

                    error:
                        'Unknown action.'
                });


            } catch (error) {

                const text =
                    error instanceof Error
                        ? error.message
                        : String(error);


                await storageSet({
                    lastError:
                        text,

                    oauthState:
                        null,

                    oauthVerifier:
                        null
                });


                sendResponse({
                    success:
                        false,

                    error:
                        text
                });
            }

        })();


        /*
         * Keep the message channel open
         * for the asynchronous response.
         */

        return true;
    }
);
