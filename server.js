const express = require("express");
const crypto = require("crypto");
const path = require("path");
const discordOauth = require("./discord-oauth").createDiscordOauth();

const app = express();
const PUBLIC_URL = String(
  process.env.PUBLIC_URL || "http://localhost:3000",
).replace(/\/$/, "");
const API_URL = String(
  process.env.CONJURES_API_URL || "https://api.conjures.net",
).replace(/\/$/, "");
// Site permissions are always sourced from the CONJURES guild. Do not allow a
// shared/departments deployment variable to silently point authorization at a
// different server.
const GUILD_ID = "1517112878862176256";
const GROUP_ID = process.env.ROBLOX_GROUP_ID || "12287375";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "BAA1j7yq_OhzZfTA4ncLzXBRJ8kZvEa03J2SIU81G0qghzdcGc_BATtDTbDSJUu4WRfykOZdIIboPGPq1o";
const PAYPAL_BASE = process.env.PAYPAL_ENVIRONMENT === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
const apiHeaders = {
  "x-api-key": process.env.CONJURES_API_KEY || "",
  "content-type": "application/json",
};

const FORMS = [
  [
    "hr",
    "HR Team Application",
    "HR Application",
    "HR TEAM",
    "#ff7eb6",
    "1542182045722214522",
    ["1536743365272404049", "1536743481114890360"],
  ],
  [
    "relations",
    "Relations Board Application",
    "Relations Board Application",
    "RELATIONS TEAM",
    "#a879ff",
    "1542181718675562607",
    ["1536743365272404049", "1536743848955617280"],
  ],
  [
    "hosting",
    "Hosting Team Application",
    "Hosting Team Application",
    "HOSTING TEAM",
    "#f04747",
    "1537701786767327302",
    ["1536744173083037806"],
  ],
  [
    "moderation",
    "Moderation Team Application",
    "Moderation Team Application",
    "MODERATION TEAM",
    "#579dff",
    "1537701754723110942",
    ["1536744195023437834"],
  ],
  [
    "events",
    "Events Team Application",
    "Events Team Application",
    "EVENTS TEAM",
    "#ff9f43",
    "1542181955578363985",
    ["1536743365272404049", "1536745884803661864"],
  ],
  [
    "newsletter",
    "Newsletter Team Application",
    "Newsletter Team Application",
    "NEWSLETTER TEAM",
    "#f7d154",
    "1542181772291211386",
    ["1536743365272404049", "1536746008371920936"],
  ],
  [
    "social",
    "Social Media Team Application",
    "Social Media Team Application",
    "SOCIAL MEDIA TEAM",
    "#58d68d",
    "1542181867451711588",
    ["1536743365272404049", "1536745953942315066"],
  ],
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
  [
    "hr_hosting",
    "HR Team (Hosting) Examination",
    "HR TEAM",
    "#ff7eb6",
    "1542853017559244850",
    ["1536743365272404049", "1536743782387818611"],
  ],
  [
    "hr_moderation",
    "HR Team (Moderation) Examination",
    "HR TEAM",
    "#ff7eb6",
    "1542853037754949672",
    ["1536743365272404049", "1536743820018843758"],
  ],
  [
    "relations",
    "Relations Board Examination",
    "RELATIONS TEAM",
    "#a879ff",
    "1542853350880452698",
    ["1536743365272404049", "1536743848955617280"],
  ],
  [
    "hosting",
    "Hosting Team Examination",
    "HOSTING TEAM",
    "#f04747",
    "1537701772284530698",
    ["1536744173083037806"],
  ],
  [
    "moderation",
    "Moderation Team Examination",
    "MODERATION TEAM",
    "#579dff",
    "1537701735961727056",
    ["1536744195023437834"],
  ],
  [
    "newsletter",
    "Newsletter Team Examination",
    "NEWSLETTER TEAM",
    "#f7d154",
    "1542853646222364672",
    ["1536743365272404049", "1536746008371920936"],
  ],
  [
    "social",
    "Social Media Team Examination",
    "SOCIAL MEDIA TEAM",
    "#58d68d",
    "1542853801180930129",
    ["1536743365272404049", "1536745953942315066"],
  ],
  [
    "events",
    "Events Team Examination",
    "EVENTS TEAM",
    "#ff9f43",
    "1542853869258678273",
    ["1536743365272404049", "1536745884803661864"],
  ],
];
const EXAM_ROLE_IDS = {
  "SR Team": "1520358345226321960",
  "Hosting Lead": "1520360116459667566",
  "Moderation Lead": "1520360168062451742",
  "Relations Lead": "1520359445568290906",
  "Events Lead": "1520360196579524711",
  "Newsletter Lead": "1537363086162395146",
  "Social Media Lead": "1520360171426152509",
  "Hosting Executive": "1536642673006608424",
  "Moderation Executive": "1536642685207580715",
  "Relations Board": "1520359452669382799",
  "Hosting Intern": "1520361131368120461",
  "Moderation Intern": "1520361504354861176",
  "Events Team": "1526961486617120818",
  "Newsletter Team": "1537363092558717041",
  "Social Media Team": "1526961462298542090",
};

