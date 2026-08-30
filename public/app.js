const app = document.querySelector("#app"),
  nav = document.querySelector("#nav"),
  account = document.querySelector("#account"),
  modal = document.querySelector("#modal");
let me = null;
let permissionWatcher = null;
const permissionFingerprint = (user) =>
  JSON.stringify({
    authenticated: Boolean(user?.authenticated),
    blocked: Boolean(user?.siteBlacklisted),
    rank: Number(user?.rank?.number || 0),
    roles: [...(user?.roles || [])].sort(),
  });
function watchPermissions() {
  if (permissionWatcher || !me?.authenticated) return;
  let fingerprint = permissionFingerprint(me);
  permissionWatcher = setInterval(async () => {
    try {
      const latest = await request("/api/me");
      const next = permissionFingerprint(latest);
      if (next !== fingerprint) location.reload();
      fingerprint = next;
    } catch {}
  }, 30000);
}
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function request(url, options = {}) {
  const r = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}
const avatar = (u) =>
  u.headshot ||
  `https://www.roblox.com/headshot-thumbnail/image?userId=${u.roblox_user_id}&width=150&height=150&format=png`;
function chrome() {
  const rank=Number(me?.rank?.number||0),guideRoles=new Set(me?.roles||[]),showGuides=me?.authenticated&&((rank>=20&&rank<=59)||rank>=250||["Events Team","Newsletter Team","Social Media Team"].some(x=>guideRoles.has(x)));
  nav.innerHTML = me?.authenticated
    ? `<a href="/dashboard">Home</a>${showGuides?'<a href="/guides">Guides</a>':''}<a href="/applications">Applications</a><a href="/customroles">Custom Roles</a>`
    : '<a href="/">Login</a><a href="/applications">Applications</a><a href="/customroles">Custom Roles</a>';
  for (const a of nav.children)
    if (a.pathname === location.pathname) a.classList.add("active");
  account.innerHTML = me?.authenticated
    ? `<div class="account"><img class="avatar" src="${avatar(me)}" alt=""><button class="logout" id="logout" type="button">Log Out</button></div>`
    : "";
  const logout = document.querySelector("#logout");
  if (logout)
    logout.onclick = () =>
      showModal(
        "Log Out",
        "Are you sure you would like to log out?",
        async () => location.assign("/auth/logout"),
      );
}
function showModal(title, text, confirm) {
  modal.classList.remove("hidden");
  modal.innerHTML = `<div class="dialog"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="actions"><button class="ghost" id="cancel">Cancel</button><button class="primary" id="confirm">Confirm</button></div></div>`;
  modal.querySelector("#cancel").onclick = () => modal.classList.add("hidden");
  modal.querySelector("#confirm").onclick = async () => {
    modal.classList.add("hidden");
    await confirm();
  };
}
function showNotice(title, text) {
  modal.classList.remove("hidden");
  modal.innerHTML = `<div class="dialog"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="actions"><button class="primary" id="okay">Okay</button></div></div>`;
  modal.querySelector("#okay").onclick = () => modal.classList.add("hidden");
}
function guardNavigation(isDirty, clearDirty) {
  document.querySelectorAll("a[href]").forEach((link) => {
    link.onclick = (e) => {
      if (!isDirty()) return;
      e.preventDefault();
      showModal(
        "Discard Changes",
        "You have unsaved changes. Are you sure you would like to leave this page?",
        () => {
          clearDirty();
          location.assign(link.href);
        },
      );
    };
  });
}
async function login() {
  const error = new URLSearchParams(location.search).get("error");
  app.innerHTML = `<div class="login-shell"><section class="login-card"><img class="mark" src="/images/InitialTypography.png"><div class="portal-title">CONJURES PORTAL</div><p class="muted">Log in with a verified account to access applications and your dashboard.</p>${error ? `<p class="error">${error === "verification_required" ? "You're not verified on Discord. Please ensure you verify and link your Roblox account in the CONJURES Discord server, then you may proceed to log in here." : error === "site_blacklisted" ? "You are blacklisted from accessing conjures.net." : "Login could not be completed. Please try again."}</p>` : ""}<div class="auth-stack"><a class="auth discord" href="/auth/discord"><img src="/images/Discord.png" alt="">Log in with Discord</a><a class="auth" href="/auth/roblox"><img src="/images/Roblox.png" alt="">Log in with Roblox</a></div></section></div>`;
}
async function dashboard() {
  if (!me.authenticated) return login();
  app.innerHTML = `<section class="hero"><div class="eyebrow">Dashboard</div><h1>Welcome to <span class="conjures-glow">CONJURES</span></h1><p class="muted">Your central place for CONJURES applications and account access.</p></section><section class="profile-card"><img class="avatar" src="${avatar(me)}"><div class="profile-details"><h1>${esc(me.roblox_username)}</h1><p>${esc(me.rank.name)}</p><p class="muted">Roblox ID: ${esc(me.roblox_user_id)} · Discord ID: ${esc(me.discord_id)}</p><div class="role-tags">${portalRoles(
    me,
  )
    .map(
      (role) =>
        `<span class="profile-tag" style="--role:${role.color}">${esc(role.name)}</span>`,
    )
    .join("")}</div></div></section>`;
}
function portalRoles(user) {
  const rank = Number(user.rank?.number || 0),
    roles = new Set(user.roles || []),
    result = [];
  const add = (name, color, visible) => {
    if (visible) result.push({ name, color });
  };
  add("SR Team", "#f15b78", rank >= 250);
  add("Development Team", "#45d483", rank >= 60 && rank <= 69);
  add("Hosting Lead", "#c4a2ff", roles.has("Hosting Lead"));
  add("Moderation Lead", "#ff9fc3", roles.has("Moderation Lead"));
  add("Relations Lead", "#b786ff", roles.has("Relations Lead"));
  add(
    "Relations Team",
    "#a879ff",
    (rank >= 40 && rank <= 49) || roles.has("Relations Lead"),
  );
  add("HR Team", "#ff7eb6", rank >= 50 && rank <= 59);
  add("Hosting Team", "#f04747", rank >= 30 && rank <= 39);
  add("Moderation Team", "#579dff", rank >= 20 && rank <= 29);
  add("Events Lead", "#ffbd73", roles.has("Events Lead"));
  add("Newsletter Lead", "#ffe98a", roles.has("Newsletter Lead"));
  add("Social Media Lead", "#8ee8ad", roles.has("Social Media Lead"));
  add("Events Team", "#ff9f43", roles.has("Events Team"));
  add("Newsletter Team", "#f7d154", roles.has("Newsletter Team"));
  add("Social Media Team", "#58d68d", roles.has("Social Media Team"));
  return result;
}
async function applications() {
  const forms = await request("/api/applications");
  app.innerHTML = `<div class="section-head"><div><div class="eyebrow">Open opportunities</div><h1>Applications</h1><p class="muted">Explore currently available CONJURES team applications.</p></div></div>${forms.length ? `<div class="application-grid">${forms.map((f) => `<article class="application-card" style="--team:${esc(f.team_color)}"><span class="tag">${esc(f.team_label)}</span><h3>${esc(f.name)}</h3><p class="muted">${f.schema.reduce((n, s) => n + (s.questions?.filter((q) => !q.locked).length || 0), 0)} Questions</p><div class="card-meta"><b>CONJURES</b><div class="actions">${f.canEdit ? `<a class="ghost" href="/applications/${f.id}/edit">Edit</a>` : ""}${!me.authenticated ? `<a class="primary" href="/">Log in to Apply</a>` : f.applicationState === "blacklisted" ? '<span class="disabled">You are blacklisted</span>' : f.applicationState === "pending" ? '<span class="disabled">Pending Application</span>' : f.applicationState === "denied" ? `<span class="disabled">Denied - Apply in ${f.daysRemaining} day${f.daysRemaining === 1 ? "" : "s"}</span>` : f.canApply ? `<a class="primary" href="/applications/${f.id}">Apply Now</a>` : f.canEdit && !f.is_open ? '<span class="disabled">Closed</span>' : '<span class="disabled">You are unable to apply</span>'}</div></div></article>`).join("")}</div>` : `<div class="empty-state"><div class="empty-icon">!</div><p>All applications are currently closed. We encourage you to stay engaged in our communications server to be notified when our applications are released.</p></div>`}`;
}
async function loadPayPal(clientId, createOrder, onApprove, onCancel) {
  if (!window.paypal) await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&components=buttons&disable-funding=venmo`;s.onload=resolve;s.onerror=()=>reject(new Error("PayPal could not be loaded."));document.head.appendChild(s);});
  document.querySelector("#paypal-buttons").innerHTML="";
  let checkoutError=null,activeOrderId=null;
  const release=async(orderId)=>{if(!orderId)return;try{await onCancel?.(orderId);}catch(error){console.warn("Could not immediately release checkout reservation",error);}};
  await window.paypal.Buttons({style:{layout:"vertical",shape:"rect",label:"paypal"},createOrder:async()=>{try{checkoutError=null;activeOrderId=await createOrder();return activeOrderId;}catch(error){checkoutError=error;throw error;}},onApprove:async(data)=>{activeOrderId=null;await onApprove(data);},onCancel:async(data)=>{const orderId=data?.orderID||activeOrderId;activeOrderId=null;await release(orderId);showNotice("Purchase Cancelled","No payment was taken. The recipient is immediately available for another checkout.");},onError:async()=>{const orderId=activeOrderId;activeOrderId=null;await release(orderId);showNotice("Payment Error",checkoutError?.message||"PayPal could not complete the purchase. Please try again.");}}).render("#paypal-buttons");
}
async function customRoles() {
  const state=await request("/api/customroles");
  app.innerHTML=`<div class="section-head"><div><div class="eyebrow">PERSONALIZE YOUR PROFILE</div><h1>Custom Roles</h1><p class="muted">Purchase a personal Discord role for yourself or gift one to another verified CONJURES member.</p></div></div><div class="custom-role-layout"><section class="custom-role-card"><span class="tag" style="--team:#ef4b5f">CUSTOM ROLE</span><h2>$30.00 <small>USD</small></h2><p>Create one personalized role with a custom name, solid or gradient color, and role icon.</p>${!state.authenticated?'<a class="primary purchase-login" href="/">Log in to Purchase</a>':state.hasRole?'<div class="empty-state compact"><div class="empty-icon">✓</div><p>You already have an active custom role. Each member may have only one.</p></div>':state.atCapacity?'<div class="empty-state compact"><div class="empty-icon">!</div><p>Custom roles are currently at the capacity of 100. Please check back later.</p></div>':`<div class="purchase-mode"><label><input type="radio" name="purchase-for" value="self" checked> Purchase for myself</label><label><input type="radio" name="purchase-for" value="gift"> Gift to another member</label></div><div id="gift-fields" class="hidden"><label>Recipient's Roblox username, Roblox ID, or Discord ID</label><div class="gift-row"><input id="gift-target" placeholder="Username or ID"><button class="ghost" id="check-gift">Check Eligibility</button></div><p class="muted" id="gift-status"></p></div><label class="terms-check"><input type="checkbox" id="accept-terms"> I have read and agree to the Custom Role Terms & Conditions.</label><div id="paypal-buttons"></div><p class="muted payment-note">The role is created only after PayPal confirms the completed payment.</p>`}</section><section class="terms-card"><details><summary>Custom Role Terms & Conditions</summary><div class="terms-content"><h3>Purchases and refunds</h3><p>All purchases are final and non-refundable to the fullest extent permitted by law and PayPal policy, including accidental, duplicate, mistaken, gifted, or unauthorized-by-you purchases. Review the recipient before paying.</p><h3>One role per member</h3><p>Each member may have only one Custom Role in total, whether purchased, gifted, or granted. A role may not be sold, traded, transferred, or shared without written staff approval.</p><h3>Customization</h3><p>Role names, colors, gradients, and icons must remain appropriate and comply with CONJURES rules, Discord's Terms of Service, and applicable law. Impersonating, misleading, hateful, sexual/NSFW, discriminatory, illegal, or disruptive content is prohibited. Customization is limited to once every three hours.</p><h3>Moderation and availability</h3><p>Staff may reject, modify, or remove a role when reasonably necessary for moderation, server management, safety, or Discord policy compliance. A moderation action involving the role does not qualify for a refund. Some features, including gradients and icons, depend on Discord server features being available.</p><h3>Leaving and bans</h3><p>If the recipient leaves or is banned from CONJURES, the role will be removed without refund or automatic restoration. A later return requires a new eligible purchase.</p><h3>Fraud and disputes</h3><p>Fraud, chargebacks, false disputes, attempts to bypass eligibility, or manipulation of the purchase process may lead to removal of the role and further server action.</p><p>By completing payment, you confirm that you are authorized to pay, the selected recipient is correct, and you accept these terms.</p></div></details></section></div>`;
  if(!state.authenticated||state.hasRole||state.atCapacity)return;
  let gift=false,eligible=false,target="";
  const terms=document.querySelector("#accept-terms"),giftFields=document.querySelector("#gift-fields"),status=document.querySelector("#gift-status");
  document.querySelectorAll('[name="purchase-for"]').forEach(x=>x.onchange=()=>{gift=x.value==="gift"&&x.checked;giftFields.classList.toggle("hidden",!gift);eligible=!gift;status.textContent="";}); eligible=true;
  document.querySelector("#check-gift").onclick=async()=>{try{target=document.querySelector("#gift-target").value.trim();const result=await request("/api/customroles/check-gift",{method:"POST",body:JSON.stringify({target})});eligible=result.eligible;status.textContent=result.eligible?`Eligible: ${result.robloxUsername} (${result.robloxId}) · Discord ID: ${result.discordId}`:result.reason;}catch(e){eligible=false;status.textContent=e.message;}};
  await loadPayPal(state.paypalClientId,async()=>{if(!terms.checked)throw new Error("Accept the Terms & Conditions first.");if(gift&&!eligible)throw new Error("Check that the recipient is eligible first.");const result=await request("/api/customroles/order",{method:"POST",body:JSON.stringify({gift,target})});return result.id;},async(data)=>{try{await request(`/api/customroles/order/${encodeURIComponent(data.orderID)}/capture`,{method:"POST",body:"{}"});showNotice("Purchase Complete","Your payment was confirmed. CONJURESBOT is creating and assigning the custom role now.");setTimeout(()=>location.reload(),2500);}catch(e){showNotice("Fulfillment Pending",e.message);}},async orderId=>request(`/api/customroles/order/${encodeURIComponent(orderId)}/cancel`,{method:"POST",body:"{}"}));
}
const GUIDE_FOLDER_KEYS=["administrators","create","delete"],GUIDE_DOCUMENT_KEYS=["administrators","edit","view"];
function permissionEditor(keys,permissions,roles,prefix="perm") {return `<div class="permission-grid">${keys.map(key=>`<fieldset><legend>${esc(key.replace(/(^.|_.)/g,x=>x.replace('_',' ').toUpperCase()))}</legend>${roles.map(role=>`<label><input type="checkbox" data-permission="${key}" value="${esc(role)}" ${(permissions?.[key]||[]).includes(role)?"checked":""}> <span>${esc(role)}</span></label>`).join("")}</fieldset>`).join("")}</div>`;}
function readPermissions(root,keys){return Object.fromEntries(keys.map(key=>[key,[...root.querySelectorAll(`[data-permission="${key}"]:checked`)].map(x=>x.value)]));}
const dateOnly=value=>new Date(value).toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"});
async function askText(title,label,value="") {return new Promise(resolve=>{modal.classList.remove("hidden");modal.innerHTML=`<div class="dialog"><h2>${esc(title)}</h2><label>${esc(label)}</label><input id="prompt-value" value="${esc(value)}"><div class="actions"><button class="ghost" id="cancel">Cancel</button><button class="primary" id="confirm">Continue</button></div></div>`;modal.querySelector("#cancel").onclick=()=>{modal.classList.add("hidden");resolve(null)};modal.querySelector("#confirm").onclick=()=>{const result=modal.querySelector("#prompt-value").value;modal.classList.add("hidden");resolve(result)};modal.querySelector("#prompt-value").focus();});}
async function guides(){const data=await request("/api/guides");app.innerHTML=`<div class="section-head guide-heading"><div><div class="eyebrow">KNOWLEDGE LIBRARY</div><h1>Guides</h1><p class="muted">Browse internal CONJURES documentation available to your teams.</p></div>${data.canCreateFolders?'<button class="primary" id="new-folder">+ New Folder</button>':''}</div><div id="folder-editor"></div>${data.folders.length?`<div class="guide-folder-grid">${data.folders.map(folder=>`<article class="guide-folder-card"><div class="folder-icon">▰</div><div><h2>${esc(folder.name)}</h2><p class="muted">${esc(folder.description||"No description provided.")}</p><span>${folder.documents.length} document${folder.documents.length===1?"":"s"}</span></div><div class="folder-actions"><a class="primary" href="/guides/${folder.id}">Open</a>${data.canCreateFolders?`<button class="ghost edit-folder" data-id="${folder.id}">Manage</button><button class="danger delete-folder" data-id="${folder.id}">Delete</button>`:""}</div></article>`).join("")}</div>`:'<div class="empty-state"><div class="empty-icon">!</div><p>No guide folders are currently available to you.</p></div>'}`;
 const editor=document.querySelector("#folder-editor"),renderEditor=(folder={name:"",description:"",permissions:{}})=>{editor.innerHTML=`<section class="guide-admin-panel"><h2>${folder.id?"Manage Folder":"Create Folder"}</h2><div class="row"><label>Folder Name<input id="folder-name" value="${esc(folder.name)}"></label><label>Description<input id="folder-description" value="${esc(folder.description||"")}"></label></div><h3>Folder Permissions</h3><p class="muted">Administrators manage the entire folder. The remaining groups control document creation, deletion, content editing, and viewing.</p>${permissionEditor(GUIDE_FOLDER_KEYS,folder.permissions,data.roleOptions)}<div class="actions"><button class="ghost" id="cancel-folder">Cancel</button><button class="primary" id="save-folder">Save Folder</button></div></section>`;editor.scrollIntoView({behavior:"smooth",block:"start"});document.querySelector("#cancel-folder").onclick=()=>editor.innerHTML="";document.querySelector("#save-folder").onclick=async()=>{try{const body={name:document.querySelector("#folder-name").value,description:document.querySelector("#folder-description").value,permissions:readPermissions(editor,GUIDE_FOLDER_KEYS)};await request(folder.id?`/api/guides/folders/${folder.id}`:"/api/guides/folders",{method:folder.id?"PATCH":"POST",body:JSON.stringify(body)});showNotice("Folder Saved","The guide folder and its permissions have been saved.");setTimeout(()=>guides(),700);}catch(e){showNotice("Folder Not Saved",e.message);}}};
 document.querySelector("#new-folder")?.addEventListener("click",()=>renderEditor());document.querySelectorAll(".edit-folder").forEach(button=>button.onclick=()=>renderEditor(data.folders.find(x=>x.id===button.dataset.id)));document.querySelectorAll(".delete-folder").forEach(button=>button.onclick=()=>showModal("Delete Folder","This permanently deletes the folder and every document inside it. Continue?",async()=>{try{await request(`/api/guides/folders/${button.dataset.id}`,{method:"DELETE"});await guides();}catch(e){showNotice("Folder Not Deleted",e.message);}}));}
