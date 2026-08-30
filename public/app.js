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
  nav.innerHTML = me?.authenticated
    ? '<a href="/dashboard">Home</a><a href="/applications">Applications</a><a href="/customroles">Custom Roles</a>'
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
    if (p === "/exams") return exams();
    if (p === "/terms" || p === "/privacy") return legal(p.slice(1));
    const m = p.match(/^\/applications\/([^/]+)(\/edit)?$/);
    if (m) return m[2] ? editPage(m[1]) : applyPage(m[1]);
    const e = p.match(/^\/exams\/([^/]+)(\/edit)?$/);
    if (e) return e[2] ? examEditPage(e[1]) : examPage(e[1]);
    return applications();
  } catch (e) {
    app.innerHTML = `<div class="success"><h1>Something went wrong</h1><p class="muted">${esc(e.message)}</p></div>`;
  }
}
route();
