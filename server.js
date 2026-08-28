const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PUBLIC_URL = String(process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
const API_URL = String(process.env.CONJURES_API_URL || "https://api.conjures.net").replace(/\/$/, "");
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1517112878862176256";
const GROUP_ID = process.env.ROBLOX_GROUP_ID || "12287375";
const apiHeaders = {
  "x-api-key": process.env.CONJURES_API_KEY || "",
  "content-type": "application/json",
};

const FORMS = [
  ["hr", "HR Team Application", "HR Application", "HR TEAM", "#ff7eb6", "1542182045722214522", ["1536743365272404049", "1536743481114890360"]],
  ["relations", "Relations Board Application", "Relations Board Application", "RELATIONS TEAM", "#a879ff", "1542181718675562607", ["1536743365272404049", "1536743848955617280"]],
  ["hosting", "Hosting Team Application", "Hosting Team Application", "HOSTING TEAM", "#f04747", "1537701786767327302", ["1536744173083037806"]],
  ["moderation", "Moderation Team Application", "Moderation Team Application", "MODERATION TEAM", "#579dff", "1537701754723110942", ["1536744195023437834"]],
  ["events", "Events Team Application", "Events Team Application", "EVENTS TEAM", "#ff9f43", "1542181955578363985", ["1536743365272404049", "1536745884803661864"]],
  ["newsletter", "Newsletter Team Application", "Newsletter Team Application", "NEWSLETTER TEAM", "#f7d154", "1542181772291211386", ["1536743365272404049", "1536746008371920936"]],
  ["social", "Social Media Team Application", "Social Media Team Application", "SOCIAL MEDIA TEAM", "#58d68d", "1542181867451711588", ["1536743365272404049", "1536745953942315066"]],
];
const LOCKED_SECTION = {
  id: "information",
  title: "Information",
  description: "Your verified account information.",
  locked: true,
  questions: [
    {
      id: "roblox_username",
      title: "Roblox Username",
      type: "short",
      required: true,
      locked: true,
    },
    {
      id: "roblox_id",
      title: "Roblox ID",
      type: "short",
      required: true,
      locked: true,
    },
    {
      id: "discord_id",
      title: "Discord User ID",
      type: "short",
      required: true,
      locked: true,
    },
  ],
};
const EXAMS = [
  ["hr_hosting","HR Team (Hosting) Examination","HR TEAM","#ff7eb6","1542853017559244850",["1536743365272404049","1536743782387818611"]],
  ["hr_moderation","HR Team (Moderation) Examination","HR TEAM","#ff7eb6","1542853037754949672",["1536743365272404049","1536743820018843758"]],
  ["relations","Relations Board Examination","RELATIONS TEAM","#a879ff","1542853350880452698",["1536743365272404049","1536743848955617280"]],
  ["hosting","Hosting Team Examination","HOSTING TEAM","#f04747","1537701772284530698",["1536744173083037806"]],
  ["moderation","Moderation Team Examination","MODERATION TEAM","#579dff","1537701735961727056",["1536744195023437834"]],
  ["newsletter","Newsletter Team Examination","NEWSLETTER TEAM","#f7d154","1542853646222364672",["1536743365272404049","1536746008371920936"]],
  ["social","Social Media Team Examination","SOCIAL MEDIA TEAM","#58d68d","1542853801180930129",["1536743365272404049","1536745953942315066"]],
  ["events","Events Team Examination","EVENTS TEAM","#ff9f43","1542853869258678273",["1536743365272404049","1536745884803661864"]],
];
const EXAM_ROLE_IDS={"SR Team":"1520358345226321960","Hosting Lead":"1520360116459667566","Moderation Lead":"1520360168062451742","Relations Lead":"1520359445568290906","Events Lead":"1520360196579524711","Newsletter Lead":"1537363086162395146","Social Media Lead":"1520360171426152509","Hosting Executive":"1536642673006608424","Moderation Executive":"1536642685207580715","Relations Board":"1520359452669382799","Hosting Intern":"1520361131368120461","Moderation Intern":"1520361504354861176","Events Team":"1526961486617120818","Newsletter Team":"1537363092558717041","Social Media Team":"1526961462298542090"};

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const encode = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const sign = (v) =>
  crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "local-only")
    .update(v)
    .digest("base64url");