async function guideFolder(folderId){const folder=await request(`/api/guides/folders/${folderId}`);app.innerHTML=`<div class="guide-breadcrumb"><a href="/guides">Guides</a><span>›</span><b>${esc(folder.name)}</b></div><div class="section-head"><div><div class="eyebrow">GUIDE FOLDER</div><h1>${esc(folder.name)}</h1><p class="muted">${esc(folder.description||"")}</p></div>${folder.abilities.create?'<button class="primary" id="new-document">+ New Document</button>':''}</div><div id="document-editor"></div>${folder.documents.length?`<div class="guide-document-list">${folder.documents.map(doc=>`<article><div class="doc-mark">≡</div><div><h3>${esc(doc.title)}</h3><p class="muted">Last Updated: ${dateOnly(doc.updated_at)}</p></div><div class="actions"><a class="primary" href="/guides/${folder.id}/${doc.id}">Open</a>${doc.abilities.admin?`<button class="ghost manage-document" data-id="${doc.id}">Permissions</button>`:""}${doc.abilities.delete?`<button class="danger delete-document" data-id="${doc.id}">Delete</button>`:""}</div></article>`).join("")}</div>`:'<div class="empty-state"><div class="empty-icon">!</div><p>No documents are currently available in this folder.</p></div>'}`;
 const panel=document.querySelector("#document-editor"),renderDoc=(doc={title:"",permissions:{}})=>{panel.innerHTML=`<section class="guide-admin-panel"><h2>${doc.id?"Document Settings":"Create Document"}</h2><label>Document Title<input id="document-title" value="${esc(doc.title)}"></label><h3>Document Permissions</h3><p class="muted">Administrators control settings and content. Editors change content only. Viewers have read-only access.</p>${permissionEditor(GUIDE_DOCUMENT_KEYS,doc.permissions,folder.roleOptions)}<div class="actions"><button class="ghost" id="cancel-document">Cancel</button><button class="primary" id="save-document">${doc.id?"Save Settings":"Create Document"}</button></div></section>`;panel.scrollIntoView({behavior:"smooth",block:"start"});document.querySelector("#cancel-document").onclick=()=>panel.innerHTML="";document.querySelector("#save-document").onclick=async()=>{try{const body={title:document.querySelector("#document-title").value,permissions:readPermissions(panel,GUIDE_DOCUMENT_KEYS)};if(doc.id)await request(`/api/guides/folders/${folder.id}/documents/${doc.id}`,{method:"PATCH",body:JSON.stringify(body)});else await request(`/api/guides/folders/${folder.id}/documents`,{method:"POST",body:JSON.stringify(body)});showNotice(doc.id?"Settings Saved":"Document Created",doc.id?"Document permissions have been updated.":"The document is ready to edit.");setTimeout(()=>guideFolder(folder.id),700);}catch(e){showNotice("Document Not Saved",e.message);}}};
 document.querySelector("#new-document")?.addEventListener("click",()=>renderDoc());document.querySelectorAll(".manage-document").forEach(button=>button.onclick=()=>renderDoc(folder.documents.find(x=>x.id===button.dataset.id)));document.querySelectorAll(".delete-document").forEach(button=>button.onclick=()=>showModal("Delete Document","This permanently deletes the document. Continue?",async()=>{try{await request(`/api/guides/folders/${folder.id}/documents/${button.dataset.id}`,{method:"DELETE"});await guideFolder(folder.id);}catch(e){showNotice("Document Not Deleted",e.message);}}));}
