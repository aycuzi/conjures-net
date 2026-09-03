const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDiscordOauth } = require("./discord-oauth");

function setup(responses) {
  let time = 0;
  const calls = [], waits = [];
  const oauth = createDiscordOauth({
    now: () => time,
    sleep: async (ms) => { waits.push(ms); time += ms; },
    log: () => {},
    fetchImpl: async (url, options) => {
      calls.push({ url, options, time });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.ok(response, "Unexpected extra request");
      return response;
    },
  });
  return { oauth, calls, waits };
}
const ok = () => new Response(JSON.stringify({ id: "user" }), { status: 200 });
const limit = (seconds, headers = {}) => new Response(JSON.stringify({ retry_after: seconds }), { status: 429, headers });

test("successful exchange makes exactly one request", async () => {
  const { oauth, calls } = setup([ok()]);
  assert.deepEqual(await oauth.request("/oauth2/token", { method: "POST", body: "same-code" }), { id: "user" });
  assert.equal(calls.length, 1);
});
test("429 honors the longest server delay and retries the same body", async () => {
  const { oauth, calls, waits } = setup([limit(1, { "retry-after": "2" }), ok()]);
  await oauth.request("/oauth2/token", { method: "POST", body: "same-code" });
  assert.deepEqual(waits, [2250]);
  assert.equal(calls[1].options.body, "same-code");
});
test("long cooldown fails promptly and blocks subsequent attempts", async () => {
  const { oauth, calls, waits } = setup([limit(60)]);
  for (let i = 0; i < 2; i++) await assert.rejects(oauth.request("/oauth2/token", {}), { code: "DISCORD_OAUTH_RATE_LIMITED" });
  assert.equal(calls.length, 1);
  assert.deepEqual(waits, []);
});
test("profile lookup also handles 429", async () => {
  const { oauth, calls } = setup([limit(0.5), ok()]);
  await oauth.request("/users/@me", { headers: { authorization: "Bearer test" } });
  assert.equal(calls.length, 2);
});
test("does not retry ambiguous network errors or invalid grants", async () => {
  for (const response of [new Error("fetch failed"), new Response("invalid_grant", { status: 400 })]) {
    const { oauth, calls } = setup([response]);
    await assert.rejects(oauth.request("/oauth2/token", {}));
    assert.equal(calls.length, 1);
  }
});
test("malformed 429 uses conservative cooldown, not rapid retries", async () => {
  const { oauth, calls } = setup([new Response("upstream limit", { status: 429 })]);
  await assert.rejects(oauth.request("/oauth2/token", {}), { code: "DISCORD_OAUTH_RATE_LIMITED" });
  assert.equal(calls.length, 1);
});
test("concurrent requests share cooldown and do not burst", async () => {
  const { oauth, calls } = setup([limit(1), ok(), ok()]);
  await Promise.all([oauth.request("/oauth2/token", {}), oauth.request("/oauth2/token", {})]);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].time >= 1250 && calls[2].time >= 1250);
});
test("retries are bounded", async () => {
  const { oauth, calls } = setup([limit(0.1), limit(0.1), limit(0.1)]);
  await assert.rejects(oauth.request("/oauth2/token", {}), { code: "DISCORD_OAUTH_RATE_LIMITED" });
  assert.equal(calls.length, 3);
});