const token = (v) => {
  const body = encode(v);
  return `${body}.${sign(body)}`;
};
function readToken(input) {
  try {
    const [body, sig] = String(input || "").split(".");
    const expected = sign(body);
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return decoded.exp > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}
function cookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim().split(/=(.*)/s))
      .filter((x) => x[0])
      .map(([k, v]) => [k, decodeURIComponent(v || "")]),
  );
}
function setSession(res, profile) {
  res.setHeader("Set-Cookie", `conjures_session=${encodeURIComponent(token({ ...profile, exp: Date.now() + 12 * 60 * 60 * 1000 }))}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=43200`);
}
const pendingLoginTickets = new Map();
function completeLogin(res, profile) {
  const ticket = crypto.randomBytes(32).toString("base64url");
  pendingLoginTickets.set(ticket, { profile, expires: Date.now() + 60 * 1000 });
  res.redirect(`/auth/session?ticket=${encodeURIComponent(ticket)}`);
}
const id = () => crypto.randomUUID();
const safe = (value, max = 4000) =>
  String(value ?? "")
    .replace(/<@/g, "@\u200b")
    .slice(0, max);
async function api(route, options = {}) {
  const request = {
      ...options,
      headers: { ...apiHeaders, ...options.headers },
    },
    method = String(options.method || "GET").toUpperCase(),
    attempts = method === "GET" ? 3 : 1;
  let r;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      r = await fetch(`${API_URL}${route}`, {
        ...request,
        signal: AbortSignal.timeout(10_000),
      });
      break;
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text.slice(0, 160)}`);
  }
  return r.status === 204 ? null : r.json();
}
async function verification(query) {
  const rows = await api(`/tables/verifications?${new URLSearchParams(query)}&limit=1`);
  return rows[0] || null;
}
async function discord(pathname, options = {}) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const r = await fetch(`https://discord.com/api/v10${pathname}`, {
      ...options,
      headers: {
        authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        ...options.headers,
      },
    });
    if (r.ok) return r.status === 204 ? null : r.json();
    const body = await r.text();
    if (r.status === 429 && attempt < 5) {
      let retryAfter = 1;
      try {
        retryAfter = Number(JSON.parse(body).retry_after || 1);
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(retryAfter * 1000, 500), 15000)));
      continue;
    }
    if (r.status >= 500 && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      continue;
    }
    throw new Error(`Discord returned ${r.status}: ${body.slice(0, 180)}`);
  }
  throw new Error("Discord request retries exhausted");
}
async function rankFor(userId) {
  try {
    const r = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
    const data = await r.json();
    const membership = (data.data || []).find((x) => String(x.group?.id) === String(GROUP_ID));
    return {
      number: Number(membership?.role?.rank || 0),
      name: membership?.role?.name || "Not in the group",
    };
  } catch {
    return { number: 0, name: "Not in the group" };
  }
}
async function headshot(userId) {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    return (await r.json()).data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}
async function enrich(row) {
  const [member, roles, rank] = await Promise.all([discord(`/guilds/${GUILD_ID}/members/${row.discord_id}`).catch(() => null), discord(`/guilds/${GUILD_ID}/roles`).catch(() => []), rankFor(row.roblox_user_id)]);
  const names = new Set((member?.roles || []).map((roleId) => roles.find((r) => r.id === roleId)?.name).filter(Boolean));
  return {
    ...row,
    discordUsername: member?.user?.global_name || member?.user?.username || "Unknown",
    avatar: member?.user?.avatar,
    headshot: await headshot(row.roblox_user_id),
    roles: [...names],
    roleIds: member?.roles || [],
    rank,
  };
}
function editorAllowed(form, p) {
  const roles = new Set(p.roles || []);
  if (p.rank.number >= 250) return true;
  const map = {
    relations: "Relations Lead",
    hosting: "Hosting Lead",
    moderation: "Moderation Lead",
    events: "Events Lead",
    newsletter: "Newsletter Lead",
    social: "Social Media Lead",
  };
  if (form.id === "hr") return false;
  const role = map[form.id];
  return roles.has(role) && (["events", "newsletter", "social"].includes(form.id) || p.rank.number === 52);
}
function applyAllowed(form, p) {
  const r = new Set(p.roles || []);
  if (r.has("HR Team") && !["events", "newsletter", "social"].includes(form.id)) return false;
  if ((r.has("Hosting Team") || r.has("Moderation Team")) && ["hosting", "moderation", "relations"].includes(form.id)) return false;
  if (r.has("Relations Team") && ["relations", "hosting", "moderation", "hr"].includes(form.id)) return false;
  if (r.has("Events Team") && form.id === "events") return false;
  if (r.has("Newsletter Team") && form.id === "newsletter") return false;
  if (r.has("Social Media Team") && form.id === "social") return false;
  return true;
}
function hasExamRole(p,name){return new Set(p.roles||[]).has(name)||new Set(p.roleIds||[]).has(EXAM_ROLE_IDS[name]);}
function examAdmin(p) { return p.rank.number >= 250 && hasExamRole(p,"SR Team"); }
function examCanEdit(form, p) { if (examAdmin(p)) return true; const rules={hr_hosting:"Hosting Lead",hr_moderation:"Moderation Lead",relations:"Relations Lead",hosting:"Hosting Lead",moderation:"Moderation Lead",events:"Events Lead",newsletter:"Newsletter Lead",social:"Social Media Lead"},role=rules[form.id]; return hasExamRole(p,role) && (["events","newsletter","social"].includes(form.id)||p.rank.number===52); }
function examCanTake(form,p){if(examAdmin(p))return true;const rules={hr_hosting:[50,"Hosting Executive"],hr_moderation:[50,"Moderation Executive"],relations:[40,"Relations Board"],hosting:[30,"Hosting Intern"],moderation:[20,"Moderation Intern"],events:[null,"Events Team"],newsletter:[null,"Newsletter Team"],social:[null,"Social Media Team"]},rule=rules[form.id];return Boolean(rule&&hasExamRole(p,rule[1])&&(rule[0]==null||p.rank.number===rule[0]));}
async function current(req) {
  const session = readToken(cookies(req).conjures_session);
  if (!session) return null;
  const row = await verification({ discord_id: session.discordId }).catch(() => null);
  if (!row) return null;
  const blocked = await api(`/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`).catch(() => []);
  return { ...(await enrich(row)), siteBlacklisted: Boolean(blocked[0]) };
}
async function requireUser(req, res, next) {
  const user = await current(req);
  if (!user) return res.status(401).json({ error: "You must log in with a verified account." });
  if (user.siteBlacklisted) return res.status(403).json({ error: "Your account is blacklisted from this site." });
  req.user = user;
  next();
}
async function applicationState(user, applicationId) {
  if (!user) return { state: null, daysRemaining: 0 };
  const [blocked, past] = await Promise.all([api(`/tables/application_blacklists?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&limit=1`), api(`/tables/application_submissions?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&application_id=${encodeURIComponent(applicationId)}&order=submitted_at.desc`)]);
  if (blocked[0]) return { state: "blacklisted", daysRemaining: 0 };
  const stale = past.filter((x) => x.status === "pending" && !x.discord_message_id);
  for (const item of stale) await api(`/tables/application_submissions?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
  if (past.some((x) => x.status === "pending" && x.discord_message_id)) return { state: "pending", daysRemaining: 0 };
  const denial = past.find((x) => x.status === "denied" && Date.now() - new Date(x.decided_at || x.updated_at).getTime() < 7 * 86400000);
  if (denial) {
    const remaining = 7 * 86400000 - (Date.now() - new Date(denial.decided_at || denial.updated_at).getTime());
    return {
      state: "denied",
      daysRemaining: Math.max(1, Math.ceil(remaining / 86400000)),
    };
  }
  return { state: null, daysRemaining: 0 };
}
const submissionLocks = new Set();

async function seed() {
  for (const [formId, name, shortName, label, color, channel, roles] of FORMS) {
    const existing = await api(`/tables/application_forms?id=${formId}&limit=1`);
    if (existing.length) continue;
    await api("/tables/application_forms", {
      method: "POST",
      body: JSON.stringify({
        id: formId,
        name,
        short_name: shortName,
        team_label: label,
        team_color: color,
        description: "",
        is_open: false,
        schema_json: JSON.stringify([LOCKED_SECTION]),
        channel_id: channel,
        ping_role_ids: JSON.stringify(roles),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  }
}
async function seedExams(){for(const [examId,name,label,color,channel,roles] of EXAMS){const rows=await api(`/tables/exam_forms?id=${examId}&limit=1`);if(rows.length)continue;await api("/tables/exam_forms",{method:"POST",body:JSON.stringify({id:examId,name,team_label:label,team_color:color,description:"",schema_json:JSON.stringify([LOCKED_SECTION]),channel_id:channel,ping_role_ids:JSON.stringify(roles),created_at:new Date().toISOString(),updated_at:new Date().toISOString()})});}}
function examQuestions(form){return JSON.parse(form.schema_json||"[]").flatMap(section=>(section.questions||[]).filter(q=>!q.locked));}
function formatElapsed(seconds){const value=Math.max(0,Math.floor(seconds||0)),m=Math.floor(value/60),s=String(value%60).padStart(2,"0");return `${m}:${s}`;}
const examDeliveryLocks=new Set();
async function deliverExam(access,form,incomplete=false){if(examDeliveryLocks.has(access.id))return;examDeliveryLocks.add(access.id);try{const answers=JSON.parse(access.answers_json||"{}"),timings=JSON.parse(access.timings_json||"{}"),questions=examQuestions(form),thumbnail=await headshot(access.roblox_user_id),fields=[{name:"Roblox Username",value:safe(access.roblox_username,1024),inline:true},{name:"Roblox ID",value:access.roblox_user_id,inline:true},{name:"Discord ID",value:access.discord_id||"N/A",inline:true}];if(incomplete)fields.push({name:"Incomplete Examination",value:"This examination was not completed within the time period.",inline:false});for(const q of questions){const timer=Number(q.timerSeconds||0),used=Number(timings[q.id]||0),suffix=timer?` (${formatElapsed(used)}/${formatElapsed(timer)})`:"",answer=answers[q.id],display=Array.isArray(answer)?answer.join(", "):answer;fields.push({name:safe(`${q.title}${suffix}`,256),value:safe(display||"They did not answer this question.",1024),inline:false});}const embeds=[];for(let i=0;i<fields.length;i+=22)embeds.push({title:i?undefined:`${form.name}: ${access.roblox_username} (${access.roblox_user_id})`,...(i||!thumbnail?{}:{thumbnail:{url:thumbnail}}),fields:fields.slice(i,i+22)});const roleIds=JSON.parse(form.ping_role_ids||"[]"),content=roleIds.map(x=>`<@&${x}>`).join(" "),message=await discord(`/channels/${form.channel_id}/messages`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({content,embeds,allowed_mentions:{roles:roleIds}})});await discord(`/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_yes:1537731698245115936")}/@me`,{method:"PUT"});await discord(`/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_no:1537731724375498773")}/@me`,{method:"PUT"});await discord(`/channels/${form.channel_id}/messages/${message.id}/threads`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`${access.roblox_username} (${access.roblox_user_id}) - ${form.name}`,auto_archive_duration:1440})});await api(`/tables/exam_access?id=${encodeURIComponent(access.id)}`,{method:"DELETE"});}finally{examDeliveryLocks.delete(access.id);}}

app.get("/health", (_q, res) => res.json({ ok: true, service: "conjures-net" }));
app.get("/api/me", async (req, res) => {
  const user = await current(req);
  res.json(user ? (user.siteBlacklisted ? { authenticated: false, siteBlacklisted: true } : { authenticated: true, ...user }) : { authenticated: false });
});
app.get("/api/applications", async (req, res) => {
  try {
    await seed();
    const rawUser = await current(req),
      user = rawUser && !rawUser.siteBlacklisted ? rawUser : null;
    const forms = await api("/tables/application_forms?order=created_at.asc");
    const states = new Map(await Promise.all(forms.map(async (form) => [form.id, await applicationState(user, form.id)])));
    res.json(
      forms
        .filter((f) => f.is_open || (user && editorAllowed(f, user)))
        .map((f) => {
          const state = states.get(f.id);
          return { ...f, schema: JSON.parse(f.schema_json || "[]"), canEdit: Boolean(user && editorAllowed(f, user)), applicationState: state.state, daysRemaining: state.daysRemaining, canApply: Boolean(user && f.is_open && applyAllowed(f, user) && !state.state) };
        }),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Applications could not be loaded." });
  }
});
app.get("/api/applications/:id", async (req, res) => {
  try {
    const forms = await api(`/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`);
    const form = forms[0],
      rawUser = await current(req),
      user = rawUser && !rawUser.siteBlacklisted ? rawUser : null,
      state = await applicationState(user, req.params.id);
    if (!form || (!form.is_open && !user)) return res.status(404).json({ error: "Application not found." });
    res.json({
      ...form,
      schema: JSON.parse(form.schema_json || "[]"),
      canEdit: Boolean(user && editorAllowed(form, user)),
      applicationState: state.state,
      daysRemaining: state.daysRemaining,
      canApply: Boolean(user && form.is_open && applyAllowed(form, user) && !state.state),
      user,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/applications/:id", requireUser, async (req, res) => {
  try {
    const forms = await api(`/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`),
      form = forms[0];
    if (!form || !editorAllowed(form, req.user)) return res.status(403).json({ error: "You cannot edit this application." });
    const schema = Array.isArray(req.body.schema) ? req.body.schema : [];
    if (!schema[0]?.locked) return res.status(400).json({ error: "The Information section is required." });
    const updated = {
      ...form,
      description: safe(req.body.description, 12000),
      is_open: Boolean(req.body.isOpen),
      schema_json: JSON.stringify(schema).slice(0, 100000),
      updated_by_discord_id: req.user.discord_id,
      updated_at: new Date().toISOString(),
    };
    await api("/tables/application_forms", {
      method: "POST",
      body: JSON.stringify(updated),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/applications/:id/submit", requireUser, async (req, res) => {
  const lockKey = req.user.roblox_user_id;
  if (submissionLocks.has(lockKey)) return res.status(409).json({ error: "Your application is already being submitted." });
  submissionLocks.add(lockKey);
  try {
    const forms = await api(`/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`),
      form = forms[0];
    if (!form?.is_open) return res.status(409).json({ error: "This application is not open." });
    if (!applyAllowed(form, req.user)) return res.status(403).json({ error: "You are unable to apply." });
    const state = await applicationState(req.user, req.params.id);
    if (state.state === "blacklisted") return res.status(403).json({ error: "You are blacklisted from submitting applications." });
    if (state.state === "pending") return res.status(409).json({ error: "You already have a pending application." });
    if (state.state === "denied")
      return res.status(409).json({
        error: `You may apply again in ${state.daysRemaining} day${state.daysRemaining === 1 ? "" : "s"}.`,
      });
    const schema = JSON.parse(form.schema_json || "[]"),
      answers = req.body.answers || {};
    answers.roblox_username = req.user.roblox_username;
    answers.roblox_id = req.user.roblox_user_id;
    answers.discord_id = req.user.discord_id;
    for (const section of schema) for (const q of section.questions || []) if (q.required && !String(answers[q.id] ?? "").trim()) return res.status(400).json({ error: `${q.title} is required.` });
    const submission = {
      id: id(),
      application_id: form.id,
      roblox_user_id: req.user.roblox_user_id,
      roblox_username: req.user.roblox_username,
      discord_id: req.user.discord_id,
      answers_json: JSON.stringify(answers),
      status: "pending",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const fields = [
      {
        name: "Roblox Username",
        value: safe(req.user.roblox_username, 1024),
        inline: true,
      },
      { name: "Roblox ID", value: req.user.roblox_user_id, inline: true },
      { name: "Discord ID", value: req.user.discord_id, inline: true },
    ];
    for (const section of schema)
      for (const q of section.questions || [])
        if (!q.locked)
          fields.push({
            name: safe(q.title, 256),
            value: safe(Array.isArray(answers[q.id]) ? answers[q.id].join(", ") : answers[q.id] || "N/A", 1024),
            inline: false,
          });
    const thumbnail = await headshot(req.user.roblox_user_id),
      embeds = [];
    for (let i = 0; i < fields.length; i += 22)
      embeds.push({
        title: i ? undefined : `${form.short_name}: ${req.user.roblox_username} (${req.user.roblox_user_id})`,
        ...(i || !thumbnail ? {} : { thumbnail: { url: thumbnail } }),
        fields: fields.slice(i, i + 22),
      });
    const roleIds = JSON.parse(form.ping_role_ids || "[]"),
      content = roleIds.map((x) => `<@&${x}>`).join(" ");
    const message = await discord(`/channels/${form.channel_id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content,
        embeds,
        allowed_mentions: { roles: roleIds },
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: "Accept",
                custom_id: `application:accept:${submission.id}`,
              },
              {
                type: 2,
                style: 2,
                label: "Deny",
                custom_id: `application:deny:${submission.id}`,
              },
            ],
          },
        ],
      }),
    });
    await discord(`/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_yes:1537731698245115936")}/@me`, { method: "PUT" });
    await discord(`/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_no:1537731724375498773")}/@me`, { method: "PUT" });
    const thread = await discord(`/channels/${form.channel_id}/messages/${message.id}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `${req.user.roblox_username} (${req.user.roblox_user_id}) - ${form.short_name}`,
        auto_archive_duration: 1440,
      }),
    });
    submission.discord_message_id = message.id;
    submission.discord_thread_id = thread.id;
    submission.updated_at = new Date().toISOString();
    await api("/tables/application_submissions", {
      method: "POST",
      body: JSON.stringify(submission),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("[applications] submit failed", e);
    res.status(500).json({
      error: "Your application could not be submitted. Please try again.",
    });
  } finally {
    submissionLocks.delete(lockKey);
  }
});

async function normalizeExamAccess(access,form){if(!access)return null;const now=Date.now();if(new Date(access.expires_at).getTime()<=now){await deliverExam(access,form,true);return null;}if(!access.started_at)return access;const questions=examQuestions(form),answers=JSON.parse(access.answers_json||"{}"),timings=JSON.parse(access.timings_json||"{}"),original=Number(access.current_question||0);let index=original,started=new Date(access.question_started_at||access.started_at).getTime();while(index<questions.length){const limit=Number(questions[index].timerSeconds||0);if(!limit||started+limit*1000>now)break;timings[questions[index].id]=limit;index+=1;started+=limit*1000;}if(index>=questions.length){access.answers_json=JSON.stringify(answers);access.timings_json=JSON.stringify(timings);await deliverExam(access,form,false);return null;}if(index!==original){access.current_question=index;access.question_started_at=new Date(started).toISOString();access.timings_json=JSON.stringify(timings);access.updated_at=new Date().toISOString();await api("/tables/exam_access",{method:"POST",body:JSON.stringify(access)});}return access;}
async function getExamAccess(user,examId){const rows=await api(`/tables/exam_access?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&exam_id=${encodeURIComponent(examId)}&status=issued&order=generated_at.desc`);return rows[0]||null;}
app.get("/api/exams",requireUser,async(req,res)=>{try{await seedExams();const forms=await api("/tables/exam_forms?order=created_at.asc"),accessRows=await api(`/tables/exam_access?roblox_user_id=${encodeURIComponent(req.user.roblox_user_id)}&status=issued`),accessBy=new Map(accessRows.map(x=>[x.exam_id,x]));const output=[];for(const form of forms){let access=accessBy.get(form.id)||null;if(access)access=await normalizeExamAccess(access,form);const canEdit=examCanEdit(form,req.user);if(canEdit||access)output.push({...form,schema:JSON.parse(form.schema_json||"[]"),canEdit,hasAccess:Boolean(access),started:Boolean(access?.started_at),expiresAt:access?.expires_at||null});}res.json(output);}catch(e){console.error("[exams] list failed",e);res.status(500).json({error:"Examinations could not be loaded."});}});
app.get("/api/exams/:id",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0];if(!form)return res.status(404).json({error:"Examination not found."});let access=await getExamAccess(req.user,form.id);if(access)access=await normalizeExamAccess(access,form);const canEdit=examCanEdit(form,req.user);if(!canEdit&&!access)return res.status(403).json({error:"You do not have access to this examination."});res.json({...form,schema:JSON.parse(form.schema_json||"[]"),canEdit,hasAccess:Boolean(access),started:Boolean(access?.started_at),expiresAt:access?.expires_at||null,user:req.user});}catch(e){res.status(500).json({error:e.message});}});
app.put("/api/exams/:id",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0];if(!form||!examCanEdit(form,req.user))return res.status(403).json({error:"You cannot edit this examination."});const schema=Array.isArray(req.body.schema)?req.body.schema:[];if(!schema[0]?.locked)return res.status(400).json({error:"The Information section is required."});for(const section of schema)for(const q of section.questions||[]){const timer=Number(q.timerSeconds||0);if(timer<0||timer>86400)return res.status(400).json({error:"Question timers must be between 1 and 86,400 seconds."});q.timerSeconds=timer||0;}await api("/tables/exam_forms",{method:"POST",body:JSON.stringify({...form,description:safe(req.body.description,12000),schema_json:JSON.stringify(schema).slice(0,100000),updated_by_discord_id:req.user.discord_id,updated_at:new Date().toISOString()})});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/exams/:id/unlock",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0],access=await getExamAccess(req.user,req.params.id);if(!form||!access)return res.status(404).json({error:"No active examination was found."});if(!examCanTake(form,req.user))return res.status(403).json({error:"You no longer meet the requirements for this examination."});if(new Date(access.expires_at)<=new Date()){await deliverExam(access,form,true);return res.status(410).json({error:"This examination code has expired."});}const hash=crypto.createHash("sha256").update(String(req.body.code||"")).digest("hex");if(hash!==access.code_hash)return res.status(403).json({error:"The examination code is invalid."});if(!access.started_at){const now=new Date().toISOString();access.started_at=now;access.question_started_at=now;access.status="issued";access.updated_at=now;await api("/tables/exam_access",{method:"POST",body:JSON.stringify(access)});}res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.get("/api/exams/:id/progress",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0];let access=form?await getExamAccess(req.user,form.id):null;if(!form||!access)return res.status(404).json({error:"No active examination was found."});access=await normalizeExamAccess(access,form);if(!access)return res.status(410).json({error:"This examination has concluded."});if(!access.started_at)return res.json({locked:true});const questions=examQuestions(form),q=questions[access.current_question],answers=JSON.parse(access.answers_json||"{}"),limit=Number(q.timerSeconds||0);res.json({locked:false,index:access.current_question,total:questions.length,question:q,draft:answers[q.id]||"",deadline:limit?new Date(new Date(access.question_started_at).getTime()+limit*1000).toISOString():null,expiresAt:access.expires_at});}catch(e){res.status(500).json({error:e.message});}});
app.patch("/api/exams/:id/draft",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0];let access=form?await getExamAccess(req.user,form.id):null;if(!form||!access||!access.started_at)return res.status(404).json({error:"No active examination was found."});access=await normalizeExamAccess(access,form);if(!access)return res.status(410).json({error:"This examination has concluded."});const q=examQuestions(form)[access.current_question];if(req.body.questionId!==q.id)return res.json({ok:true,advanced:true});const answers=JSON.parse(access.answers_json||"{}");answers[q.id]=req.body.answer;access.answers_json=JSON.stringify(answers).slice(0,100000);access.updated_at=new Date().toISOString();await api("/tables/exam_access",{method:"POST",body:JSON.stringify(access)});res.json({ok:true,advanced:false});}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/exams/:id/next",requireUser,async(req,res)=>{try{const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`))[0];let access=form?await getExamAccess(req.user,form.id):null;if(!form||!access||!access.started_at)return res.status(404).json({error:"No active examination was found."});access=await normalizeExamAccess(access,form);if(!access)return res.status(410).json({error:"This examination has concluded."});const questions=examQuestions(form),q=questions[access.current_question],answer=req.body.answer;if(q.required&&!(Array.isArray(answer)?answer.length:String(answer??"").trim()))return res.status(400).json({error:"This question is required."});const answers=JSON.parse(access.answers_json||"{}"),timings=JSON.parse(access.timings_json||"{}"),elapsed=Math.max(0,Math.floor((Date.now()-new Date(access.question_started_at).getTime())/1000));answers[q.id]=answer;timings[q.id]=Number(q.timerSeconds||0)?Math.min(elapsed,Number(q.timerSeconds)):elapsed;access.answers_json=JSON.stringify(answers);access.timings_json=JSON.stringify(timings);access.current_question+=1;access.question_started_at=new Date().toISOString();access.updated_at=access.question_started_at;if(access.current_question>=questions.length){await deliverExam(access,form,false);return res.json({complete:true});}await api("/tables/exam_access",{method:"POST",body:JSON.stringify(access)});res.json({complete:false});}catch(e){console.error("[exams] next failed",e);res.status(500).json({error:e.message});}});