function guideToolbar(){return `<div class="guide-toolbar"><button data-command="undo" title="Undo">↶</button><button data-command="redo" title="Redo">↷</button><select id="block-style" title="Text style"><option value="p">Normal text</option>${[1,2,3,4,5,6].map(x=>`<option value="h${x}">Heading ${x}</option>`).join("")}<option value="blockquote">Quote</option><option value="pre">Code block</option></select><select id="font-name" title="Font"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option><option>Times New Roman</option></select><select id="font-size" title="Text size">${[10,12,14,16,18,20,24,28,32,40,48,60].map(x=>`<option value="${x}" ${x===16?"selected":""}>${x}</option>`).join("")}</select><select id="line-spacing" title="Line and paragraph spacing"><option value="1">1.0 spacing</option><option value="1.15">1.15 spacing</option><option value="1.5">1.5 spacing</option><option value="2">2.0 spacing</option></select><button data-command="bold"><b>B</b></button><button data-command="italic"><i>I</i></button><button data-command="underline"><u>U</u></button><button data-command="strikeThrough"><s>S</s></button><label class="color-tool" title="Text color">A<input type="color" id="text-color" value="#ffffff"></label><label class="color-tool highlight" title="Highlight">▰<input type="color" id="highlight-color" value="#ef4b5f"></label><button data-command="justifyLeft" title="Align left">≡</button><button data-command="justifyCenter" title="Align center">≡</button><button data-command="justifyRight" title="Align right">≡</button><button data-command="insertUnorderedList" title="Bulleted list">•☰</button><button data-command="insertOrderedList" title="Numbered list">1☰</button><button data-command="outdent" title="Decrease indent">⇤</button><button data-command="indent" title="Increase indent">⇥</button><button id="insert-link" title="Insert link">🔗</button><button id="insert-image" title="Insert image URL">▧</button><button id="insert-table" title="Insert table">▦</button><button id="insert-checklist" title="Checklist">☑</button><button id="insert-note" title="Note callout">ⓘ</button><button id="insert-line" title="Horizontal line">—</button><button id="insert-details" title="Collapsible section">⌄</button><button id="insert-header" title="Insert header">H</button><button id="insert-footer" title="Insert footer">F</button><button id="clear-format" title="Clear formatting">Tx</button></div>`;}
async function guideDocument(folderId,docId){const doc=await request(`/api/guides/folders/${folderId}/documents/${docId}`);let editing=false,dirty=false,saving=false,autosave=null,lastSaved=doc.content_html||"<p></p>";const render=()=>{app.innerHTML=`<div class="guide-breadcrumb"><a href="/guides">Guides</a><span>›</span><a href="/guides/${doc.folder.id}">${esc(doc.folder.name)}</a><span>›</span><b>${esc(doc.title)}</b></div><article class="guide-document"><div class="guide-document-head"><div><div class="eyebrow">INTERNAL GUIDE</div><h1>${esc(doc.title)}</h1><p class="muted" id="last-updated">Last Updated: ${dateOnly(doc.updated_at)}</p></div>${doc.abilities.edit?`<button class="primary" id="toggle-edit">${editing?"Editing":"Edit"}</button>`:""}</div>${editing?guideToolbar():""}<div id="guide-content" class="guide-content ${editing?"is-editing":""}" ${editing?'contenteditable="true" spellcheck="true"':""}>${lastSaved}</div>${editing?'<div class="guide-savebar"><span class="muted" id="save-status">All changes saved</span><div class="actions"><button class="ghost" id="discard-guide">Discard Changes</button><button class="primary" id="save-guide">Save Changes</button></div></div>':""}</article>`;document.querySelector("#toggle-edit")?.addEventListener("click",()=>{if(!editing){editing=true;render();wireEditor();}});};
 const save=async(silent=false)=>{if(!dirty||saving)return;saving=true;const status=document.querySelector("#save-status");if(status)status.textContent="Saving…";try{const html=document.querySelector("#guide-content").innerHTML,result=await request(`/api/guides/folders/${folderId}/documents/${docId}`,{method:"PATCH",body:JSON.stringify({contentHtml:html})});lastSaved=result.content_html||html;doc.updated_at=result.updated_at;dirty=false;if(status)status.textContent="Saved just now";if(!silent)showNotice("Changes Saved","Your guide changes have been saved successfully.");}catch(e){if(status)status.textContent="Save failed";if(!silent)showNotice("Changes Not Saved",e.message);}finally{saving=false;}};
 const wireEditor=()=>{const area=document.querySelector("#guide-content"),changed=()=>{dirty=true;document.querySelector("#save-status").textContent="Unsaved changes"},insert=html=>{document.execCommand("insertHTML",false,html);changed()};area.addEventListener("input",changed);document.querySelectorAll("[data-command]").forEach(button=>button.onclick=()=>{document.execCommand(button.dataset.command,false,null);area.focus();changed();});document.querySelector("#block-style").onchange=e=>{document.execCommand("formatBlock",false,e.target.value);changed()};document.querySelector("#font-name").onchange=e=>{document.execCommand("fontName",false,e.target.value);changed()};document.querySelector("#font-size").onchange=e=>{document.execCommand("fontSize",false,"7");area.querySelectorAll('font[size="7"]').forEach(node=>{node.removeAttribute("size");node.style.fontSize=`${e.target.value}px`});changed()};document.querySelector("#line-spacing").onchange=e=>{const selection=getSelection(),node=selection?.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection?.anchorNode;if(node&&area.contains(node)){(node.closest("p,div,li,blockquote,h1,h2,h3,h4,h5,h6")||node).style.lineHeight=e.target.value;changed()}};document.querySelector("#text-color").oninput=e=>{document.execCommand("foreColor",false,e.target.value);changed()};document.querySelector("#highlight-color").oninput=e=>{document.execCommand("hiliteColor",false,e.target.value);changed()};document.querySelector("#insert-link").onclick=async()=>{const url=await askText("Insert Link","URL");if(url){document.execCommand("createLink",false,url);changed()}};document.querySelector("#insert-image").onclick=async()=>{const url=await askText("Insert Image","Image URL");if(url){document.execCommand("insertImage",false,url);changed()}};document.querySelector("#insert-table").onclick=()=>insert("<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p></p>");document.querySelector("#insert-checklist").onclick=()=>insert('<ul class="checklist"><li>Checklist item</li></ul><p></p>');document.querySelector("#insert-note").onclick=()=>insert('<aside class="guide-note"><b>Note</b><p>Add important information here.</p></aside><p></p>');document.querySelector("#insert-line").onclick=()=>{document.execCommand("insertHorizontalRule");changed()};document.querySelector("#insert-details").onclick=()=>insert("<details><summary>Section title</summary><p>Section content</p></details><p></p>");document.querySelector("#insert-header").onclick=()=>insert('<header class="document-header">Document header</header><p></p>');document.querySelector("#insert-footer").onclick=()=>insert('<footer class="document-footer">Document footer</footer><p></p>');document.querySelector("#clear-format").onclick=()=>{document.execCommand("removeFormat");changed()};document.querySelector("#save-guide").onclick=()=>save(false);document.querySelector("#discard-guide").onclick=()=>{showModal("Discard Changes","Discard all changes since the last save?",()=>{dirty=false;editing=false;render()})};clearInterval(autosave);autosave=setInterval(()=>save(true),60000);guardNavigation(()=>dirty,()=>{dirty=false;clearInterval(autosave)});window.onbeforeunload=()=>dirty?"You have unsaved guide changes.":undefined;area.focus();};render();}
// Guides v2: focused management and a dark, Planka-style document editor.
async function guidesV2() {
  const data = await request("/api/guides");
  const folderList = () => data.folders.length
    ? `<div id="guide-folder-list" class="guide-folder-grid">${data.folders.map((folder) => `<article class="guide-folder-card" style="--folder-color:${esc(folder.icon_color || "#ef4b5f")}"><div class="folder-icon">▰</div><div><h2>${esc(folder.name)}</h2><p class="muted">${esc(folder.description || "No description provided.")}</p></div><div class="folder-actions"><a class="primary" href="/guides/${folder.id}">Open</a>${data.canCreateFolders ? `<button class="ghost edit-folder-v2" data-id="${folder.id}">Manage</button><button class="danger delete-folder-v2" data-id="${folder.id}" ${folder.documents.length ? `disabled title="Delete all ${folder.documents.length} documents first"` : ""}>Delete</button>` : ""}</div></article>`).join("")}</div>`
    : '<div id="guide-folder-list" class="empty-state"><div class="empty-icon">!</div><p>No guide folders are currently available to you.</p></div>';
  app.innerHTML = `<div class="section-head guide-heading"><div><div class="eyebrow">KNOWLEDGE LIBRARY</div><h1>Guides</h1><p class="muted">Browse internal CONJURES documentation available to your teams.</p></div>${data.canCreateFolders ? '<button class="primary" id="new-folder-v2">+ New Folder</button>' : ""}</div><div id="folder-editor-v2"></div>${folderList()}`;
  const panel = document.querySelector("#folder-editor-v2");
  const renderEditor = (folder = { name: "", description: "", icon_color: "#ef4b5f", permissions: {} }) => {
    document.querySelector("#guide-folder-list")?.classList.add("hidden");
    panel.innerHTML = `<section class="guide-admin-panel"><h2>${folder.id ? "Manage Folder" : "Create Folder"}</h2><div class="row"><label>Folder Name<input id="folder-name-v2" value="${esc(folder.name)}"></label><label>Description<input id="folder-description-v2" value="${esc(folder.description || "")}"></label></div><label class="folder-color-setting">Folder Icon Color<div><input type="color" id="folder-color-picker-v2" value="${esc(folder.icon_color || "#ef4b5f")}"><input id="folder-color-v2" value="${esc(folder.icon_color || "#ef4b5f")}" maxlength="7" pattern="#[0-9A-Fa-f]{6}"></div></label><h3>Folder Permissions</h3><p class="muted">Administrators manage the folder. Create controls who may add documents, and Delete controls who may remove them.</p>${permissionEditor(GUIDE_FOLDER_KEYS, folder.permissions, data.roleOptions)}<div class="actions"><button class="ghost" id="cancel-folder-v2">Close</button><button class="primary" id="save-folder-v2">Save Folder</button></div></section>`;
    const picker=document.querySelector("#folder-color-picker-v2"),hex=document.querySelector("#folder-color-v2");picker.oninput=()=>hex.value=picker.value;hex.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(hex.value))picker.value=hex.value};
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#cancel-folder-v2").onclick = () => { panel.innerHTML = ""; document.querySelector("#guide-folder-list")?.classList.remove("hidden"); };
    document.querySelector("#save-folder-v2").onclick = async () => {
      try {
        await request(folder.id ? `/api/guides/folders/${folder.id}` : "/api/guides/folders", { method: folder.id ? "PATCH" : "POST", body: JSON.stringify({ name: document.querySelector("#folder-name-v2").value, description: document.querySelector("#folder-description-v2").value, iconColor: document.querySelector("#folder-color-v2").value, permissions: readPermissions(panel, GUIDE_FOLDER_KEYS) }) });
        showNotice("Folder Saved", "The folder and its permissions have been saved.");
        setTimeout(() => guidesV2(), 500);
      } catch (error) { showNotice("Folder Not Saved", error.message); }
    };
  };
  document.querySelector("#new-folder-v2")?.addEventListener("click", () => renderEditor());
  document.querySelectorAll(".edit-folder-v2").forEach((button) => button.onclick = () => renderEditor(data.folders.find((folder) => folder.id === button.dataset.id)));
  document.querySelectorAll(".delete-folder-v2").forEach((button) => button.onclick = async () => {
    if (button.disabled) return;
    const folder = data.folders.find((item) => item.id === button.dataset.id);
    const typed = await askText("Delete Folder", `Type ${folder.name} to permanently delete this empty folder`);
    if (typed !== folder.name) return showNotice("Folder Not Deleted", "The folder name did not match.");
    try { await request(`/api/guides/folders/${folder.id}`, { method: "DELETE" }); await guidesV2(); } catch (error) { showNotice("Folder Not Deleted", error.message); }
  });
}

