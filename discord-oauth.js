// Only retry explicit 429 responses. An ambiguous timeout/network failure may
// have consumed the single-use authorization code, so must not be replayed.
function createDiscordOauth({ fetchImpl = fetch, now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log = console.warn, maxWaitMs = 12000 } = {}) {
  const cooldowns = new Map();
  const queues = new Map();
  let globalUntil = 0;
  function limited(until) {
    const error = new Error("Discord login is temporarily rate limited");
    error.code = "DISCORD_OAUTH_RATE_LIMITED";
    error.retryAfter = Math.max(1, Math.ceil((until - now()) / 1000));
    return error;
  }
  async function request(route, options) {
    const deadline = now() + maxWaitMs;
    // A token-route cooldown applies to every login handled by this process.
    const previous = queues.get(route) || Promise.resolve();
    let release;
    const lock = new Promise((resolve) => { release = resolve; });
    const tail = previous.then(() => lock);
    queues.set(route, tail);
    await previous;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const until = Math.max(cooldowns.get(route) || 0, globalUntil);
        if (until > deadline || now() > deadline) throw limited(Math.max(until, now() + 1000));
        if (until > now()) await sleep(until - now());
        const response = await fetchImpl(`https://discord.com/api/v10${route}`, { ...options, signal: AbortSignal.timeout(10000) });
        if (response.ok) return response.json();
        if (response.status !== 429) throw new Error(`Discord OAuth ${route === "/oauth2/token" ? "token exchange" : "profile lookup"} failed (${response.status})`);
        let data = {};
        try { data = await response.json(); } catch {}
        const header = response.headers.get("retry-after");
        const seconds = [];
        if (header !== null) {
          const numeric = Number(header);
          const value = Number.isFinite(numeric) ? numeric : (Date.parse(header) - now()) / 1000;
          if (Number.isFinite(value) && value >= 0) seconds.push(value);
        }
        if (data.retry_after != null && Number.isFinite(Number(data.retry_after)) && Number(data.retry_after) >= 0) seconds.push(Number(data.retry_after));
        const delay = Math.max(250, (seconds.length ? Math.max(...seconds) : 60) * 1000) + 250;
        const retryAt = now() + delay;
        cooldowns.set(route, retryAt);
        if (data.global || response.headers.get("x-ratelimit-global") === "true") globalUntil = Math.max(globalUntil, retryAt);
        // Never log OAuth codes, tokens, credentials, or response bodies.
        log(`[oauth] Discord 429 route=${route} attempt=${attempt} retryAfterSeconds=${Math.ceil(delay / 1000)} scope=${response.headers.get("x-ratelimit-scope") || "unknown"}`);
        if (attempt === 3 || retryAt > deadline) throw limited(retryAt);
      }
    } finally {
      release();
      if (queues.get(route) === tail) queues.delete(route);
    }
  }
  return { request };
}

module.exports = { createDiscordOauth };