async function processExpiredExams(){try{const rows=await api("/tables/exam_access?status=issued"),expired=rows.filter(x=>new Date(x.expires_at)<=new Date());for(const access of expired){const form=(await api(`/tables/exam_forms?id=${encodeURIComponent(access.exam_id)}&limit=1`))[0];if(form)await deliverExam(access,form,true);}}catch(e){console.warn("[exams] expiry processor failed -",e.message);}}
setInterval(processExpiredExams,60*1000).unref();

const pendingOauthStates = new Map();
function pruneOauthStates() {
  const now = Date.now();
  for (const [nonce, state] of pendingOauthStates) if (state.expires <= now) pendingOauthStates.delete(nonce);
}
function beginOauth(_res, provider) {
  pruneOauthStates();
  const nonce = crypto.randomBytes(32).toString("base64url");
  pendingOauthStates.set(nonce, {
    provider,
    expires: Date.now() + 10 * 60 * 1000,
  });
  return nonce;
}
function validateOauth(req, _res, provider) {
  pruneOauthStates();
  const nonce = String(req.query.state || ""),
    state = pendingOauthStates.get(nonce);
  if (!state || state.provider !== provider || !req.query.code) return false;
  pendingOauthStates.delete(nonce);
  return true;
}
app.get("/auth/discord", (req, res) => {
  const redirect = `${PUBLIC_URL}/auth/discord/callback`,
    state = beginOauth(res, "discord");
  res.redirect(`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=identify&state=${encodeURIComponent(state)}`);
});
app.get("/auth/discord/callback", async (req, res) => {
  try {
    if (!validateOauth(req, res, "discord")) throw new Error("invalid oauth state");
    const redirect = `${PUBLIC_URL}/auth/discord/callback`;
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: String(req.query.code),
      redirect_uri: redirect,
    });
    const tr = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tr.ok) throw new Error(`discord token exchange failed (${tr.status})`);
    const access = await tr.json();
    const ur = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { authorization: `Bearer ${access.access_token}` },
    });
    if (!ur.ok) throw new Error(`discord profile lookup failed (${ur.status})`);
    const du = await ur.json();
    const row = await verification({ discord_id: du.id });
    if (!row) return res.redirect("/?error=verification_required");
    const blocked = await api(`/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`);
    if (blocked[0]) return res.redirect("/?error=site_blacklisted");
    completeLogin(res, {
      discordId: row.discord_id,
      robloxId: row.roblox_user_id,
    });
  } catch (error) {
    console.warn("[oauth] Discord login failed -", error.message);
    res.redirect("/?error=login_failed");
  }
});
app.get("/auth/roblox", (req, res) => {
  const redirect = `${PUBLIC_URL}/auth/roblox/callback`,
    state = beginOauth(res, "roblox");
  res.redirect(`https://apis.roblox.com/oauth/v1/authorize?client_id=${encodeURIComponent(process.env.ROBLOX_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirect)}&scope=openid%20profile&response_type=code&state=${encodeURIComponent(state)}`);
});
app.get("/auth/roblox/callback", async (req, res) => {
  try {
    if (!validateOauth(req, res, "roblox")) throw new Error("invalid oauth state");
    const redirect = `${PUBLIC_URL}/auth/roblox/callback`;
    const basic = Buffer.from(`${process.env.ROBLOX_CLIENT_ID}:${process.env.ROBLOX_CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: String(req.query.code),
      redirect_uri: redirect,
    });
    const tr = await fetch("https://apis.roblox.com/oauth/v1/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!tr.ok) throw new Error(`roblox token exchange failed (${tr.status})`);
    const access = await tr.json();
    const ur = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: { authorization: `Bearer ${access.access_token}` },
    });
    if (!ur.ok) throw new Error(`roblox profile lookup failed (${ur.status})`);
    const ru = await ur.json();
    if (!ru.sub) throw new Error("roblox profile missing id");
    const row = await verification({ roblox_user_id: String(ru.sub) });
    if (!row) return res.redirect("/?error=verification_required");
    const blocked = await api(`/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`);
    if (blocked[0]) return res.redirect("/?error=site_blacklisted");
    completeLogin(res, {
      discordId: row.discord_id,
      robloxId: row.roblox_user_id,
    });
  } catch (error) {
    console.warn("[oauth] Roblox login failed -", error.message);
    res.redirect("/?error=login_failed");
  }
});
app.get("/auth/session", (req, res) => {
  const now = Date.now();
  for (const [key, value] of pendingLoginTickets) if (value.expires <= now) pendingLoginTickets.delete(key);
  const ticket = String(req.query.ticket || ""),
    entry = pendingLoginTickets.get(ticket);
  if (!entry) return res.redirect("/?error=login_failed");
  pendingLoginTickets.delete(ticket);
  setSession(res, entry.profile);
  res.redirect("/dashboard");
});
app.get("/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "conjures_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.redirect("/");
});
app.get(["/dashboard", "/applications", "/applications/:id", "/applications/:id/edit", "/exams", "/exams/:id", "/exams/:id/edit", "/terms", "/privacy"], (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`[conjures-net] ready on ${port}`));