async function guideFolderV2(folderId) {
  const folder = await request(`/api/guides/folders/${folderId}`);
  const cards = folder.documents.length ? `<div class="guide-document-list">${folder.documents.map((doc) => `<article class="${doc.pinned ? "is-pinned" : ""}"><div class="doc-mark">${doc.pinned ? "📌" : "≡"}</div><div><h3>${esc(doc.title)}</h3><p class="muted">${doc.pinned ? "Pinned · " : ""}Last Updated: ${dateOnly(doc.updated_at)}</p></div><div class="actions"><a class="primary" href="/guides/${folder.id}/${doc.id}">Open</a>${doc.abilities.admin ? `<button class="ghost pin-document-v2" data-id="${doc.id}" data-pinned="${Boolean(doc.pinned)}">${doc.pinned ? "Unpin" : "Pin"}</button><button class="ghost manage-document-v2" data-id="${doc.id}">Settings</button>` : ""}${doc.abilities.delete ? `<button class="danger delete-document-v2" data-id="${doc.id}">Delete</button>` : ""}</div></article>`).join("")}</div>` : '<div class="empty-state"><div class="empty-icon">!</div><p>No documents are currently available in this folder.</p></div>';
  app.innerHTML = `<div class="guide-breadcrumb"><a href="/guides">Guides</a><span>›</span><b>${esc(folder.name)}</b></div><div class="section-head"><div><div class="eyebrow">GUIDE FOLDER</div><h1>${esc(folder.name)}</h1><p class="muted">${esc(folder.description || "")}</p></div>${folder.abilities.create ? '<button class="primary" id="new-document-v2">+ New Document</button>' : ""}</div><div id="document-editor-v2"></div><div id="guide-document-list">${cards}</div>`;
  const panel = document.querySelector("#document-editor-v2");
  const renderSettings = (doc = { title: "", permissions: {}, pinned: false }) => {
    document.querySelector("#guide-document-list")?.classList.add("hidden");
    panel.innerHTML = `<section class="guide-admin-panel"><h2>${doc.id ? "Document Settings" : "Create Document"}</h2><label>Document Title<input id="document-title-v2" value="${esc(doc.title)}"></label>${doc.id ? `<label class="pin-setting"><input type="checkbox" id="document-pinned-v2" ${doc.pinned ? "checked" : ""}> Pin this document to the top of the folder</label>` : ""}<h3>Document Permissions</h3><p class="muted">Administrators control settings and content. Editors change content. Viewers have read-only access.</p>${permissionEditor(GUIDE_DOCUMENT_KEYS, doc.permissions, folder.roleOptions)}<div class="actions"><button class="ghost" id="cancel-document-v2">Close</button><button class="primary" id="save-document-v2">${doc.id ? "Save Settings" : "Create Document"}</button></div></section>`;
    document.querySelector("#cancel-document-v2").onclick = () => { panel.innerHTML = ""; document.querySelector("#guide-document-list")?.classList.remove("hidden"); };
    document.querySelector("#save-document-v2").onclick = async () => {
      try {
        const body = { title: document.querySelector("#document-title-v2").value, permissions: readPermissions(panel, GUIDE_DOCUMENT_KEYS) };
        if (doc.id) body.pinned = document.querySelector("#document-pinned-v2").checked;
        await request(doc.id ? `/api/guides/folders/${folder.id}/documents/${doc.id}` : `/api/guides/folders/${folder.id}/documents`, { method: doc.id ? "PATCH" : "POST", body: JSON.stringify(body) });
        showNotice(doc.id ? "Settings Saved" : "Document Created", doc.id ? "Document settings have been updated." : "The document is ready to edit.");
        setTimeout(() => guideFolderV2(folder.id), 500);
      } catch (error) { showNotice("Document Not Saved", error.message); }
    };
  };
  document.querySelector("#new-document-v2")?.addEventListener("click", () => renderSettings());
  document.querySelectorAll(".manage-document-v2").forEach((button) => button.onclick = () => renderSettings(folder.documents.find((doc) => doc.id === button.dataset.id)));
  document.querySelectorAll(".pin-document-v2").forEach((button) => button.onclick = async () => { try { await request(`/api/guides/folders/${folder.id}/documents/${button.dataset.id}`, { method: "PATCH", body: JSON.stringify({ pinned: button.dataset.pinned !== "true" }) }); await guideFolderV2(folder.id); } catch (error) { showNotice("Pin Not Updated", error.message); } });
  document.querySelectorAll(".delete-document-v2").forEach((button) => button.onclick = () => showModal("Delete Document", "This permanently deletes the document and cannot be undone. Continue?", async () => { try { await request(`/api/guides/folders/${folder.id}/documents/${button.dataset.id}`, { method: "DELETE" }); await guideFolderV2(folder.id); } catch (error) { showNotice("Document Not Deleted", error.message); } }));
}

function guideToolbarV2() {
  const button=(command,title,icon)=>`<button data-command="${command}" title="${title}" aria-label="${title}">${icon}</button>`;
  return `<div class="guide-toolbar">${button("undo","Undo","↶")}${button("redo","Redo","↷")}<span class="toolbar-separator"></span><select id="block-style" title="Text style" aria-label="Text style"><option value="p">Normal text</option>${[1,2,3,4,5,6].map((n)=>`<option value="h${n}">Heading ${n}</option>`).join("")}<option value="blockquote">Quote</option></select><select id="font-name" title="Font" aria-label="Font"><option>Inter</option><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option><option>Times New Roman</option></select><select id="font-size" title="Text size" aria-label="Text size">${[10,12,14,16,18,20,24,28,32,40,48,60].map((n)=>`<option value="${n}" ${n===16?"selected":""}>${n}</option>`).join("")}</select><select id="line-spacing" title="Line and paragraph spacing" aria-label="Line and paragraph spacing"><option value="1">1.0 spacing</option><option value="1.15">1.15 spacing</option><option value="1.5">1.5 spacing</option><option value="2">2.0 spacing</option></select><span class="toolbar-separator"></span>${button("bold","Bold","<b>B</b>")}${button("italic","Italic","<i>I</i>")}${button("underline","Underline","<u>U</u>")}${button("strikeThrough","Strikethrough","<s>S</s>")}<label class="color-tool" title="Text color">A<input type="color" id="text-color" value="#ffffff" aria-label="Text color"></label><label class="color-tool" title="Highlight color">▰<input type="color" id="highlight-color" value="#ef4b5f" aria-label="Highlight color"></label><span class="toolbar-separator"></span>${button("justifyLeft","Align left","≡")}${button("justifyCenter","Align center","≡")}${button("justifyRight","Align right","≡")}${button("insertUnorderedList","Bulleted list","•☰")}${button("insertOrderedList","Numbered list","1☰")}${button("outdent","Decrease indent","⇤")}${button("indent","Increase indent","⇥")}<span class="toolbar-separator"></span><button id="insert-link-v2" title="Insert link" aria-label="Insert link">🔗</button><button id="upload-image-v2" title="Upload image" aria-label="Upload image">▧</button><input id="guide-image-input" class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><button id="insert-code-v2" title="Code block" aria-label="Code block">&lt;/&gt;</button><button id="insert-table-v2" title="Insert table" aria-label="Insert table">▦</button><button id="table-row-v2" title="Add table row">+R</button><button id="table-col-v2" title="Add table column">+C</button><button id="insert-checklist-v2" title="Checklist">☑</button><select id="insert-note-v2" title="Note callout" aria-label="Note callout"><option value="">ⓘ Note</option><option value="red">Red note</option><option value="blue">Blue note</option><option value="green">Green note</option><option value="yellow">Yellow note</option></select><button id="insert-line-v2" title="Horizontal line">—</button><button id="insert-details-v2" title="Collapsible section">⌄</button>${button("removeFormat","Clear formatting","Tx")}</div><div id="selection-toolbar" class="selection-toolbar hidden"><select id="selection-style" title="Text style"><option value="p">Text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>${button("bold","Bold","<b>B</b>")}${button("italic","Italic","<i>I</i>")}${button("underline","Underline","<u>U</u>")}${button("strikeThrough","Strikethrough","<s>S</s>")}<button id="selection-code" title="Inline code">&lt;/&gt;</button><label class="color-tool" title="Text color">A<input type="color" id="selection-color" value="#ffffff"></label><button id="selection-link" title="Insert link">🔗</button></div>`;
}

function decorateCodeBlocks(area) {
  area.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector(":scope > .code-copy")) return;
    const button = document.createElement("button");
    button.className = "code-copy";
    button.type = "button";
    button.contentEditable = "false";
    button.title = "Copy code";
    button.setAttribute("aria-label", "Copy code");
    const copyIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>',checkIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"></path></svg>';
    button.innerHTML = copyIcon;
    button.onclick = async () => { await navigator.clipboard.writeText(pre.querySelector("code")?.innerText || [...pre.childNodes].filter((node) => node !== button).map((node) => node.textContent).join("")); button.innerHTML=checkIcon;button.classList.add("copied");setTimeout(()=>{button.innerHTML=copyIcon;button.classList.remove("copied")},1200); };
    pre.prepend(button);
  });
}