app.disable("x-powered-by");
app.use(express.json({ limit: "4mb" }));
app.use(
  express.static(path.join(__dirname, "public"), { extensions: ["html"] }),
);

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
    if (
      !sig ||
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return null;
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
  res.setHeader(
    "Set-Cookie",
    `conjures_session=${encodeURIComponent(token({ ...profile, exp: Date.now() + 12 * 60 * 60 * 1000 }))}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=43200`,
  );
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
  const rows = await api(
    `/tables/verifications?${new URLSearchParams(query)}&limit=1`,
  );
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
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(Math.max(retryAfter * 1000, 500), 15000)),
      );
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
    const r = await fetch(
      `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
    );
    const data = await r.json();
    const membership = (data.data || []).find(
      (x) => String(x.group?.id) === String(GROUP_ID),
    );
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
    const r = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
    );
    return (await r.json()).data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}
async function enrich(row) {
  const [member, roles, rank, snapshots] = await Promise.all([
    discord(`/guilds/${GUILD_ID}/members/${row.discord_id}`).catch(() => null),
    discord(`/guilds/${GUILD_ID}/roles`).catch(() => []),
    rankFor(row.roblox_user_id),
    api(`/tables/discord_member_roles?id=${encodeURIComponent(`${GUILD_ID}:${row.discord_id}`)}&limit=1`).catch(() => []),
  ]);
  let snapshotRoleIds=[];
  try{snapshotRoleIds=JSON.parse(snapshots?.[0]?.role_ids_json||"[]");}catch{}
  const roleIds=[...new Set([...(member?.roles||[]),...snapshotRoleIds.map(String)])];
  const names = new Set(
    roleIds
      .map((roleId) => roles.find((r) => r.id === roleId)?.name)
      .filter(Boolean),
  );
  return {
    ...row,
    discordUsername:
      member?.user?.global_name || member?.user?.username || "Unknown",
    avatar: member?.user?.avatar,
    headshot: await headshot(row.roblox_user_id),
    roles: [...names],
    roleIds,
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
  return (
    roles.has(role) &&
    (["events", "newsletter", "social"].includes(form.id) ||
      p.rank.number === 52)
  );
}
function applyAllowed(form, p) {
  const r = new Set(p.roles || []);
  if (r.has("HR Team") && !["events", "newsletter", "social"].includes(form.id))
    return false;
  if (
    (r.has("Hosting Team") || r.has("Moderation Team")) &&
    ["hosting", "moderation", "relations"].includes(form.id)
  )
    return false;
  if (
    r.has("Relations Team") &&
    ["relations", "hosting", "moderation", "hr"].includes(form.id)
  )
    return false;
  if (r.has("Events Team") && form.id === "events") return false;
  if (r.has("Newsletter Team") && form.id === "newsletter") return false;
  if (r.has("Social Media Team") && form.id === "social") return false;
  return true;
}
function hasExamRole(p, name) {
  return (
    new Set(p.roles || []).has(name) ||
    new Set(p.roleIds || []).has(EXAM_ROLE_IDS[name])
  );
}
function examAdmin(p) {
  return p.rank.number >= 250;
}
function examCanEdit(form, p) {
  if (examAdmin(p)) return true;
  const rules = {
      hr_hosting: "Hosting Lead",
      hr_moderation: "Moderation Lead",
      relations: "Relations Lead",
      hosting: "Hosting Lead",
      moderation: "Moderation Lead",
      events: "Events Lead",
      newsletter: "Newsletter Lead",
      social: "Social Media Lead",
    },
    role = rules[form.id];
  return (
    hasExamRole(p, role) &&
    (["events", "newsletter", "social"].includes(form.id) ||
      p.rank.number === 52)
  );
}
function examCanTake(form, p) {
  if (examAdmin(p)) return true;
  const rules = {
      hr_hosting: [50, "Hosting Executive"],
      hr_moderation: [50, "Moderation Executive"],
      relations: [40, "Relations Board"],
      hosting: [30, "Hosting Intern"],
      moderation: [20, "Moderation Intern"],
      events: [null, "Events Team"],
      newsletter: [null, "Newsletter Team"],
      social: [null, "Social Media Team"],
    },
    rule = rules[form.id];
  return Boolean(
    rule &&
    hasExamRole(p, rule[1]) &&
    (rule[0] == null || p.rank.number === rule[0]),
  );
}
async function current(req) {
  const session = readToken(cookies(req).conjures_session);
  if (!session) return null;
  const row = await verification({ discord_id: session.discordId }).catch(
    () => null,
  );
  if (!row) return null;
  const blocked = await api(
    `/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`,
  ).catch(() => []);
  return { ...(await enrich(row)), siteBlacklisted: Boolean(blocked[0]) };
}
async function requireUser(req, res, next) {
  const user = await current(req);
  if (!user)
    return res
      .status(401)
      .json({ error: "You must log in with a verified account." });
  if (user.siteBlacklisted)
    return res
      .status(403)
      .json({ error: "Your account is blacklisted from this site." });
  req.user = user;
  next();
}
const GUIDE_ROLE_NAMES = ["Executive Director","Executive Officer","Executive Assistant","Hosting Lead","Moderation Lead","Relations Lead","Hosting Executive","Moderation Executive","Relations Board","Senior Host","Host","Junior Host","Hosting Team","Senior Moderator","Moderator","Junior Moderator","Moderation Team","Events Lead","Newsletter Lead","Social Media Lead","Events Team","Newsletter Team","Social Media Team"];
const GUIDE_ROLE_IDS={"Owner":"1520358255040270406","Co Owner":"1520358339391918140","SR Team":"1520358345226321960","Executive Director":"1520359096191156386","Executive Officer":"1520359114507817120","Executive Assistant":"1520359117372395602","Hosting Lead":"1520360116459667566","Moderation Lead":"1520360168062451742","Relations Lead":"1520359445568290906","Events Lead":"1520360196579524711","Social Media Lead":"1520360171426152509","Newsletter Lead":"1537363086162395146","Hosting Executive":"1536642673006608424","Moderation Executive":"1536642685207580715","Relations Board":"1520359452669382799","Senior Host":"1520360524087300269","Host":"1520360527266709554","Junior Host":"1520361116893708318","Hosting Team":"1520361135973335071","Senior Moderator":"1520361495412867132","Moderator":"1520361500441837609","Junior Moderator":"1520361508284928042","Moderation Team":"1520361511099302139","Newsletter Team":"1537363092558717041","Events Team":"1526961486617120818","Social Media Team":"1526961462298542090"};
function hasGuideDiscordRole(user,name){return new Set(user?.roles||[]).has(name)||new Set(user?.roleIds||[]).has(GUIDE_ROLE_IDS[name]);}
function guideRoot(user){const rank=Number(user?.rank?.number||0);return rank===255||(rank>=250&&["SR Team","Owner","Co Owner"].some(role=>hasGuideDiscordRole(user,role)));}
function guideEligible(user){const rank=Number(user?.rank?.number||0);return (rank>=20&&rank<=59)||rank>=250||["Events Team","Newsletter Team","Social Media Team"].some(role=>hasGuideDiscordRole(user,role));}
function guideRole(user,name){const rank=Number(user?.rank?.number||0),has=(...names)=>names.some(x=>hasGuideDiscordRole(user,x));switch(name){case"Executive Director":return rank>=52&&has(name);case"Executive Officer":return rank>=51&&has(name);case"Executive Assistant":return rank>=50&&has(name);case"Hosting Lead":case"Moderation Lead":case"Relations Lead":return rank>=52&&has(name);case"Hosting Executive":case"Moderation Executive":return rank>=50&&has(name);case"Relations Board":return rank>=40&&rank<=49&&has(name);case"Senior Host":return rank===32&&has(name);case"Host":return rank===31&&has(name);case"Junior Host":return rank===30&&has(name);case"Hosting Team":return rank>=30&&rank<=39&&has("Senior Host","Host","Junior Host");case"Senior Moderator":return rank===22&&has(name);case"Moderator":return rank===21&&has(name);case"Junior Moderator":return rank===20&&has(name);case"Moderation Team":return rank>=20&&rank<=29&&has("Senior Moderator","Moderator","Junior Moderator");case"Events Lead":case"Newsletter Lead":case"Social Media Lead":case"Events Team":case"Newsletter Team":case"Social Media Team":return has(name);default:return false;}}
function guidePermissions(value,document=false){const blank=document?{administrators:[],edit:[],view:[]}:{administrators:[],create:[],delete:[]};try{const parsed=typeof value==="string"?JSON.parse(value):value;for(const key of Object.keys(blank)){const legacy=document?(key==="edit"?"editors":key==="view"?"viewers":key):key;blank[key]=(Array.isArray(parsed?.[key])?parsed[key]:Array.isArray(parsed?.[legacy])?parsed[legacy]:[]).filter(x=>GUIDE_ROLE_NAMES.includes(x));}}catch{}return blank;}
function permitted(user,list){return guideRoot(user)||(list||[]).some(role=>guideRole(user,role));}
function folderAbilities(user,folder){const p=guidePermissions(folder.permissions_json),admin=permitted(user,p.administrators);return{root:guideRoot(user),admin,create:admin||permitted(user,p.create),delete:admin||permitted(user,p.delete)};}
function documentAbilities(user,folder,doc){const fp=folderAbilities(user,folder),p=guidePermissions(doc.permissions_json,true),admin=fp.admin||doc.created_by_discord_id===user.discord_id||permitted(user,p.administrators),edit=admin||permitted(user,p.edit),view=edit||permitted(user,p.view);return{root:fp.root,admin,edit,view,delete:admin||fp.delete};}
function cleanText(value,max=100){return String(value||"").trim().slice(0,max);}
function cleanHex(value){const color=String(value||"").trim();return /^#[0-9a-f]{6}$/i.test(color)?color.toLowerCase():"#ef4b5f";}
function cleanGuideHtml(value){let html=String(value||"").slice(0,2500000);html=html.replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1\s*>/gi,"").replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*\/?\s*>/gi,"").replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"").replace(/\s+(src|href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi," $1=\"#\"");return html;}
const GUIDE_AUDIT_CHANNEL="1538148337675665510";
function guideAuditValue(value,html=false){let text=html?String(value||"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi,"\n").replace(/<[^>]+>/g,""):typeof value==="string"?value:JSON.stringify(value,null,2);text=text.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();if(text.length>12000)text=`${text.slice(0,12000)}\n[Content truncated after 12,000 characters]`;return text||"None";}
async function guideAudit(user,title,action,actorField,changes=[]){try{const expanded=[];for(const change of changes){const value=guideAuditValue(change.value,change.html);for(let offset=0;offset<value.length;offset+=1000)expanded.push({name:`${change.name}${value.length>1000?` (${Math.floor(offset/1000)+1}/${Math.ceil(value.length/1000)})`:""}`,value:value.slice(offset,offset+1000)||"None",inline:false});}const groups=[];for(let index=0;index<Math.max(1,expanded.length);index+=23)groups.push(expanded.slice(index,index+23));const rows=groups.map((group,index)=>({id:id(),channel_id:GUIDE_AUDIT_CHANNEL,title:`${cleanText(title,220)}${groups.length>1?` (${index+1}/${groups.length})`:""}`,fields:JSON.stringify([{name:"Action",value:action,inline:true},{name:actorField,value:`${user.roblox_username} (${user.roblox_user_id})`,inline:true},...group]),thumbnail_roblox_user_id:user.roblox_user_id,occurred_at:new Date().toISOString()}));await api("/tables/pending_discord_logs",{method:"POST",body:JSON.stringify(rows)});}catch(error){console.error("[guides] audit queue failed",error.message);}}
async function guideRows(table,query=""){return api(`/tables/${table}${query?`?${query}`:""}`);}
app.use("/api/guides",(req,res,next)=>{res.set("Cache-Control","no-store, no-cache, must-revalidate");next();});
app.get("/api/guides",requireUser,async(req,res)=>{try{if(!guideEligible(req.user))return res.status(403).json({error:"You do not have access to Guides."});const [folders,docs]=await Promise.all([guideRows("guide_folders","order=sort_order.asc"),guideRows("guide_documents","order=updated_at.desc")]);const result=[];for(const folder of folders){const abilities=folderAbilities(req.user,folder),visibleDocs=docs.filter(d=>d.folder_id===folder.id&&documentAbilities(req.user,folder,d).view).map(d=>({...d,permissions:guidePermissions(d.permissions_json,true),abilities:documentAbilities(req.user,folder,d),content_html:undefined}));if(abilities.admin||abilities.create||visibleDocs.length)result.push({...folder,permissions:guidePermissions(folder.permissions_json),abilities,documents:visibleDocs});}res.json({canCreateFolders:guideRoot(req.user),roleOptions:GUIDE_ROLE_NAMES,folders:result});}catch(e){console.error("[guides] list failed",e);res.status(500).json({error:"Guides could not be loaded."});}});
app.patch("/api/guides/reorder-folders",requireUser,async(req,res)=>{try{if(!guideRoot(req.user))return res.status(403).json({error:"Only SR Team guide administrators can reorder folders."});const ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids.map(String))]:[];const folders=await guideRows("guide_folders"),oldIds=[...folders].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)).map(x=>String(x.id));if(ids.length!==folders.length||folders.some(folder=>!ids.includes(String(folder.id))))return res.status(400).json({error:"The folder order must include every folder exactly once."});await Promise.all(ids.map((folderId,index)=>api(`/tables/guide_folders?id=${encodeURIComponent(folderId)}`,{method:"PATCH",body:JSON.stringify({sort_order:index,updated_at:new Date().toISOString()})})));if(ids.join()!==oldIds.join()){const names=new Map(folders.map(x=>[String(x.id),x.name]));await guideAudit(req.user,"Guide Folders","Reordered Folders","Reordered by",[{name:"Old Order",value:oldIds.map(x=>names.get(x)).join(" → ")},{name:"New Order",value:ids.map(x=>names.get(x)).join(" → ")}]);}res.json({ok:true});}catch(e){console.error("[guides] reorder failed",e);res.status(500).json({error:"Folder order could not be saved."});}});
app.post("/api/guides/folders",requireUser,async(req,res)=>{try{if(!guideRoot(req.user))return res.status(403).json({error:"Only SR Team guide administrators can create folders."});const name=cleanText(req.body?.name,80);if(!name)return res.status(400).json({error:"Folder name is required."});const folders=await guideRows("guide_folders"),permissions=guidePermissions(req.body?.permissions);const result=await api("/tables/guide_folders",{method:"POST",body:JSON.stringify({id:id(),name,description:cleanText(req.body?.description,500),icon_color:cleanHex(req.body?.iconColor),sort_order:folders.length,permissions_json:JSON.stringify(permissions),created_by_discord_id:req.user.discord_id})}),row=Array.isArray(result)?result[0]:result;await guideAudit(req.user,name,"Created Folder","Created by",[{name:"Description",value:row.description},{name:"Permissions",value:permissions}]);res.status(201).json(row);}catch(e){res.status(500).json({error:"Folder could not be created."});}});
app.patch("/api/guides/folders/:id",requireUser,async(req,res)=>{try{const rows=await guideRows("guide_folders",`id=${encodeURIComponent(req.params.id)}&limit=1`),old=rows[0];if(!old)return res.status(404).json({error:"Folder not found."});if(!folderAbilities(req.user,old).admin)return res.status(403).json({error:"Only folder administrators can edit this folder."});const name=cleanText(req.body?.name,80);if(!name)return res.status(400).json({error:"Folder name is required."});const permissions=guidePermissions(req.body?.permissions),result=await api(`/tables/guide_folders?id=${encodeURIComponent(req.params.id)}`,{method:"PATCH",body:JSON.stringify({name,description:cleanText(req.body?.description,500),icon_color:cleanHex(req.body?.iconColor),permissions_json:JSON.stringify(permissions),updated_at:new Date().toISOString()})}),row=Array.isArray(result)?result[0]:result,changes=[];if(old.name!==row.name)changes.push({name:"Old Name",value:old.name},{name:"New Name",value:row.name});if(old.description!==row.description)changes.push({name:"Old Description",value:old.description},{name:"New Description",value:row.description});if(old.icon_color!==row.icon_color)changes.push({name:"Old Color",value:old.icon_color},{name:"New Color",value:row.icon_color});if(JSON.stringify(guidePermissions(old.permissions_json))!==JSON.stringify(permissions))changes.push({name:"Old Permissions",value:guidePermissions(old.permissions_json)},{name:"New Permissions",value:permissions});if(changes.length)await guideAudit(req.user,row.name,"Edited Folder","Edited by",changes);res.json(row);}catch(e){res.status(500).json({error:"Folder could not be updated."});}});
app.delete("/api/guides/folders/:id",requireUser,async(req,res)=>{try{const [docs,folders]=await Promise.all([guideRows("guide_documents",`folder_id=${encodeURIComponent(req.params.id)}&limit=1`),guideRows("guide_folders",`id=${encodeURIComponent(req.params.id)}&limit=1`)]),folder=folders[0];if(docs[0])return res.status(409).json({error:"Delete every document in this folder manually before deleting the folder."});if(!folder)return res.status(404).json({error:"Folder not found."});if(!folderAbilities(req.user,folder).delete)return res.status(403).json({error:"You cannot delete this folder."});await api(`/tables/guide_folders?id=${encodeURIComponent(req.params.id)}`,{method:"DELETE"});await guideAudit(req.user,folder.name,"Deleted Folder","Deleted by",[{name:"Deleted Folder",value:folder.name}]);res.json({ok:true});}catch(e){res.status(500).json({error:"Folder could not be deleted."});}});
app.get("/api/guides/folders/:id",requireUser,async(req,res)=>{try{if(!guideEligible(req.user))return res.status(403).json({error:"You do not have access to Guides."});const folders=await guideRows("guide_folders",`id=${encodeURIComponent(req.params.id)}&limit=1`),folder=folders[0];if(!folder)return res.status(404).json({error:"Folder not found."});const docs=await guideRows("guide_documents",`folder_id=${encodeURIComponent(folder.id)}&order=sort_order.asc`),visible=docs.filter(d=>documentAbilities(req.user,folder,d).view).sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||Number(a.sort_order)-Number(b.sort_order)).map(d=>({...d,content_html:undefined,permissions:guidePermissions(d.permissions_json,true),abilities:documentAbilities(req.user,folder,d)})),abilities=folderAbilities(req.user,folder);if(!abilities.admin&&!abilities.create&&!visible.length)return res.status(403).json({error:"You cannot access this folder."});res.json({...folder,permissions:guidePermissions(folder.permissions_json),abilities,roleOptions:GUIDE_ROLE_NAMES,documents:visible});}catch(e){res.status(500).json({error:e.message||"Folder could not be loaded."});}});
app.patch("/api/guides/folders/:id/reorder-documents",requireUser,async(req,res)=>{try{const folders=await guideRows("guide_folders",`id=${encodeURIComponent(req.params.id)}&limit=1`),folder=folders[0];if(!folder)return res.status(404).json({error:"Folder not found."});if(!folderAbilities(req.user,folder).admin)return res.status(403).json({error:"Only folder administrators can reorder documents."});const docs=await guideRows("guide_documents",`folder_id=${encodeURIComponent(folder.id)}`),ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids.map(String))]:[],oldIds=[...docs].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||Number(a.sort_order)-Number(b.sort_order)).map(x=>String(x.id));if(ids.length!==docs.length||docs.some(doc=>!ids.includes(String(doc.id))))return res.status(400).json({error:"The document order must include every document exactly once."});await Promise.all(ids.map((docId,index)=>api(`/tables/guide_documents?id=${encodeURIComponent(docId)}`,{method:"PATCH",body:JSON.stringify({sort_order:index,updated_at:new Date().toISOString()})})));if(ids.join()!==oldIds.join()){const names=new Map(docs.map(x=>[String(x.id),x.title]));await guideAudit(req.user,folder.name,"Reordered Documents","Reordered by",[{name:"Old Order",value:oldIds.map(x=>names.get(x)).join(" → ")},{name:"New Order",value:ids.map(x=>names.get(x)).join(" → ")}]);}res.json({ok:true});}catch(e){res.status(500).json({error:"Document order could not be saved."});}});
app.post("/api/guides/folders/:id/documents",requireUser,async(req,res)=>{try{const folders=await guideRows("guide_folders",`id=${encodeURIComponent(req.params.id)}&limit=1`),folder=folders[0];if(!folder)return res.status(404).json({error:"Folder not found."});if(!folderAbilities(req.user,folder).create)return res.status(403).json({error:"You cannot create documents in this folder."});const title=cleanText(req.body?.title,120);if(!title)return res.status(400).json({error:"Document title is required."});const docs=await guideRows("guide_documents",`folder_id=${encodeURIComponent(folder.id)}`),permissions=guidePermissions(req.body?.permissions,true),result=await api("/tables/guide_documents",{method:"POST",body:JSON.stringify({id:id(),folder_id:folder.id,title,content_html:"<p></p>",sort_order:docs.length,permissions_json:JSON.stringify(permissions),created_by_discord_id:req.user.discord_id,updated_by_discord_id:req.user.discord_id})}),row=Array.isArray(result)?result[0]:result;await guideAudit(req.user,title,"Created Document","Created by",[{name:"Folder",value:folder.name},{name:"Permissions",value:permissions}]);res.status(201).json(row);}catch(e){res.status(500).json({error:"Document could not be created."});}});
app.get("/api/guides/folders/:folderId/documents/:docId",requireUser,async(req,res)=>{try{const [folders,docs]=await Promise.all([guideRows("guide_folders",`id=${encodeURIComponent(req.params.folderId)}&limit=1`),guideRows("guide_documents",`id=${encodeURIComponent(req.params.docId)}&folder_id=${encodeURIComponent(req.params.folderId)}&limit=1`)]),folder=folders[0],doc=docs[0];if(!folder||!doc)return res.status(404).json({error:"Document not found."});const abilities=documentAbilities(req.user,folder,doc);if(!abilities.view)return res.status(403).json({error:"You cannot view this document."});res.json({...doc,permissions:guidePermissions(doc.permissions_json,true),abilities,folder:{id:folder.id,name:folder.name},roleOptions:GUIDE_ROLE_NAMES});}catch(e){res.status(500).json({error:"Document could not be loaded."});}});
app.patch("/api/guides/folders/:folderId/documents/:docId",requireUser,async(req,res)=>{try{const [folders,docs]=await Promise.all([guideRows("guide_folders",`id=${encodeURIComponent(req.params.folderId)}&limit=1`),guideRows("guide_documents",`id=${encodeURIComponent(req.params.docId)}&folder_id=${encodeURIComponent(req.params.folderId)}&limit=1`)]),folder=folders[0],doc=docs[0];if(!folder||!doc)return res.status(404).json({error:"Document not found."});const abilities=documentAbilities(req.user,folder,doc),metadata=req.body?.title!==undefined||req.body?.permissions!==undefined||req.body?.pinned!==undefined;if(metadata&&!abilities.admin)return res.status(403).json({error:"Only document administrators can change its title, pin, or permissions."});if(req.body?.contentHtml!==undefined&&!abilities.edit)return res.status(403).json({error:"You cannot edit this document."});const body={updated_at:new Date().toISOString(),updated_by_discord_id:req.user.discord_id,version:Number(doc.version||1)+1},changes=[];if(req.body?.title!==undefined){body.title=cleanText(req.body.title,120);if(!body.title)return res.status(400).json({error:"Document title is required."});if(body.title!==doc.title)changes.push({name:"Old Name",value:doc.title},{name:"New Name",value:body.title});}if(req.body?.permissions!==undefined){const permissions=guidePermissions(req.body.permissions,true);body.permissions_json=JSON.stringify(permissions);if(JSON.stringify(guidePermissions(doc.permissions_json,true))!==JSON.stringify(permissions))changes.push({name:"Old Permissions",value:guidePermissions(doc.permissions_json,true)},{name:"New Permissions",value:permissions});}if(req.body?.pinned!==undefined){body.pinned=Boolean(req.body.pinned);if(body.pinned!==Boolean(doc.pinned))changes.push({name:"Old Pin Status",value:doc.pinned?"Pinned":"Not Pinned"},{name:"New Pin Status",value:body.pinned?"Pinned":"Not Pinned"});}if(req.body?.contentHtml!==undefined){body.content_html=cleanGuideHtml(req.body.contentHtml);if(body.content_html!==doc.content_html)changes.push({name:"Old Content",value:doc.content_html,html:true},{name:"New Content",value:body.content_html,html:true});}const result=await api(`/tables/guide_documents?id=${encodeURIComponent(doc.id)}`,{method:"PATCH",body:JSON.stringify(body)}),row=Array.isArray(result)?result[0]:result;if(!row)return res.status(500).json({error:"Document update returned no record."});if(changes.length)await guideAudit(req.user,row.title,req.body?.contentHtml!==undefined?"Edited Content":"Edited Document","Edited by",changes);res.json({...row,permissions:guidePermissions(row.permissions_json,true),abilities});}catch(e){res.status(500).json({error:"Document could not be saved."});}});
app.delete("/api/guides/folders/:folderId/documents/:docId",requireUser,async(req,res)=>{try{const [folders,docs]=await Promise.all([guideRows("guide_folders",`id=${encodeURIComponent(req.params.folderId)}&limit=1`),guideRows("guide_documents",`id=${encodeURIComponent(req.params.docId)}&folder_id=${encodeURIComponent(req.params.folderId)}&limit=1`)]),folder=folders[0],doc=docs[0];if(!folder||!doc)return res.status(404).json({error:"Document not found."});if(!documentAbilities(req.user,folder,doc).delete)return res.status(403).json({error:"You cannot delete this document."});await api(`/tables/guide_documents?id=${encodeURIComponent(doc.id)}`,{method:"DELETE"});await guideAudit(req.user,doc.title,"Deleted Document","Deleted by",[{name:"Folder",value:folder.name},{name:"Deleted Document",value:doc.title}]);res.json({ok:true});}catch(e){res.status(500).json({error:"Document could not be deleted."});}});
async function paypalToken() {
  if (!process.env.PAYPAL_CLIENT_SECRET) throw new Error("PayPal checkout is not configured yet.");
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!response.ok) throw new Error("PayPal authentication failed.");
  return (await response.json()).access_token;
}
async function paypal(route, options = {}) {
  const response = await fetch(`${PAYPAL_BASE}${route}`, { ...options, headers: { authorization: `Bearer ${await paypalToken()}`, "content-type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || "PayPal could not complete this request.");
  return body;
}
async function resolveCustomRoleRecipient(input) {
  const value = String(input || "").trim(); let row = null;
  if (/^\d+$/.test(value)) row = await verification({ roblox_user_id: value }) || await verification({ discord_id: value });
  else if (/^[A-Za-z0-9_]{3,20}$/.test(value)) {
    const rr = await fetch("https://users.roblox.com/v1/usernames/users", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({usernames:[value],excludeBannedUsers:false}) });
    const found = rr.ok ? (await rr.json()).data?.[0] : null;
    if (found) row = await verification({ roblox_user_id: String(found.id) });
  }
  return row;
}
async function applicationState(user, applicationId) {
  if (!user) return { state: null, daysRemaining: 0 };
  const [blocked, past] = await Promise.all([
    api(
      `/tables/application_blacklists?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&limit=1`,
    ),
    api(
      `/tables/application_submissions?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&application_id=${encodeURIComponent(applicationId)}&order=submitted_at.desc`,
    ),
  ]);
  if (blocked[0]) return { state: "blacklisted", daysRemaining: 0 };
  const stale = past.filter(
    (x) => x.status === "pending" && !x.discord_message_id,
  );
  for (const item of stale)
    await api(
      `/tables/application_submissions?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" },
    );
  if (past.some((x) => x.status === "pending" && x.discord_message_id))
    return { state: "pending", daysRemaining: 0 };
  const denial = past.find(
    (x) =>
      x.status === "denied" &&
      Date.now() - new Date(x.decided_at || x.updated_at).getTime() <
        7 * 86400000,
  );
  if (denial) {
    const remaining =
      7 * 86400000 -
      (Date.now() - new Date(denial.decided_at || denial.updated_at).getTime());
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
    const existing = await api(
      `/tables/application_forms?id=${formId}&limit=1`,
    );
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
async function seedExams() {
  for (const [examId, name, label, color, channel, roles] of EXAMS) {
    const rows = await api(`/tables/exam_forms?id=${examId}&limit=1`);
    if (rows.length) continue;
    await api("/tables/exam_forms", {
      method: "POST",
      body: JSON.stringify({
        id: examId,
        name,
        team_label: label,
        team_color: color,
        description: "",
        schema_json: JSON.stringify([LOCKED_SECTION]),
        channel_id: channel,
        ping_role_ids: JSON.stringify(roles),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  }
}
function examQuestions(form) {
  return JSON.parse(form.schema_json || "[]").flatMap((section) =>
    (section.questions || []).filter((q) => !q.locked),
  );
}
function shuffle(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index--) {
    const swap = crypto.randomInt(index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}
function buildExamPlan(form) {
  const sections = JSON.parse(form.schema_json || "[]"),
    steps = [];
  for (const section of sections) {
    if (section.locked) continue;
    steps.push({
      id: `section:${section.id}`,
      type: "section_intro",
      title: section.title,
      description: section.description || "",
      required: false,
      timerSeconds: 0,
    });
    const questions = (section.questions || []).filter(
      (question) => !question.locked,
    );
    if (!section.questionBank) {
      steps.push(...questions);
      continue;
    }
    const always = questions.filter((question) => question.alwaysInclude),
      optional = shuffle(
        questions.filter((question) => !question.alwaysInclude),
      ),
      configured = Math.max(0, Math.floor(Number(section.questionLimit || 0))),
      limit = configured || questions.length,
      selected = [
        ...always,
        ...optional.slice(0, Math.max(0, limit - always.length)),
      ];
    steps.push(...shuffle(selected));
  }
  return steps;
}
function examSteps(form, access) {
  if (access?.exam_plan_json) {
    try {
      return JSON.parse(access.exam_plan_json);
    } catch {}
  }
  return buildExamPlan(form);
}
async function ensureExamPlan(access, form) {
  if (access.exam_plan_json) return access;
  access.exam_plan_json = JSON.stringify(buildExamPlan(form));
  access.updated_at = new Date().toISOString();
  await api("/tables/exam_access", {
    method: "POST",
    body: JSON.stringify(access),
  });
  return access;
}
function formatElapsed(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0)),
    m = Math.floor(value / 60),
    s = String(value % 60).padStart(2, "0");
  return `${m}:${s}`;
}
const examDeliveryLocks = new Set();
async function deliverExam(access, form, incomplete = false) {
  if (examDeliveryLocks.has(access.id)) return;
  examDeliveryLocks.add(access.id);
  try {
    const answers = JSON.parse(access.answers_json || "{}"),
      timings = JSON.parse(access.timings_json || "{}"),
      questions = examSteps(form, access).filter(
        (step) => step.type !== "section_intro",
      ),
      thumbnail = await headshot(access.roblox_user_id),
      fields = [
        {
          name: "Roblox Username",
          value: safe(access.roblox_username, 1024),
          inline: true,
        },
        { name: "Roblox ID", value: access.roblox_user_id, inline: true },
        { name: "Discord ID", value: access.discord_id || "N/A", inline: true },
      ];
    if (incomplete)
      fields.push({
        name: "Incomplete Examination",
        value: "This examination was not completed within the time period.",
        inline: false,
      });
    for (const q of questions) {
      const timer = Number(q.timerSeconds || 0),
        used = Number(timings[q.id] || 0),
        suffix = timer
          ? ` (${formatElapsed(used)}/${formatElapsed(timer)})`
          : "",
        answer = answers[q.id],
        display = Array.isArray(answer) ? answer.join(", ") : answer;
      fields.push({
        name: safe(`${q.title}${suffix}`, 256),
        value: safe(display || "They did not answer this question.", 1024),
        inline: false,
      });
    }
    const embeds = [];
    for (let i = 0; i < fields.length; i += 22)
      embeds.push({
        title: i
          ? undefined
          : `${form.name}: ${access.roblox_username} (${access.roblox_user_id})`,
        ...(i || !thumbnail ? {} : { thumbnail: { url: thumbnail } }),
        fields: fields.slice(i, i + 22),
      });
    const roleIds = JSON.parse(form.ping_role_ids || "[]"),
      content = roleIds.map((x) => `<@&${x}>`).join(" "),
      message = await discord(`/channels/${form.channel_id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          embeds,
          allowed_mentions: { roles: roleIds },
        }),
      });
    await discord(
      `/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_yes:1537731698245115936")}/@me`,
      { method: "PUT" },
    );
    await discord(
      `/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_no:1537731724375498773")}/@me`,
      { method: "PUT" },
    );
    await discord(
      `/channels/${form.channel_id}/messages/${message.id}/threads`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${access.roblox_username} (${access.roblox_user_id}) - ${form.name}`,
          auto_archive_duration: 1440,
        }),
      },
    );
    await api(`/tables/exam_access?id=${encodeURIComponent(access.id)}`, {
      method: "DELETE",
    });
  } finally {
    examDeliveryLocks.delete(access.id);
  }
}

app.get("/api/customroles", async (req,res)=>{try{const user=await current(req),[roles,status]=await Promise.all([user?api(`/tables/custom_roles?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&limit=1`):Promise.resolve([]),api("/custom-roles/status")]);res.json({price:"30.00",currency:"USD",paypalClientId:PAYPAL_CLIENT_ID,authenticated:Boolean(user&&!user.siteBlacklisted),hasRole:Boolean(roles[0]),role:roles[0]||null,user:user&&!user.siteBlacklisted?user:null,count:status.count,capacity:status.capacity,atCapacity:status.atCapacity});}catch(e){res.status(500).json({error:"Custom roles could not be loaded."});}});
app.post("/api/customroles/check-gift",requireUser,async(req,res)=>{try{const target=await resolveCustomRoleRecipient(req.body?.target);if(!target)return res.status(404).json({error:"That account is not verified through CONJURES."});const status=await api(`/custom-roles/eligibility/${encodeURIComponent(target.roblox_user_id)}`);res.json({eligible:status.eligible,robloxUsername:target.roblox_username,robloxId:target.roblox_user_id,discordId:target.discord_id,reason:status.atCapacity?"Custom roles are currently at the capacity of 100. Please check back later.":status.hasRole?"This user already has a custom role.":status.reserved?"A custom role purchase is already in progress for this user.":status.eligible?null:"This user is not eligible."});}catch(e){res.status(500).json({error:e.message});}});
app.post("/api/customroles/order",requireUser,async(req,res)=>{let reservation=null;try{const gift=Boolean(req.body?.gift);let recipient=req.user;if(gift){recipient=await resolveCustomRoleRecipient(req.body?.target);if(!recipient)return res.status(404).json({error:"That account is not verified through CONJURES."});}reservation=await api("/custom-roles/reserve",{method:"POST",body:JSON.stringify({id:id(),purchaserRobloxUserId:req.user.roblox_user_id,purchaserDiscordId:req.user.discord_id,recipientRobloxUserId:recipient.roblox_user_id})});const order=await paypal("/v2/checkout/orders",{method:"POST",headers:{"PayPal-Request-Id":reservation.id},body:JSON.stringify({intent:"CAPTURE",purchase_units:[{reference_id:reservation.id,custom_id:reservation.id,description:`CONJURES Custom Role for ${recipient.roblox_username} (${recipient.roblox_user_id})`,amount:{currency_code:"USD",value:"30.00"}}],application_context:{brand_name:"CONJURES",user_action:"PAY_NOW",shipping_preference:"NO_SHIPPING"}})});await api("/custom-roles/order-created",{method:"POST",body:JSON.stringify({id:reservation.id,orderId:order.id})});res.json({id:order.id,intentId:reservation.id});}catch(e){if(reservation?.id)await api("/custom-roles/release",{method:"POST",body:JSON.stringify({id:reservation.id,purchaserDiscordId:req.user.discord_id})}).catch(()=>{});console.error("[customroles] create order failed",e.message);const message=e.message.includes("custom_role_capacity_reached")?"Custom roles are currently at the capacity of 100. Please check back later.":e.message.includes("recipient_")?"This user is not currently eligible for a custom role.":e.message;res.status(409).json({error:message});}});
app.post("/api/customroles/order/:orderId/capture",requireUser,async(req,res)=>{try{const rows=await api(`/tables/custom_role_purchase_intents?paypal_order_id=${encodeURIComponent(req.params.orderId)}&purchaser_discord_id=${encodeURIComponent(req.user.discord_id)}&limit=1`),intent=rows[0];if(!intent)return res.status(404).json({error:"Purchase not found."});const capture=await paypal(`/v2/checkout/orders/${encodeURIComponent(req.params.orderId)}/capture`,{method:"POST",headers:{"PayPal-Request-Id":`${intent.id}-capture`},body:"{}"});const unit=capture.purchase_units?.[0],payment=unit?.payments?.captures?.[0];if(capture.status!=="COMPLETED"||payment?.status!=="COMPLETED"||payment.amount?.currency_code!=="USD"||payment.amount?.value!=="30.00"||unit.reference_id!==intent.id)return res.status(409).json({error:"PayPal did not confirm the expected completed $30.00 USD payment."});await api("/custom-roles/paid",{method:"POST",body:JSON.stringify({id:intent.id,orderId:capture.id,captureId:payment.id,purchaserRobloxUsername:req.user.roblox_username})});res.json({ok:true});}catch(e){console.error("[customroles] capture failed",e.message);res.status(409).json({error:e.message});}});
app.post("/api/customroles/order/:orderId/cancel",requireUser,async(req,res)=>{try{const rows=await api(`/tables/custom_role_purchase_intents?paypal_order_id=${encodeURIComponent(req.params.orderId)}&purchaser_discord_id=${encodeURIComponent(req.user.discord_id)}&limit=1`),intent=rows[0];if(intent)await api("/custom-roles/release",{method:"POST",body:JSON.stringify({id:intent.id,orderId:req.params.orderId,purchaserDiscordId:req.user.discord_id})});res.json({ok:true});}catch(e){console.error("[customroles] cancel release failed",e.message);res.json({ok:true});}});

app.get("/health", (_q, res) =>
  res.json({ ok: true, service: "conjures-net" }),
);
app.get("/api/me", async (req, res) => {
  const user = await current(req);
  res.json(
    user
      ? user.siteBlacklisted
        ? { authenticated: false, siteBlacklisted: true }
        : { authenticated: true, ...user }
      : { authenticated: false },
  );
});
app.get("/api/applications", async (req, res) => {
  try {
    await seed();
    const rawUser = await current(req),
      user = rawUser && !rawUser.siteBlacklisted ? rawUser : null;
    const forms = await api("/tables/application_forms?order=created_at.asc");
    const states = new Map(
      await Promise.all(
        forms.map(async (form) => [
          form.id,
          await applicationState(user, form.id),
        ]),
      ),
    );
    res.json(
      forms
        .filter((f) => f.is_open || (user && editorAllowed(f, user)))
        .map((f) => {
          const state = states.get(f.id);
          return {
            ...f,
            schema: JSON.parse(f.schema_json || "[]"),
            canEdit: Boolean(user && editorAllowed(f, user)),
            applicationState: state.state,
            daysRemaining: state.daysRemaining,
            canApply: Boolean(
              user && f.is_open && applyAllowed(f, user) && !state.state,
            ),
          };
        }),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Applications could not be loaded." });
  }
});
app.get("/api/applications/:id", async (req, res) => {
  try {
    const forms = await api(
      `/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
    );
    const form = forms[0],
      rawUser = await current(req),
      user = rawUser && !rawUser.siteBlacklisted ? rawUser : null,
      state = await applicationState(user, req.params.id);
    if (!form || (!form.is_open && !user))
      return res.status(404).json({ error: "Application not found." });
    res.json({
      ...form,
      schema: JSON.parse(form.schema_json || "[]"),
      canEdit: Boolean(user && editorAllowed(form, user)),
      applicationState: state.state,
      daysRemaining: state.daysRemaining,
      canApply: Boolean(
        user && form.is_open && applyAllowed(form, user) && !state.state,
      ),
      user,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/applications/:id", requireUser, async (req, res) => {
  try {
    const forms = await api(
        `/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      ),
      form = forms[0];
    if (!form || !editorAllowed(form, req.user))
      return res
        .status(403)
        .json({ error: "You cannot edit this application." });
    const schema = Array.isArray(req.body.schema) ? req.body.schema : [];
    if (!schema[0]?.locked)
      return res
        .status(400)
        .json({ error: "The Information section is required." });
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
  if (submissionLocks.has(lockKey))
    return res
      .status(409)
      .json({ error: "Your application is already being submitted." });
  submissionLocks.add(lockKey);
  try {
    const forms = await api(
        `/tables/application_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      ),
      form = forms[0];
    if (!form?.is_open)
      return res.status(409).json({ error: "This application is not open." });
    if (!applyAllowed(form, req.user))
      return res.status(403).json({ error: "You are unable to apply." });
    const state = await applicationState(req.user, req.params.id);
    if (state.state === "blacklisted")
      return res
        .status(403)
        .json({ error: "You are blacklisted from submitting applications." });
    if (state.state === "pending")
      return res
        .status(409)
        .json({ error: "You already have a pending application." });
    if (state.state === "denied")
      return res.status(409).json({
        error: `You may apply again in ${state.daysRemaining} day${state.daysRemaining === 1 ? "" : "s"}.`,
      });
    const schema = JSON.parse(form.schema_json || "[]"),
      answers = req.body.answers || {};
    answers.roblox_username = req.user.roblox_username;
    answers.roblox_id = req.user.roblox_user_id;
    answers.discord_id = req.user.discord_id;
    for (const section of schema)
      for (const q of section.questions || [])
        if (q.required && !String(answers[q.id] ?? "").trim())
          return res.status(400).json({ error: `${q.title} is required.` });
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
            value: safe(
              Array.isArray(answers[q.id])
                ? answers[q.id].join(", ")
                : answers[q.id] || "N/A",
              1024,
            ),
            inline: false,
          });
    const thumbnail = await headshot(req.user.roblox_user_id),
      embeds = [];
    for (let i = 0; i < fields.length; i += 22)
      embeds.push({
        title: i
          ? undefined
          : `${form.short_name}: ${req.user.roblox_username} (${req.user.roblox_user_id})`,
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
    await discord(
      `/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_yes:1537731698245115936")}/@me`,
      { method: "PUT" },
    );
    await discord(
      `/channels/${form.channel_id}/messages/${message.id}/reactions/${encodeURIComponent("cdepts_no:1537731724375498773")}/@me`,
      { method: "PUT" },
    );
    const thread = await discord(
      `/channels/${form.channel_id}/messages/${message.id}/threads`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${req.user.roblox_username} (${req.user.roblox_user_id}) - ${form.short_name}`,
          auto_archive_duration: 1440,
        }),
      },
    );
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

async function normalizeExamAccess(access, form) {
  if (!access) return null;
  const now = Date.now();
  if (new Date(access.expires_at).getTime() <= now) {
    await deliverExam(access, form, true);
    return null;
  }
  if (!access.started_at) return access;
  access = await ensureExamPlan(access, form);
  const steps = examSteps(form, access),
    answers = JSON.parse(access.answers_json || "{}"),
    timings = JSON.parse(access.timings_json || "{}"),
    original = Number(access.current_question || 0);
  let index = original,
    started = new Date(
      access.question_started_at || access.started_at,
    ).getTime();
  while (index < steps.length) {
    const limit = Number(steps[index].timerSeconds || 0);
    if (!limit || started + limit * 1000 > now) break;
    timings[steps[index].id] = limit;
    index += 1;
    started += limit * 1000;
  }
  if (index >= steps.length) {
    access.answers_json = JSON.stringify(answers);
    access.timings_json = JSON.stringify(timings);
    await deliverExam(access, form, false);
    return null;
  }
  if (index !== original) {
    access.current_question = index;
    access.question_started_at = new Date(started).toISOString();
    access.timings_json = JSON.stringify(timings);
    access.updated_at = new Date().toISOString();
    await api("/tables/exam_access", {
      method: "POST",
      body: JSON.stringify(access),
    });
  }
  return access;
}
async function getExamAccess(user, examId) {
  const rows = await api(
    `/tables/exam_access?roblox_user_id=${encodeURIComponent(user.roblox_user_id)}&exam_id=${encodeURIComponent(examId)}&status=issued&order=generated_at.desc`,
  );
  return rows[0] || null;
}
app.get("/api/exams", requireUser, async (req, res) => {
  try {
    await seedExams();
    const forms = await api("/tables/exam_forms?order=created_at.asc"),
      accessRows = await api(
        `/tables/exam_access?roblox_user_id=${encodeURIComponent(req.user.roblox_user_id)}&status=issued`,
      ),
      accessBy = new Map(accessRows.map((x) => [x.exam_id, x]));
    const output = [];
    for (const form of forms) {
      let access = accessBy.get(form.id) || null;
      if (access) access = await normalizeExamAccess(access, form);
      const canEdit = examCanEdit(form, req.user);
      if (canEdit || access)
        output.push({
          ...form,
          schema: JSON.parse(form.schema_json || "[]"),
          canEdit,
          hasAccess: Boolean(access),
          started: Boolean(access?.started_at),
          expiresAt: access?.expires_at || null,
        });
    }
    res.json(output);
  } catch (e) {
    console.error("[exams] list failed", e);
    res.status(500).json({ error: "Examinations could not be loaded." });
  }
});
app.get("/api/exams/:id", requireUser, async (req, res) => {
  try {
    const form = (
      await api(
        `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      )
    )[0];
    if (!form) return res.status(404).json({ error: "Examination not found." });
    let access = await getExamAccess(req.user, form.id);
    if (access) access = await normalizeExamAccess(access, form);
    const canEdit = examCanEdit(form, req.user);
    if (!canEdit && !access)
      return res
        .status(403)
        .json({ error: "You do not have access to this examination." });
    res.json({
      ...form,
      schema: JSON.parse(form.schema_json || "[]"),
      canEdit,
      hasAccess: Boolean(access),
      started: Boolean(access?.started_at),
      expiresAt: access?.expires_at || null,
      user: req.user,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/exams/:id", requireUser, async (req, res) => {
  try {
    const form = (
      await api(
        `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      )
    )[0];
    if (!form || !examCanEdit(form, req.user))
      return res
        .status(403)
        .json({ error: "You cannot edit this examination." });
    const schema = Array.isArray(req.body.schema) ? req.body.schema : [];
    if (!schema[0]?.locked)
      return res
        .status(400)
        .json({ error: "The Information section is required." });
    for (const section of schema) {
      const available = (section.questions || []).filter(
        (question) => !question.locked,
      );
      section.questionBank = Boolean(section.questionBank && !section.locked);
      section.questionLimit = section.questionBank
        ? Math.floor(Number(section.questionLimit || 0))
        : 0;
      if (
        section.questionBank &&
        (section.questionLimit < 1 || section.questionLimit > available.length)
      )
        return res.status(400).json({
          error: `The question limit for ${section.title} must be between 1 and ${available.length}.`,
        });
      if (
        section.questionBank &&
        available.filter((question) => question.alwaysInclude).length >
          section.questionLimit
      )
        return res.status(400).json({
          error: `${section.title} has more required bank questions than its question limit.`,
        });
      for (const q of section.questions || []) {
        const timer = Number(q.timerSeconds || 0);
        if (timer < 0 || timer > 86400)
          return res.status(400).json({
            error: "Question timers must be between 1 and 86,400 seconds.",
          });
        q.timerSeconds = timer || 0;
        q.alwaysInclude = Boolean(section.questionBank && q.alwaysInclude);
      }
    }
    await api("/tables/exam_forms", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        description: safe(req.body.description, 12000),
        schema_json: JSON.stringify(schema).slice(0, 100000),
        updated_by_discord_id: req.user.discord_id,
        updated_at: new Date().toISOString(),
      }),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/exams/:id/unlock", requireUser, async (req, res) => {
  try {
    const form = (
        await api(
          `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
        )
      )[0],
      access = await getExamAccess(req.user, req.params.id);
    if (!form || !access)
      return res
        .status(404)
        .json({ error: "No active examination was found." });
    if (!examCanTake(form, req.user))
      return res.status(403).json({
        error: "You no longer meet the requirements for this examination.",
      });
    if (new Date(access.expires_at) <= new Date()) {
      await deliverExam(access, form, true);
      return res
        .status(410)
        .json({ error: "This examination code has expired." });
    }
    const hash = crypto
      .createHash("sha256")
      .update(String(req.body.code || ""))
      .digest("hex");
    if (hash !== access.code_hash)
      return res
        .status(403)
        .json({ error: "The examination code is invalid." });
    if (!access.started_at) {
      const now = new Date().toISOString();
      access.exam_plan_json = JSON.stringify(buildExamPlan(form));
      access.started_at = now;
      access.question_started_at = now;
      access.status = "issued";
      access.updated_at = now;
      await api("/tables/exam_access", {
        method: "POST",
        body: JSON.stringify(access),
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/exams/:id/progress", requireUser, async (req, res) => {
  try {
    const form = (
      await api(
        `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      )
    )[0];
    let access = form ? await getExamAccess(req.user, form.id) : null;
    if (!form || !access)
      return res
        .status(404)
        .json({ error: "No active examination was found." });
    access = await normalizeExamAccess(access, form);
    if (!access)
      return res.status(410).json({ error: "This examination has concluded." });
    if (!access.started_at) return res.json({ locked: true });
    const steps = examSteps(form, access),
      q = steps[access.current_question],
      answers = JSON.parse(access.answers_json || "{}"),
      limit = Number(q.timerSeconds || 0);
    res.json({
      locked: false,
      index: access.current_question,
      total: steps.length,
      question: q,
      draft: q.type === "section_intro" ? "" : answers[q.id] || "",
      deadline: limit
        ? new Date(
            new Date(access.question_started_at).getTime() + limit * 1000,
          ).toISOString()
        : null,
      expiresAt: access.expires_at,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.patch("/api/exams/:id/draft", requireUser, async (req, res) => {
  try {
    const form = (
      await api(
        `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      )
    )[0];
    let access = form ? await getExamAccess(req.user, form.id) : null;
    if (!form || !access || !access.started_at)
      return res
        .status(404)
        .json({ error: "No active examination was found." });
    access = await normalizeExamAccess(access, form);
    if (!access)
      return res.status(410).json({ error: "This examination has concluded." });
    const q = examSteps(form, access)[access.current_question];
    if (q.type === "section_intro" || req.body.questionId !== q.id)
      return res.json({ ok: true, advanced: true });
    const answers = JSON.parse(access.answers_json || "{}");
    answers[q.id] = req.body.answer;
    access.answers_json = JSON.stringify(answers).slice(0, 100000);
    access.updated_at = new Date().toISOString();
    await api("/tables/exam_access", {
      method: "POST",
      body: JSON.stringify(access),
    });
    res.json({ ok: true, advanced: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/exams/:id/next", requireUser, async (req, res) => {
  try {
    const form = (
      await api(
        `/tables/exam_forms?id=${encodeURIComponent(req.params.id)}&limit=1`,
      )
    )[0];
    let access = form ? await getExamAccess(req.user, form.id) : null;
    if (!form || !access || !access.started_at)
      return res
        .status(404)
        .json({ error: "No active examination was found." });
    access = await normalizeExamAccess(access, form);
    if (!access)
      return res.status(410).json({ error: "This examination has concluded." });
    const steps = examSteps(form, access),
      q = steps[access.current_question],
      answer = req.body.answer,
      answers = JSON.parse(access.answers_json || "{}"),
      timings = JSON.parse(access.timings_json || "{}");
    if (q.type !== "section_intro") {
      if (
        q.required &&
        !(Array.isArray(answer) ? answer.length : String(answer ?? "").trim())
      )
        return res.status(400).json({ error: "This question is required." });
      const elapsed = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(access.question_started_at).getTime()) / 1000,
        ),
      );
      answers[q.id] = answer;
      timings[q.id] = Number(q.timerSeconds || 0)
        ? Math.min(elapsed, Number(q.timerSeconds))
        : elapsed;
    }
    access.answers_json = JSON.stringify(answers);
    access.timings_json = JSON.stringify(timings);
    access.current_question += 1;
    access.question_started_at = new Date().toISOString();
    access.updated_at = access.question_started_at;
    if (access.current_question >= steps.length) {
      await deliverExam(access, form, false);
      return res.json({ complete: true });
    }
    await api("/tables/exam_access", {
      method: "POST",
      body: JSON.stringify(access),
    });
    res.json({ complete: false });
  } catch (e) {
    console.error("[exams] next failed", e);
    res.status(500).json({ error: e.message });
  }
});

async function processExpiredExams() {
  try {
    const rows = await api("/tables/exam_access?status=issued"),
      expired = rows.filter((x) => new Date(x.expires_at) <= new Date());
    for (const access of expired) {
      const form = (
        await api(
          `/tables/exam_forms?id=${encodeURIComponent(access.exam_id)}&limit=1`,
        )
      )[0];
      if (form) await deliverExam(access, form, true);
    }
  } catch (e) {
    console.warn("[exams] expiry processor failed -", e.message);
  }
}
setInterval(processExpiredExams, 60 * 1000).unref();

const pendingOauthStates = new Map();
function pruneOauthStates() {
  const now = Date.now();
  for (const [nonce, state] of pendingOauthStates)
    if (state.expires <= now) pendingOauthStates.delete(nonce);
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
  res.redirect(
    `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=identify&state=${encodeURIComponent(state)}`,
  );
});
app.get("/auth/discord/callback", async (req, res) => {
  try {
    if (!validateOauth(req, res, "discord"))
      throw new Error("invalid oauth state");
    const redirect = `${PUBLIC_URL}/auth/discord/callback`;
    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: String(req.query.code),
      redirect_uri: redirect,
    });
    const access = await discordOauth.request("/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const du = await discordOauth.request("/users/@me", {
      headers: { authorization: `Bearer ${access.access_token}` },
    });
    const row = await verification({ discord_id: du.id });
    if (!row) return res.redirect("/?error=verification_required");
    const blocked = await api(
      `/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`,
    );
    if (blocked[0]) return res.redirect("/?error=site_blacklisted");
    completeLogin(res, {
      discordId: row.discord_id,
      robloxId: row.roblox_user_id,
    });
  } catch (error) {
    console.warn("[oauth] Discord login failed -", error.message);
    res.redirect(error.code === "DISCORD_OAUTH_RATE_LIMITED" ? "/?error=discord_rate_limited" : "/?error=login_failed");
  }
});
app.get("/auth/roblox", (req, res) => {
  const redirect = `${PUBLIC_URL}/auth/roblox/callback`,
    state = beginOauth(res, "roblox");
  res.redirect(
    `https://apis.roblox.com/oauth/v1/authorize?client_id=${encodeURIComponent(process.env.ROBLOX_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirect)}&scope=openid%20profile&response_type=code&state=${encodeURIComponent(state)}`,
  );
});
app.get("/auth/roblox/callback", async (req, res) => {
  try {
    if (!validateOauth(req, res, "roblox"))
      throw new Error("invalid oauth state");
    const redirect = `${PUBLIC_URL}/auth/roblox/callback`;
    const basic = Buffer.from(
      `${process.env.ROBLOX_CLIENT_ID}:${process.env.ROBLOX_CLIENT_SECRET}`,
    ).toString("base64");
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
    const blocked = await api(
      `/tables/site_blacklists?roblox_user_id=${encodeURIComponent(row.roblox_user_id)}&limit=1`,
    );
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
  for (const [key, value] of pendingLoginTickets)
    if (value.expires <= now) pendingLoginTickets.delete(key);
  const ticket = String(req.query.ticket || ""),
    entry = pendingLoginTickets.get(ticket);
  if (!entry) return res.redirect("/?error=login_failed");
  pendingLoginTickets.delete(ticket);
  setSession(res, entry.profile);
  res.redirect("/dashboard");
});
app.get("/auth/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    "conjures_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
  res.redirect("/");
});
app.get(
  [
    "/dashboard",
    "/applications",
    "/applications/:id",
    "/applications/:id/edit",
    "/customroles",
    "/guides",
    "/guides/:folderId",
    "/guides/:folderId/:docId",
    "/exams",
    "/exams/:id",
    "/exams/:id/edit",
    "/terms",
    "/privacy",
  ],
  (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")),
);

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`[conjures-net] ready on ${port}`),
);