async function guideDocumentV2(folderId, docId) {
  const doc = await request(`/api/guides/folders/${folderId}/documents/${docId}`);
  let editing = false, dirty = false, saving = false, autosave = null, savedRange = null, lastSaved = doc.content_html || "<p><br></p>";
  const captureRange = () => { const selection = getSelection(); if (selection?.rangeCount) savedRange = selection.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { if (!savedRange) return; const selection = getSelection(); selection.removeAllRanges(); selection.addRange(savedRange); };
  const exitEditor = () => {
    if(!dirty){editing=false;clearInterval(autosave);render();return;}
    modal.classList.remove("hidden");
    modal.innerHTML='<div class="dialog"><h2>Leave Editing Mode?</h2><p>You have unsaved changes. Save them, discard them, or continue editing.</p><div class="actions"><button class="ghost" id="edit-exit-cancel">Cancel</button><button class="danger" id="edit-exit-discard">Discard Changes</button><button class="primary" id="edit-exit-save">Save Changes</button></div></div>';
    modal.querySelector("#edit-exit-cancel").onclick=()=>modal.classList.add("hidden");
    modal.querySelector("#edit-exit-discard").onclick=()=>{modal.classList.add("hidden");dirty=false;editing=false;clearInterval(autosave);render()};
    modal.querySelector("#edit-exit-save").onclick=async()=>{await save(true);if(!dirty){modal.classList.add("hidden");editing=false;clearInterval(autosave);render()}};
  };
  const render = () => {
    app.innerHTML = `<div class="guide-breadcrumb"><a href="/guides">Guides</a><span>›</span><a href="/guides/${doc.folder.id}">${esc(doc.folder.name)}</a><span>›</span><b>${esc(doc.title)}</b></div><article class="guide-document"><div class="guide-document-head"><div><div class="eyebrow">CONFIDENTIAL</div><h1>${esc(doc.title)}</h1><p class="muted">Last Updated: ${dateOnly(doc.updated_at)}</p></div>${doc.abilities.edit ? `<button class="primary" id="toggle-edit-v2">${editing ? "Editing" : "Edit"}</button>` : ""}</div>${editing ? guideToolbarV2() : ""}<div id="guide-content-v2" class="guide-content ${editing ? "is-editing" : ""}" ${editing ? 'contenteditable="true" spellcheck="true"' : ""}>${lastSaved}</div>${editing ? '<div class="guide-savebar"><span class="muted" id="save-status-v2">All changes saved</span><div class="actions"><button class="ghost" id="discard-guide-v2">Discard Changes</button><button class="primary" id="save-guide-v2">Save Changes</button></div></div>' : ""}</article>`;
    const area = document.querySelector("#guide-content-v2");
    decorateCodeBlocks(area);
    document.querySelector("#toggle-edit-v2")?.addEventListener("click", () => { if(editing)return exitEditor();editing=true;render();wire(); });
  };
  const cleanEditorHtml = () => { const clone = document.querySelector("#guide-content-v2").cloneNode(true); clone.querySelectorAll(".code-copy").forEach((button) => button.remove()); return clone.innerHTML; };
  const save = async (silent = false) => {
    if (!dirty || saving) return;
    saving = true;
    const status = document.querySelector("#save-status-v2");
    if (status) status.textContent = "Saving…";
    try { const result = await request(`/api/guides/folders/${folderId}/documents/${docId}`, { method: "PATCH", body: JSON.stringify({ contentHtml: cleanEditorHtml() }) }); lastSaved = result.content_html; doc.updated_at = result.updated_at; dirty = false; if (status) status.textContent = "Saved just now"; if (!silent) showNotice("Changes Saved", "Your guide changes have been saved."); }
    catch (error) { if (status) status.textContent = "Save failed"; if (!silent) showNotice("Changes Not Saved", error.message); }
    finally { saving = false; }
  };
  const wire = () => {
    const area = document.querySelector("#guide-content-v2"), status = document.querySelector("#save-status-v2"), selectionToolbar = document.querySelector("#selection-toolbar");
    const changed = () => { dirty = true; status.textContent = "Unsaved changes"; decorateCodeBlocks(area); };
    const insert = (html) => { restoreRange(); document.execCommand("insertHTML", false, html); changed(); area.focus(); };
    const fileToImage = (file) => { if (!file?.type.startsWith("image/")) return; if (file.size > 700 * 1024) return showNotice("Image Too Large", "Guide images must be 700 KB or smaller."); const reader = new FileReader(); reader.onload = () => insert(`<figure><img src="${reader.result}" alt="Uploaded guide image"><figcaption>Image caption</figcaption></figure><p><br></p>`); reader.readAsDataURL(file); };
    area.addEventListener("input", changed);
    area.addEventListener("mouseup", captureRange);
    area.addEventListener("keyup", captureRange);
    area.addEventListener("paste", (event) => { const image = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/")); if (image) { event.preventDefault(); fileToImage(image.getAsFile()); } });
    area.addEventListener("keydown", (event) => { const selection=getSelection(),node=selection?.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection?.anchorNode,block=node?.closest?.("p,div,h1,h2,h3,h4,h5,h6,blockquote,pre");if(event.key===" "&&block&&area.contains(block)){const marker=block.textContent.trim();let tag=null,command=null;if(/^#{1,6}$/.test(marker))tag=`h${marker.length}`;else if(marker===">")tag="blockquote";else if(marker==="-"||marker==="*")command="insertUnorderedList";else if(marker==="1.")command="insertOrderedList";else if(marker==="```")tag="pre";if(tag||command){event.preventDefault();block.textContent="";const range=document.createRange();range.selectNodeContents(block);range.collapse(true);selection.removeAllRanges();selection.addRange(range);if(tag)document.execCommand("formatBlock",false,tag);if(command)document.execCommand(command,false,null);changed();return;}}if(event.key!=="Enter")return;const pre=node?.closest?.("pre");if(pre&&(pre.innerText.endsWith("\n")||!pre.innerText.trim())){event.preventDefault();const paragraph=document.createElement("p");paragraph.innerHTML="<br>";pre.after(paragraph);const range=document.createRange();range.selectNodeContents(paragraph);range.collapse(true);selection.removeAllRanges();selection.addRange(range);changed();} });
    document.querySelectorAll("[data-command]").forEach((button) => button.onclick = () => { restoreRange(); document.execCommand(button.dataset.command, false, null); changed(); area.focus(); });
    document.querySelector("#block-style").onchange = (event) => { restoreRange(); document.execCommand("formatBlock", false, event.target.value); changed(); };
    document.querySelector("#font-name").onchange = (event) => { restoreRange(); document.execCommand("fontName", false, event.target.value); changed(); };
    document.querySelector("#font-size").onchange = (event) => { restoreRange(); document.execCommand("fontSize", false, "7"); area.querySelectorAll('font[size="7"]').forEach((node) => { node.removeAttribute("size"); node.style.fontSize = `${event.target.value}px`; }); changed(); };
    document.querySelector("#line-spacing").onchange = (event) => { restoreRange(); const selection = getSelection(), node = selection?.anchorNode?.nodeType === 3 ? selection.anchorNode.parentElement : selection?.anchorNode; if (node && area.contains(node)) (node.closest("p,div,li,blockquote,h1,h2,h3,h4,h5,h6") || node).style.lineHeight = event.target.value; changed(); };
    document.querySelector("#text-color").oninput = (event) => { restoreRange(); document.execCommand("foreColor", false, event.target.value); changed(); };
    document.querySelector("#highlight-color").oninput = (event) => { restoreRange(); document.execCommand("hiliteColor", false, event.target.value); changed(); };
    const addLink = async () => { let url = await askText("Insert Link", "URL", "https://"); if (!url) return;url=/^[a-z][a-z0-9+.-]*:/i.test(url)?url:`https://${url}`;restoreRange();const selection=getSelection();if(selection?.isCollapsed)document.execCommand("insertHTML",false,`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`);else{document.execCommand("createLink",false,url);const anchor=(selection.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection.anchorNode)?.closest?.("a");if(anchor){anchor.target="_blank";anchor.rel="noopener noreferrer"}}changed();area.focus(); };
    document.querySelector("#insert-link-v2").onclick = addLink;
    document.querySelector("#selection-link").onclick = addLink;
    document.querySelector("#upload-image-v2").onclick = () => document.querySelector("#guide-image-input").click();
    document.querySelector("#guide-image-input").onchange = (event) => fileToImage(event.target.files[0]);
    document.querySelector("#insert-code-v2").onclick = () => insert('<pre><code>Type or paste code here</code></pre><p><br></p>');
    document.querySelector("#insert-table-v2").onclick = async () => { const rowCount = Math.min(12, Math.max(1, Number(await askText("Insert Table", "Number of rows", "2")) || 0)); if (!rowCount) return; const colCount = Math.min(8, Math.max(1, Number(await askText("Insert Table", "Number of columns", "2")) || 0)); if (!colCount) return; insert(`<div class="table-wrap"><table><tbody>${Array.from({ length: rowCount }, () => `<tr>${Array.from({ length: colCount }, () => "<td>Cell</td>").join("")}</tr>`).join("")}</tbody></table></div><p><br></p>`); };
    const activeCell = () => { const selection = getSelection(), node = selection?.anchorNode?.nodeType === 3 ? selection.anchorNode.parentElement : selection?.anchorNode; return node?.closest?.("td,th"); };
    document.querySelector("#table-row-v2").onclick = () => { const cell = activeCell(); if (!cell) return showNotice("Select a Table Cell", "Place your cursor inside a table first."); const row = cell.parentElement, clone = row.cloneNode(true); clone.querySelectorAll("td,th").forEach((item) => item.textContent = "Cell"); row.after(clone); changed(); };
    document.querySelector("#table-col-v2").onclick = () => { const cell = activeCell(); if (!cell) return showNotice("Select a Table Cell", "Place your cursor inside a table first."); const index = [...cell.parentElement.children].indexOf(cell); cell.closest("table").querySelectorAll("tr").forEach((row) => { const next = document.createElement(row.children[index]?.tagName || "td"); next.textContent = "Cell"; (row.children[index] || row.lastElementChild).after(next); }); changed(); };
    document.querySelector("#insert-checklist-v2").onclick = () => insert('<ul class="checklist"><li>Checklist item</li></ul><p><br></p>');
    document.querySelector("#insert-note-v2").onchange = (event) => { if (!event.target.value) return; insert(`<aside class="guide-note note-${event.target.value}"><b>Note</b><p>Add important information here.</p></aside><p><br></p>`); event.target.value = ""; };
    document.querySelector("#insert-line-v2").onclick = () => insert("<hr><p><br></p>");
    document.querySelector("#insert-details-v2").onclick = () => insert("<details><summary>Section title</summary><p>Section content</p></details><p><br></p>");
    document.querySelector("#selection-style").onchange = (event) => { restoreRange(); document.execCommand("formatBlock", false, event.target.value); changed(); };
    document.querySelector("#selection-code").onclick = () => { restoreRange(); document.execCommand("formatBlock", false, "pre"); changed(); };
    document.querySelector("#selection-color").oninput = (event) => { restoreRange(); document.execCommand("foreColor", false, event.target.value); changed(); };
    document.addEventListener("selectionchange", () => { const selection = getSelection(); if (!selection?.rangeCount || selection.isCollapsed || !area.contains(selection.anchorNode)) return selectionToolbar.classList.add("hidden"); savedRange = selection.getRangeAt(0).cloneRange(); const rect = savedRange.getBoundingClientRect(), parent = document.querySelector(".guide-document").getBoundingClientRect(); selectionToolbar.style.left = `${Math.max(10, rect.left - parent.left)}px`; selectionToolbar.style.top = `${rect.bottom - parent.top + 8}px`; selectionToolbar.classList.remove("hidden"); });
    document.querySelector("#save-guide-v2").onclick = () => save(false);
    document.querySelector("#discard-guide-v2").onclick = () => showModal("Discard Changes", "Discard every change since the last save?", () => { dirty = false; editing = false; clearInterval(autosave); render(); });
    clearInterval(autosave); autosave = setInterval(() => save(true), 60000);
    guardNavigation(() => dirty, () => { dirty = false; clearInterval(autosave); });
    window.onbeforeunload = () => dirty ? "You have unsaved guide changes." : undefined;
    area.focus();
  };
  render();
}

 function inputFor(q, value = "") {
  if (q.locked) return `<input value="${esc(value)}" disabled>`;
  if (q.type === "long")
    return `<textarea data-q="${q.id}" ${q.required ? "required" : ""}>${esc(value)}</textarea>`;
  if (q.type === "multiple" || q.type === "checkboxes")
    return `<div class="choices">${(q.options || []).map((o) => `<label class="choice"><input data-q="${q.id}" type="${q.type === "multiple" ? "radio" : "checkbox"}" name="${q.id}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div>`;
  if (q.type === "dropdown")
    return `<select data-q="${q.id}"><option value="">Select an option</option>${(q.options || []).map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
  return `<input data-q="${q.id}" value="${esc(value)}" ${q.required ? "required" : ""}>`;
}
async function applyPage(formId) {
  const f = await request(`/api/applications/${formId}`);
  if (!me.authenticated || !f.canApply) {
    app.innerHTML =
      '<div class="success"><h1>You are unable to apply</h1><p class="muted">This application is unavailable for your account.</p></div>';
    return;
  }
  let dirty = false,
    sectionIndex = 0;
  const answers = {
    roblox_username: me.roblox_username,
    roblox_id: me.roblox_user_id,
    discord_id: me.discord_id,
  };
  const collect = (root) =>
    root.querySelectorAll("[data-q]").forEach((el) => {
      if (el.type === "checkbox") {
        if (el.checked) (answers[el.dataset.q] ??= []).push(el.value);
      } else if (el.type !== "radio" || el.checked)
        answers[el.dataset.q] = el.value;
    });
  const renderSection = () => {
    const section = f.schema[sectionIndex],
      last = sectionIndex === f.schema.length - 1;
    app.innerHTML = `<div class="form-shell"><a class="back" href="/applications">← Back to Applications</a><div class="form-title"><span class="tag" style="--team:${esc(f.team_color)}">${esc(f.team_label)}</span><h1>${esc(f.name)}</h1><p class="description">${esc(f.description)}</p></div><form id="application-form"><section class="section"><h2>${esc(section.title)}</h2><p class="muted">${esc(section.description || "")}</p>${(section.questions || []).map((q) => `<div class="question"><label>${esc(q.title)} ${q.required ? '<span class="required">*</span>' : ""}</label>${q.description ? `<small>${esc(q.description)}</small>` : ""}${inputFor(q, answers[q.id] ?? "")}</div>`).join("")}</section><div class="submit-row">${sectionIndex ? '<button type="button" class="ghost" id="previous-section">Back</button>' : ""}<button type="submit" class="primary">${last ? "Submit Application" : "Next"}</button></div></form></div>`;
    document.querySelector(".back").onclick = (event) => {
      if (!dirty) return;
      event.preventDefault();
      showModal(
        "Discard Application",
        "You have entered application responses. Are you sure you would like to leave?",
        () => {
          dirty = false;
          location.assign("/applications");
        },
      );
    };
    const form = document.querySelector("#application-form");
    for (const q of section.questions || [])
      fillChoices(form, q, answers[q.id]);
    form.addEventListener("input", () => (dirty = true));
    const previous = document.querySelector("#previous-section");
    if (previous)
      previous.onclick = () => {
        answersForSection(section, form);
        sectionIndex--;
        renderSection();
      };
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      answersForSection(section, form);
      if (!last) {
        sectionIndex++;
        renderSection();
        return;
      }
      showModal(
        "Submit Application",
        "Are you sure you would like to submit this application? You cannot edit it after submission.",
        async () => {
          try {
            await request(`/api/applications/${formId}/submit`, {
              method: "POST",
              body: JSON.stringify({ answers }),
            });
            dirty = false;
            window.onbeforeunload = null;
            app.innerHTML =
              '<div class="success"><div class="check">✓</div><h1>Application submitted</h1><p>Your application has been successfully submitted. Please ensure you follow the guidelines of the application via the announcement. Best of luck!</p></div>';
          } catch (err) {
            showNotice("Application Not Submitted", err.message);
          }
        },
      );
    };
  };
  const answersForSection = (section, root) => {
    for (const q of section.questions || [])
      if (q.type === "checkboxes") answers[q.id] = [];
    collect(root);
  };
  guardNavigation(
    () => dirty,
    () => (dirty = false),
  );
  window.onbeforeunload = () =>
    dirty ? "You have unsaved changes." : undefined;
  renderSection();
}
const uid = () => crypto.randomUUID();
function editorQuestion(q, si, qi) {
  return `<div class="question-editor" data-si="${si}" data-qi="${qi}"><div class="row"><input class="q-title" value="${esc(q.title)}" ${q.locked ? "disabled" : ""}><select class="q-type" ${q.locked ? "disabled" : ""}>${["short", "long", "multiple", "checkboxes", "dropdown"].map((t) => `<option value="${t}" ${q.type === t ? "selected" : ""}>${{ short: "Short answer", long: "Long answer", multiple: "Multiple choice", checkboxes: "Checkboxes", dropdown: "Dropdown" }[t]}</option>`).join("")}</select></div><input class="q-desc" placeholder="Optional question description" value="${esc(q.description || "")}" ${q.locked ? "disabled" : ""}>${["multiple", "checkboxes", "dropdown"].includes(q.type) ? `<textarea class="q-options" placeholder="One option per line">${esc((q.options || []).join("\n"))}</textarea>` : ""}<div class="editor-controls">${q.locked ? "" : `<span class="drag question-drag" draggable="true">⋮⋮ Drag</span>`}<label class="switch"><input class="q-required" type="checkbox" ${q.required ? "checked" : ""} ${q.locked ? "disabled" : ""}> Required</label>${q.locked ? "" : `<button type="button" class="ghost tiny duplicate">Duplicate</button><button type="button" class="ghost tiny delete-q">Delete</button>`}</div></div>`;
}
async function editPage(formId) {
  const f = await request(`/api/applications/${formId}`);
  if (!f.canEdit) throw new Error("You cannot edit this application.");
  let schema = structuredClone(f.schema),
    description = f.description,
    isOpen = f.is_open,
    dirty = false,
    drag = null;
  const render = () => {
    app.innerHTML = `<div class="form-shell"><div class="editor-toolbar"><button class="ghost" id="editor-back" type="button">Back</button><div class="actions"><button class="ghost" id="discard">Discard Changes</button><button class="primary" id="save">Save Changes</button></div></div><div class="form-title"><div class="eyebrow">Application editor</div><h1>${esc(f.name)}</h1><label>Description</label><textarea id="form-description">${esc(description)}</textarea><label class="switch"><input id="is-open" type="checkbox" ${isOpen ? "checked" : ""}> Open</label></div><div id="sections">${schema.map((s, si) => `<section class="section editor-section" data-si="${si}"><input class="section-title" value="${esc(s.title)}" ${s.locked ? "disabled" : ""}><textarea class="section-desc" placeholder="Optional section description" ${s.locked ? "disabled" : ""}>${esc(s.description || "")}</textarea>${(s.questions || []).map((q, qi) => editorQuestion(q, si, qi)).join("")}<div class="editor-controls">${s.locked ? "" : `<span class="drag section-drag" draggable="true">⋮⋮ Drag Section</span><button class="ghost tiny delete-section" type="button">Delete Section</button>`}<button class="ghost tiny add-question" type="button">+ Add Question</button></div></section>`).join("")}</div><button class="ghost" id="add-section">+ Add Section</button></div>`;
    bind();
  };
  function sync() {
    description = document.querySelector("#form-description").value;
    isOpen = document.querySelector("#is-open").checked;
    document.querySelectorAll(".editor-section").forEach((el, si) => {
      const s = schema[si];
      s.title = el.querySelector(".section-title").value;
      s.description = el.querySelector(".section-desc").value;
      el.querySelectorAll(".question-editor").forEach((qe, qi) => {
        const q = s.questions[qi];
        q.title = qe.querySelector(".q-title").value;
        q.type = qe.querySelector(".q-type").value;
        q.description = qe.querySelector(".q-desc").value;
        q.required = qe.querySelector(".q-required").checked;
        const opts = qe.querySelector(".q-options");
        q.options = opts
          ? opts.value
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      });
    });
    dirty = true;
  }
  function bind() {
    document
      .querySelectorAll(".section-desc")
      .forEach((field) => (field.disabled = false));
    document
      .querySelectorAll("input,textarea,select")
      .forEach((x) => (x.oninput = sync));
    document.querySelectorAll(".add-question").forEach(
      (b, si) =>
        (b.onclick = () => {
          sync();
          schema[si].questions.push({
            id: uid(),
            title: "Untitled Question",
            type: "short",
            required: false,
            description: "",
          });
          render();
        }),
    );
    document.querySelectorAll(".delete-section").forEach(
      (b) =>
        (b.onclick = () => {
          sync();
          schema.splice(Number(b.closest(".section").dataset.si), 1);
          render();
        }),
    );
    document.querySelectorAll(".delete-q").forEach(
      (b) =>
        (b.onclick = () => {
          sync();
          const e = b.closest(".question-editor");
          schema[+e.dataset.si].questions.splice(+e.dataset.qi, 1);
          render();
        }),
    );
    document.querySelectorAll(".duplicate").forEach(
      (b) =>
        (b.onclick = () => {
          sync();
          const e = b.closest(".question-editor"),
            q = structuredClone(schema[+e.dataset.si].questions[+e.dataset.qi]);
          q.id = uid();
          schema[+e.dataset.si].questions.splice(+e.dataset.qi + 1, 0, q);
          render();
        }),
    );
    document.querySelectorAll(".q-type").forEach(
      (x) =>
        (x.onchange = () => {
          sync();
          render();
        }),
    );
    document.querySelectorAll(".question-drag").forEach((handle) => {
      const el = handle.closest(".question-editor");
      handle.ondragstart = (e) => {
        drag = { si: +el.dataset.si, qi: +el.dataset.qi };
        e.stopPropagation();
      };
    });
    document.querySelectorAll(".question-editor").forEach((el) => {
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (drag?.qi == null) return;
        sync();
        const target = { si: +el.dataset.si, qi: +el.dataset.qi },
          [item] = schema[drag.si].questions.splice(drag.qi, 1);
        schema[target.si].questions.splice(target.qi, 0, item);
        drag = null;
        render();
      };
    });
    document.querySelectorAll(".section-drag").forEach((handle) => {
      const el = handle.closest(".editor-section");
      handle.ondragstart = (e) => {
        drag = { section: +el.dataset.si };
        e.stopPropagation();
      };
    });
    document.querySelectorAll(".editor-section").forEach((el) => {
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        if (drag?.section == null) return;
        e.preventDefault();
        sync();
        const to = +el.dataset.si,
          [item] = schema.splice(drag.section, 1);
        schema.splice(to, 0, item);
        drag = null;
        render();
      };
    });
    document.querySelector("#add-section").onclick = () => {
      sync();
      schema.push({
        id: uid(),
        title: "Untitled Section",
        description: "",
        questions: [],
      });
      render();
    };
    const leave = () => {
      if (!dirty) {
        location.assign("/applications");
        return;
      }
      showModal(
        "Discard Changes",
        "You have unsaved changes. Are you sure you would like to leave this page?",
        () => {
          dirty = false;
          location.assign("/applications");
        },
      );
    };
    document.querySelector("#editor-back").onclick = leave;
    document.querySelector("#discard").onclick = () => {
      if (!dirty) return;
      showModal(
        "Discard Changes",
        "Are you sure you would like to discard your unsaved changes?",
        () => {
          dirty = false;
          location.reload();
        },
      );
    };
    document.querySelector("#save").onclick = async () => {
      sync();
      try {
        await request(`/api/applications/${formId}`, {
          method: "PUT",
          body: JSON.stringify({ description, isOpen, schema }),
        });
        dirty = false;
        showNotice(
          "Changes Saved",
          "Your application changes have been saved successfully.",
        );
      } catch (error) {
        showNotice("Changes Not Saved", error.message);
      }
    };
    guardNavigation(
      () => dirty,
      () => (dirty = false),
    );
    window.onbeforeunload = () =>
      dirty ? "You have unsaved changes." : undefined;
  }
  render();
}
function legal(type) {
  const privacy = type === "privacy";
  app.innerHTML = `<article class="legal"><div class="eyebrow">CONJURES</div><h1>${privacy ? "Privacy Policy" : "Terms of Service"}</h1><p>Last updated August 27, 2026.</p>${privacy ? `<h2>Information we collect</h2><p>We process your linked Discord and Roblox identifiers, usernames, group rank, server roles, application answers, and application outcomes to operate CONJURES applications.</p><h2>How information is used</h2><p>Information is used to authenticate you, determine eligibility, review applications, prevent duplicate submissions, and protect the service. Application responses are shared only with authorized CONJURES reviewers.</p><h2>Retention</h2><p>Pending applications are retained while under review. Denial metadata may be retained for seven days to enforce the reapplication period. Operational and security records may be retained when reasonably necessary.</p><h2>Your choices</h2><p>You may log out at any time. Contact CONJURES through a support ticket for questions or appropriate data requests.</p>` : `<h2>Eligibility and accounts</h2><p>You must use a Discord and Roblox account linked through the official CONJURES verification system. You are responsible for the accuracy of information submitted through your account.</p><h2>Applications</h2><p>Applications must be truthful, original, and comply with all CONJURES rules. Submission does not guarantee acceptance. Reviewer decisions may be made according to current staffing needs and eligibility requirements.</p><h2>Acceptable use</h2><p>You may not bypass restrictions, interfere with the website, impersonate another person, automate submissions, or attempt to access restricted editing and review functions.</p><h2>Availability</h2><p>CONJURES may modify, suspend, or discontinue applications and site features when necessary.</p>`}</article>`;
}
function codeModal(confirm) {
  modal.classList.remove("hidden");
  modal.innerHTML = `<div class="dialog"><h2>Enter Examination Code</h2><p class="muted">Enter the six-digit code provided to you.</p><input id="exam-code" maxlength="6" inputmode="numeric" placeholder="000000"><div class="actions"><button class="ghost" id="cancel">Cancel</button><button class="primary" id="confirm">Start</button></div></div>`;
  modal.querySelector("#cancel").onclick = () => modal.classList.add("hidden");
  modal.querySelector("#confirm").onclick = async () => {
    const code = modal.querySelector("#exam-code").value.trim();
    try {
      await confirm(code);
      modal.classList.add("hidden");
    } catch (e) {
      showNotice("Examination Not Started", e.message);
    }
  };
}
async function exams() {
  if (!me.authenticated) {
    location.assign("/");
    return;
  }
  const forms = await request("/api/exams");
  const countQuestions = (form) =>
    form.schema.reduce((total, section) => {
      const available =
        section.questions?.filter((question) => !question.locked).length || 0;
      return (
        total +
        (section.questionBank
          ? Math.min(Number(section.questionLimit || available), available)
          : available)
      );
    }, 0);
  app.innerHTML = `<div class="section-head"><div><div class="eyebrow">Authorized examinations</div><h1>Examinations</h1><p class="muted">Your available examinations and examination editing tools.</p></div></div>${forms.length ? `<div class="application-grid">${forms.map((f) => `<article class="application-card" style="--team:${esc(f.team_color)}"><span class="tag">${esc(f.team_label)}</span><h3>${esc(f.name)}</h3><p class="muted">${countQuestions(f)} Questions</p><div class="card-meta"><b>CONJURES</b><div class="actions">${f.canEdit ? `<a class="ghost" href="/exams/${f.id}/edit">Edit</a>` : ""}${f.hasAccess ? `<a class="primary" href="/exams/${f.id}">${f.started ? "Continue" : "Start"}</a>` : ""}</div></div></article>`).join("")}</div>` : `<div class="empty-state"><div class="empty-icon">!</div><p>You do not have any exams.</p></div>`}`;
}
function readAnswer(root, q) {
  if (q.type === "checkboxes")
    return [...root.querySelectorAll("[data-q]:checked")].map((x) => x.value);
  const checked = root.querySelector("[data-q]:checked");
  return checked?.value ?? root.querySelector("[data-q]")?.value ?? "";
}
function fillChoices(root, q, value) {
  if (q.type === "checkboxes")
    root
      .querySelectorAll("[data-q]")
      .forEach((x) => (x.checked = (value || []).includes(x.value)));
  else if (q.type === "multiple")
    root
      .querySelectorAll("[data-q]")
      .forEach((x) => (x.checked = x.value === value));
  else {
    const el = root.querySelector("[data-q]");
    if (el) el.value = value ?? "";
  }
}
async function examPage(id) {
  const f = await request(`/api/exams/${id}`);
  if (!f.hasAccess)
    throw new Error("You do not have access to take this examination.");
  if (!f.started) {
    app.innerHTML = `<div class="form-shell"><a class="back" href="/exams">← Back to Examinations</a><div class="form-title"><span class="tag" style="--team:${esc(f.team_color)}">${esc(f.team_label)}</span><h1>${esc(f.name)}</h1><p class="description">${esc(f.description || "")}</p></div><section class="section"><h2>Information</h2><div class="question"><label>Roblox Username</label><input value="${esc(me.roblox_username)}" disabled></div><div class="question"><label>Roblox ID</label><input value="${esc(me.roblox_user_id)}" disabled></div><div class="question"><label>Discord User ID</label><input value="${esc(me.discord_id)}" disabled></div><button class="primary" id="begin-exam">Start Examination</button></section></div>`;
    document.querySelector("#begin-exam").onclick = () =>
      codeModal(async (code) => {
        await request(`/api/exams/${id}/unlock`, {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        examPage(id);
      });
    return;
  }
  const render = async () => {
    let p;
    try {
      p = await request(`/api/exams/${id}/progress`);
    } catch (e) {
      app.innerHTML = `<div class="success"><div class="check">✓</div><h1>Examination concluded</h1><p>${esc(e.message)}</p></div>`;
      return;
    }
    const q = p.question;
    const sectionIntro = q.type === "section_intro";
    app.innerHTML = `<div class="form-shell exam-runner"><div class="form-title"><span class="tag" style="--team:${esc(f.team_color)}">${esc(f.team_label)}</span><h1>${esc(f.name)}</h1><p class="muted">${sectionIntro ? "New Section" : `Question ${p.index + 1} of ${p.total}`}</p>${p.deadline ? `<div class="exam-timer" id="exam-timer"></div>` : ""}</div><section class="section">${sectionIntro ? `<h2>${esc(q.title)}</h2><p class="description">${esc(q.description || "")}</p>` : `<div class="question"><label>${esc(q.title)} ${q.required ? '<span class="required">*</span>' : ""}</label>${q.description ? `<small>${esc(q.description)}</small>` : ""}${inputFor(q)}</div>`}<div class="submit-row"><button class="primary" id="exam-next">${p.index + 1 === p.total ? "Submit Examination" : "Next"}</button></div></section></div>`;
    const root = document.querySelector(".exam-runner");
    if (!sectionIntro) fillChoices(root, q, p.draft);
    let saveTimer;
    if (!sectionIntro)
      root.addEventListener("input", () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(
          () =>
            request(`/api/exams/${id}/draft`, {
              method: "PATCH",
              body: JSON.stringify({
                questionId: q.id,
                answer: readAnswer(root, q),
              }),
            }).catch(() => {}),
          500,
        );
      });
    let expired = false;
    if (p.deadline) {
      const tick = async () => {
        if (!root.isConnected) return;
        const left = Math.max(
            0,
            Math.ceil((new Date(p.deadline) - Date.now()) / 1000),
          ),
          el = document.querySelector("#exam-timer");
        if (el)
          el.textContent = `Time Remaining: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        if (!left && !expired) {
          expired = true;
          showNotice(
            "Time Limit Exceeded",
            "You exceeded the time limit. You are being moved to the next question.",
          );
          setTimeout(render, 250);
          return;
        }
        if (!expired) setTimeout(tick, 1000);
      };
      tick();
    }
    document.querySelector("#exam-next").onclick = () =>
      showModal(
        p.index + 1 === p.total ? "Submit Examination" : "Continue Examination",
        "Once you continue, you cannot return to this question or edit your answer.",
        async () => {
          try {
            const result = await request(`/api/exams/${id}/next`, {
              method: "POST",
              body: JSON.stringify({
                answer: sectionIntro ? "" : readAnswer(root, q),
              }),
            });
            if (result.complete)
              app.innerHTML =
                '<div class="success"><div class="check">✓</div><h1>Examination submitted</h1><p>Your examination has been successfully submitted.</p></div>';
            else render();
          } catch (e) {
            showNotice("Unable to Continue", e.message);
          }
        },
      );
  };
  await render();
}
const examEditorQuestion = (q, si, qi, questionBank) =>
  `<div class="question-editor" data-si="${si}" data-qi="${qi}"><div class="row"><input class="q-title" value="${esc(q.title)}" ${q.locked ? "disabled" : ""}><select class="q-type" ${q.locked ? "disabled" : ""}>${["short", "long", "multiple", "checkboxes", "dropdown"].map((t) => `<option value="${t}" ${q.type === t ? "selected" : ""}>${{ short: "Short answer", long: "Long answer", multiple: "Multiple choice", checkboxes: "Checkboxes", dropdown: "Dropdown" }[t]}</option>`).join("")}</select></div><input class="q-desc" placeholder="Optional question description" value="${esc(q.description || "")}" ${q.locked ? "disabled" : ""}>${q.locked ? "" : `<input class="q-timer" type="number" min="0" max="86400" placeholder="Optional timer in seconds" value="${Number(q.timerSeconds || 0) || ""}">`}${["multiple", "checkboxes", "dropdown"].includes(q.type) ? `<textarea class="q-options" placeholder="One option per line">${esc((q.options || []).join("\n"))}</textarea>` : ""}<div class="editor-controls">${q.locked ? "" : '<span class="drag question-drag" draggable="true">⋮⋮ Drag</span>'}<label class="switch"><input class="q-required" type="checkbox" ${q.required ? "checked" : ""} ${q.locked ? "disabled" : ""}> Required Answer</label>${questionBank && !q.locked ? `<label class="switch"><input class="q-always" type="checkbox" ${q.alwaysInclude ? "checked" : ""}> Always Include</label>` : ""}${q.locked ? "" : '<button type="button" class="ghost tiny duplicate-q">Duplicate</button><button type="button" class="ghost tiny delete-q">Delete</button>'}</div></div>`;
async function examEditPage(id) {
  const f = await request(`/api/exams/${id}`);
  if (!f.canEdit) throw new Error("You cannot edit this examination.");
  let schema = structuredClone(f.schema),
    description = f.description || "",
    dirty = false,
    drag = null;
  const sync = () => {
    description = document.querySelector("#form-description").value;
    document.querySelectorAll(".editor-section").forEach((el, si) => {
      const s = schema[si];
      s.title = el.querySelector(".section-title").value;
      s.description = el.querySelector(".section-desc").value;
      s.questionBank = Boolean(el.querySelector(".section-bank")?.checked);
      s.questionLimit = s.questionBank
        ? Number(el.querySelector(".section-limit")?.value || 0)
        : 0;
      el.querySelectorAll(".question-editor").forEach((qe, qi) => {
        const q = s.questions[qi];
        q.title = qe.querySelector(".q-title").value;
        q.type = qe.querySelector(".q-type").value;
        q.description = qe.querySelector(".q-desc").value;
        q.required = qe.querySelector(".q-required").checked;
        q.timerSeconds = Number(qe.querySelector(".q-timer")?.value || 0);
        q.alwaysInclude = Boolean(qe.querySelector(".q-always")?.checked);
        const opts = qe.querySelector(".q-options");
        q.options = opts
          ? opts.value
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean)
          : [];
      });
    });
  };
  const render = () => {
    app.innerHTML = `<div class="form-shell"><div class="editor-toolbar"><button class="ghost" id="editor-back">Back</button><div class="actions"><button class="ghost" id="discard">Discard Changes</button><button class="primary" id="save">Save Changes</button></div></div><div class="form-title"><div class="eyebrow">Examination editor</div><h1>${esc(f.name)}</h1><label>Description</label><textarea id="form-description">${esc(description)}</textarea></div><div id="sections">${schema.map((s, si) => `<section class="section editor-section" data-si="${si}"><input class="section-title" value="${esc(s.title)}" ${s.locked ? "disabled" : ""}><textarea class="section-desc" placeholder="Optional section description" ${s.locked ? "disabled" : ""}>${esc(s.description || "")}</textarea>${s.locked ? "" : `<div class="bank-settings"><label class="switch"><input class="section-bank" type="checkbox" ${s.questionBank ? "checked" : ""}> Enable Question Bank</label>${s.questionBank ? `<label>Question Limit<input class="section-limit" type="number" min="1" max="${(s.questions || []).length}" value="${Number(s.questionLimit || 0) || ""}" placeholder="Number of randomized questions"></label>` : ""}</div>`}${(s.questions || []).map((q, qi) => examEditorQuestion(q, si, qi, Boolean(s.questionBank))).join("")}<div class="editor-controls">${s.locked ? "" : '<span class="drag section-drag" draggable="true">⋮⋮ Drag Section</span><button class="ghost tiny delete-section">Delete Section</button>'}<button class="ghost tiny add-question">+ Add Question</button></div></section>`).join("")}</div><button class="ghost" id="add-section">+ Add Section</button></div>`;
    document
      .querySelectorAll(".section-desc")
      .forEach((field) => (field.disabled = false));
    document
      .querySelector(".form-shell")
      .addEventListener("input", () => (dirty = true));
    document.querySelectorAll(".add-question").forEach(
      (b, si) =>
        (b.onclick = () => {
          sync();
          schema[si].questions.push({
            id: uid(),
            title: "Untitled question",
            description: "",
            type: "short",
            required: false,
            options: [],
            timerSeconds: 0,
          });
          dirty = true;
          render();
        }),
    );
    document.querySelectorAll(".delete-q").forEach(
      (b) =>
        (b.onclick = () => {
          sync();
          const x = b.closest(".question-editor");
          schema[+x.dataset.si].questions.splice(+x.dataset.qi, 1);
          dirty = true;
          render();
        }),
    );
    document.querySelectorAll(".duplicate-q").forEach(
      (b) =>
        (b.onclick = () => {
          sync();
          const x = b.closest(".question-editor"),
            copy = structuredClone(
              schema[+x.dataset.si].questions[+x.dataset.qi],
            );
          copy.id = uid();
          schema[+x.dataset.si].questions.splice(+x.dataset.qi + 1, 0, copy);
          dirty = true;
          render();
        }),
    );
    document.querySelectorAll(".q-type").forEach(
      (select) =>
        (select.onchange = () => {
          sync();
          dirty = true;
          render();
        }),
    );
    document.querySelectorAll(".section-bank").forEach(
      (toggle) =>
        (toggle.onchange = () => {
          sync();
          dirty = true;
          render();
        }),
    );
    document.querySelectorAll(".question-drag").forEach((handle) => {
      const item = handle.closest(".question-editor");
      handle.ondragstart = (event) => {
        drag = { si: +item.dataset.si, qi: +item.dataset.qi };
        event.stopPropagation();
      };
    });
    document.querySelectorAll(".question-editor").forEach((item) => {
      item.ondragover = (event) => event.preventDefault();
      item.ondrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (drag?.qi == null) return;
        sync();
        const target = { si: +item.dataset.si, qi: +item.dataset.qi },
          targetSection = schema[target.si];
        if (targetSection.locked) return;
        const [question] = schema[drag.si].questions.splice(drag.qi, 1);
        schema[target.si].questions.splice(target.qi, 0, question);
        drag = null;
        dirty = true;
        render();
      };
    });
    document.querySelectorAll(".section-drag").forEach((handle) => {
      const section = handle.closest(".editor-section");
      handle.ondragstart = (event) => {
        drag = { section: +section.dataset.si };
        event.stopPropagation();
      };
    });
    document.querySelectorAll(".editor-section").forEach((section) => {
      section.ondragover = (event) => event.preventDefault();
      section.ondrop = (event) => {
        if (drag?.section == null) return;
        event.preventDefault();
        sync();
        const to = +section.dataset.si;
        if (schema[to].locked) return;
        const [moved] = schema.splice(drag.section, 1);
        schema.splice(to, 0, moved);
        drag = null;
        dirty = true;
        render();
      };
    });
    document.querySelectorAll(".delete-section").forEach(
      (b, i) =>
        (b.onclick = () => {
          sync();
          schema.splice(i + 1, 1);
          dirty = true;
          render();
        }),
    );
    document.querySelector("#add-section").onclick = () => {
      sync();
      schema.push({
        id: uid(),
        title: "Untitled Section",
        description: "",
        questionBank: false,
        questionLimit: 0,
        questions: [],
      });
      dirty = true;
      render();
    };
    document.querySelector("#editor-back").onclick = () =>
      dirty
        ? showModal(
            "Discard Changes",
            "You have unsaved changes. Are you sure you would like to leave?",
            () => location.assign("/exams"),
          )
        : location.assign("/exams");
    document.querySelector("#discard").onclick = () => location.reload();
    document.querySelector("#save").onclick = async () => {
      sync();
      try {
        await request(`/api/exams/${id}`, {
          method: "PUT",
          body: JSON.stringify({ description, schema }),
        });
        dirty = false;
        showNotice(
          "Changes Saved",
          "Your examination changes have been saved successfully.",
        );
      } catch (e) {
        showNotice("Changes Not Saved", e.message);
      }
    };
  };
  render();
  guardNavigation(
    () => dirty,
    () => (dirty = false),
  );
  window.onbeforeunload = () =>
    dirty ? "You have unsaved changes." : undefined;
}
async function route() {
  me = await request("/api/me");
  watchPermissions();
  chrome();
  const p = location.pathname;
  try {
    if (me.siteBlacklisted) {
      app.innerHTML =
        '<div class="success"><h1>Access Restricted</h1><p class="muted">You are blacklisted from accessing conjures.net.</p></div>';
      return;
    }
    if (p === "/") return me.authenticated ? dashboard() : login();
    if (p === "/dashboard") return dashboard();
    if (p === "/applications") return applications();
    if (p === "/customroles") return customRoles();
    if (p === "/guides") {if(!me.authenticated){app.innerHTML='<div class="success"><h1>Guides</h1><p class="muted">Please log in with your verified CONJURES account to access Guides.</p><a class="primary" href="/">Log In</a></div>';return;}return guidesV2();}
    if (p === "/exams") return exams();
    if (p === "/terms" || p === "/privacy") return legal(p.slice(1));
    const m = p.match(/^\/applications\/([^/]+)(\/edit)?$/);
    if (m) return m[2] ? editPage(m[1]) : applyPage(m[1]);
    const e = p.match(/^\/exams\/([^/]+)(\/edit)?$/);
    if (e) return e[2] ? examEditPage(e[1]) : examPage(e[1]);
    const g = p.match(/^\/guides\/([^/]+)(?:\/([^/]+))?$/);
    if(g){if(!me.authenticated){app.innerHTML='<div class="success"><h1>Guides</h1><p class="muted">Please log in with your verified CONJURES account to access Guides.</p><a class="primary" href="/">Log In</a></div>';return;}return g[2]?guideDocumentV2(g[1],g[2]):guideFolderV2(g[1]);}
    return applications();
  } catch (e) {
    app.innerHTML = `<div class="success"><h1>Something went wrong</h1><p class="muted">${esc(e.message)}</p></div>`;
  }
}
route();
