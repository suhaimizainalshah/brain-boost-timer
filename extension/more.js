/* Brain Boost Time(r): lesson plans (building, running, saving, sharing and a shared library), panels that close,
   full screen with giant numbers, Space to start and pause, the chime choice, a private weekly count, the welcome,
   and settings changed from the right-click menu. Uses bbt.js’s store, S, T, startTimer, say, sound, parseTime and fmtShort. */
const bbtMore = () => {
const SITE = "https://suhaimizainalshah.github.io/brain-boost-timer/", REPO = "https://github.com/suhaimizainalshah/brain-boost-timer"; // change both if the repository has another name
const here = EXT ? SITE : location.origin + location.pathname;
const escH = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
const pmsg = t => { $("#planMsg").textContent = ""; setTimeout(() => $("#planMsg").textContent = t, 20); };

/* ---------- panels: open, close (✕ or Esc) ---------- */
const panels = { plans: "#planBtn", names: "#namesBtn", settings: "#setBtn" };
const opened = []; // the order panels were opened, so Esc closes the latest
for (const id of Object.keys(panels)) new MutationObserver(() => { const i = opened.indexOf(id); if (i >= 0) opened.splice(i, 1); if (!$("#" + id).hidden) opened.push(id); }).observe($("#" + id), { attributes: true, attributeFilter: ["hidden"] });
const show = (id, on) => { const p = $("#" + id); p.hidden = !on; $(panels[id])?.setAttribute("aria-expanded", String(on)); };
$("#planBtn").onclick = () => show("plans", $("#plans").hidden);
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { show(b.dataset.close, false); $(panels[b.dataset.close])?.focus(); });
addEventListener("keydown", e => {
  if (document.querySelector("dialog[open]") || !$("#welcome").hidden) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (e.key === "Escape") { const inside = Object.keys(panels).find(id => $("#" + id).contains(document.activeElement)), open = (inside && !$("#" + inside).hidden) ? inside : [...opened].reverse().find(id => !$("#" + id).hidden);
    if (open) { e.preventDefault(); show(open, false); $(panels[open])?.focus(); } return; } // Esc closes the panel you’re in, or the one opened last
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === " " && !/BUTTON|A|SUMMARY/.test(document.activeElement?.tagName) && document.activeElement?.id !== "strawG") { e.preventDefault(); (T ? $("#pause") : $("#start")).click(); } // Space: start, pause, resume
  if (e.key.toLowerCase() === "f") fullScreen();
});

/* ---------- full screen with giant numbers, for projectors ---------- */
function fullScreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => document.body.classList.toggle("giant")); }
$("#fsBtn").onclick = fullScreen;
document.addEventListener("fullscreenchange", () => { document.body.classList.toggle("giant", !!document.fullscreenElement); say(document.fullscreenElement ? "Full screen. Press F or Esc to leave." : "Left full screen"); });

/* ---------- the chime, settings from the right-click menu, and the weekly count ---------- */
S.chime ||= "chime"; $("#chime").value = S.chime;
$("#chime").onchange = () => { S.chime = $("#chime").value; save(); sound("chime"); };
store.on(ch => { if (!ch.settings) return; const n = ch.settings; for (const k of ["sound", "motion", "remember", "openAs"]) if (k in n && n[k] !== S[k]) { S[k] = n[k]; const el = $("#" + k); if (el) el.type === "checkbox" ? el.checked = n[k] : el.value = n[k]; } if ("stats" in ch) week(); });
async function week() { const { stats = {} } = await store.get("stats"), since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), n = Object.entries(stats).filter(([d]) => d >= since).reduce((a, [, v]) => a + v, 0);
  $("#weekCount").textContent = n ? `${n} timer${n === 1 ? "" : "s"} finished this week (kept on this device)` : ""; }
store.on(ch => { if ("stats" in ch) week(); }); week();
window.onFinished = async () => { if (EXT) return; const { stats = {} } = await store.get("stats"), d = new Date().toISOString().slice(0, 10); stats[d] = (stats[d] || 0) + 1; await store.set({ stats: Object.fromEntries(Object.entries(stats).sort().slice(-60)) }); }; // the extension’s background counts its own

/* ---------- the welcome, once ---------- */
const welcomed = () => { try { return localStorage.getItem("bbt-welcomed"); } catch { return "1"; } };
if (new URLSearchParams(location.search).get("welcome") || (!EXT && !welcomed())) { $("#welcome").hidden = false; $("#wOk").focus(); }
$("#wOk").onclick = () => { $("#welcome").hidden = true; try { localStorage.setItem("bbt-welcomed", "1"); } catch {} $("#start").focus(); };

/* ---------- lesson plans: the editor ---------- */
S.planDraft ||= { name: "", steps: [{ n: "Do now", s: 300 }, { n: "Group work", s: 600 }, { n: "Pack up", s: 120 }] };
const clean = p => ({ name: String(p?.name || "").slice(0, 40) || "My lesson plan", steps: (p?.steps || []).map(x => Array.isArray(x) ? { n: x[0], s: x[1] } : x).filter(x => x && +x.s >= 5 && +x.s <= 10800).slice(0, 20).map(x => ({ n: String(x.n || "Step").slice(0, 40), s: Math.round(+x.s) })) });
function drawSteps() { const d = S.planDraft; $("#planName").value = d.name;
  $("#steps").innerHTML = d.steps.map((x, i) => `<li><input data-n="${i}" value="${escH(x.n)}" aria-label="Step ${i + 1} name"><input data-s="${i}" value="${escH(fmtShort(x.s))}" aria-label="Step ${i + 1} time"><button class="btn" data-up="${i}" aria-label="Move step ${i + 1} up" ${i ? "" : "disabled"}>↑</button><button class="btn" data-down="${i}" aria-label="Move step ${i + 1} down" ${i < d.steps.length - 1 ? "" : "disabled"}>↓</button><button class="btn" data-del="${i}" aria-label="Remove step ${i + 1}">✕</button></li>`).join("");
  const total = d.steps.reduce((a, x) => a + x.s, 0); $("#planTotal").textContent = `${d.steps.length} step${d.steps.length === 1 ? "" : "s"} · ${fmtShort(total)} in all`; }
$("#planName").oninput = e => { S.planDraft.name = e.target.value.slice(0, 40); save(); };
$("#steps").addEventListener("change", e => { const i = e.target.dataset.n ?? e.target.dataset.s; if (i == null) return; const st = S.planDraft.steps[+i];
  if (e.target.dataset.n != null) st.n = e.target.value.slice(0, 40) || "Step";
  else { const t = parseTime(e.target.value); if (t && t >= 5 && t <= 10800) st.s = t; else pmsg("Use a time like 5m, 90s, 2:30 or 1h (up to 3 hours)."); }
  save(); drawSteps(); });
$("#steps").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const st = S.planDraft.steps, i = +(b.dataset.up ?? b.dataset.down ?? b.dataset.del);
  if (b.dataset.up != null && i > 0) [st[i - 1], st[i]] = [st[i], st[i - 1]]; if (b.dataset.down != null && i < st.length - 1) [st[i + 1], st[i]] = [st[i], st[i + 1]];
  if (b.dataset.del != null) st.splice(i, 1); save(); drawSteps(); const f = $(`#steps [data-${b.dataset.del != null ? "n" : b.dataset.up != null ? "up" : "down"}="${Math.max(0, Math.min(st.length - 1, b.dataset.up != null ? i - 1 : b.dataset.down != null ? i + 1 : i))}"]`); f?.focus(); });
$("#addStep").onclick = () => { if (S.planDraft.steps.length >= 20) return pmsg("Plans can have up to 20 steps."); S.planDraft.steps.push({ n: "Step " + (S.planDraft.steps.length + 1), s: 300 }); save(); drawSteps(); $(`#steps [data-n="${S.planDraft.steps.length - 1}"]`).select(); };

/* ---------- running a plan ---------- */
$("#planStart").onclick = async () => { const p = clean(S.planDraft); if (!p.steps.length) return pmsg("Add at least one step.");
  doneShown = false; if (EXT) await bg({ type: "startPlan", plan: p }); else await store.set({ timer: { endAt: Date.now() + p.steps[0].s * 1000, duration: p.steps[0].s, message: p.steps[0].n, paused: null, plan: { ...p, i: 0 } } });
  say(`Plan started: ${p.steps[0].n}, ${fmtShort(p.steps[0].s)}`); show("plans", false); };
let advancing = false; // the website moves to the next step itself; in the extension the background does
let dueFor = null;
window.onStepEnd = async () => { const key = T?.plan ? T.plan.name + "|" + T.plan.i : null;
  if (EXT) { if (key && key !== dueFor) { dueFor = key; bg({ type: "due" }); } return; } // the background moves on, straight away
  if (advancing) return; advancing = true; await nextStep(); advancing = false; };
async function nextStep() { if (EXT) return bg({ type: "planSkip" }); if (!T?.plan) return; const i = T.plan.i + 1;
  if (i >= T.plan.steps.length) return store.set({ timer: null }); const st = T.plan.steps[i];
  await store.set({ timer: { endAt: Date.now() + st.s * 1000, duration: st.s, message: st.n, paused: null, plan: { ...T.plan, i } } }); }
$("#stepSkip").onclick = () => nextStep();
let lastKey = null, toastT;
setInterval(() => { const p = T?.plan, line = $("#stepLine"); if (!p) { line.hidden = true; lastKey = null; return; } line.hidden = false;
  const nx = p.steps[p.i + 1]; $("#stepText").textContent = `Step ${p.i + 1} of ${p.steps.length} · ${nx ? `Next: ${nx.n} (${fmtShort(nx.s)})` : "Last step"}`; $("#stepSkip").textContent = nx ? "Next step ▸" : "Finish ▸";
  const key = p.name + "|" + p.i; if (lastKey && key !== lastKey && p.i > 0) { sound("chime"); say(`Now: ${p.steps[p.i].n}, ${fmtShort(p.steps[p.i].s)}`); toast(`Now: ${p.steps[p.i].n}`); } lastKey = key; }, 250);
function toast(t) { let el = $(".toastline"); if (!el) { el = document.createElement("div"); el.className = "toastline"; el.setAttribute("aria-hidden", "true"); document.body.append(el); } el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 3500); }

/* ---------- saving plans on this device ---------- */
async function drawSaved() { const { plans = [] } = await store.get("plans"); $("#planSaved").innerHTML = `<option value="">${plans.length ? "Choose a saved plan…" : "No saved plans yet"}</option>` + plans.map((p, i) => `<option value="${i}">${escH(p.name)} (${p.steps.length} steps)</option>`).join(""); }
$("#planSave").onclick = async () => { const p = clean(S.planDraft), { plans = [] } = await store.get("plans"); const list = [p, ...plans.filter(x => x.name !== p.name)].slice(0, 30); await store.set({ plans: list }); drawSaved(); pmsg(`Saved “${p.name}” on this device.`); };
$("#planSaved").onchange = async e => { if (e.target.value === "") return; const { plans = [] } = await store.get("plans"), p = plans[+e.target.value]; if (!p) return; S.planDraft = clean(p); save(); drawSteps(); pmsg(`Loaded “${p.name}”.`); };
$("#planDel").onclick = async () => { const v = $("#planSaved").value; if (v === "") return pmsg("Choose a saved plan to delete."); const { plans = [] } = await store.get("plans"), p = plans[+v]; plans.splice(+v, 1); await store.set({ plans }); drawSaved(); pmsg(`Deleted “${p?.name}”.`); };

/* ---------- sharing: a link, a file, and the shared library ---------- */
const code = p => b64(JSON.stringify({ v: 1, name: p.name, steps: p.steps.map(x => [x.n, x.s]) }));
const linkFor = p => `${here}#plan=${code(p)}`;
function fromCode(c) { const j = JSON.parse(unb64(c)); if (j.v !== 1) throw 0; return clean(j); }
function loadShared(p, how) { S.planDraft = p; save(); drawSteps(); show("plans", true); pmsg(`${how} “${p.name}”: ${p.steps.length} steps, ${fmtShort(p.steps.reduce((a, x) => a + x.s, 0))}. Start it, change it, or Save it.`); }
$("#planLink").onclick = async () => { const l = linkFor(clean(S.planDraft)); try { await navigator.clipboard.writeText(l); pmsg("Link copied. Anyone who opens it sees this plan on the website and can use it."); } catch { prompt("Copy this link:", l); } };
$("#planExport").onclick = () => { const p = clean(S.planDraft), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: 1, app: "brain-boost-timer-plan", name: p.name, steps: p.steps.map(x => [x.n, x.s]) }, null, 1)], { type: "application/json" })); a.download = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".bbtplan.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
$("#planImportBtn").onclick = () => $("#planImport").click();
$("#planImport").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { const j = JSON.parse(await f.text()); loadShared(clean(j), "Opened"); } catch { pmsg("That file isn’t a Brain Boost Time(r) plan."); } };
$("#planPaste").onchange = e => { const m = e.target.value.match(/#plan=([\w-]+)/) || e.target.value.match(/^([\w-]{20,})$/); if (!m) return pmsg("That doesn’t look like a plan link."); try { loadShared(fromCode(m[1]), "Opened"); e.target.value = ""; } catch { pmsg("That plan link couldn’t be read."); } };
$("#planSubmit").onclick = () => { const p = clean(S.planDraft), body = `**Plan:** ${p.name}\n\n${p.steps.map((x, i) => `${i + 1}. ${x.n}: ${fmtShort(x.s)}`).join("\n")}\n\n**Try it:** ${SITE}#plan=${code(p)}\n\n**What it’s good for (optional):** \n\n<!-- Please don’t include students’ names or other personal details. -->\n\n\`\`\`json\n${JSON.stringify({ v: 1, name: p.name, steps: p.steps.map(x => [x.n, x.s]) })}\n\`\`\``;
  window.open(`${REPO}/issues/new?title=${encodeURIComponent("Lesson plan: " + p.name)}&labels=lesson-plan&body=${encodeURIComponent(body)}`, "_blank", "noopener"); pmsg("GitHub opened in a new tab: add a note on what the plan is good for, then submit."); };
$("#planBrowse").onclick = async () => { if (EXT) { window.open(SITE + "#gallery", "_blank", "noopener"); return; }
  const g = $("#gallery"); g.innerHTML = `<p class="hint">Loading shared plans…</p>`;
  try { const j = await (await fetch("plans/index.json", { cache: "no-cache" })).json(), list = (j.plans || []).map(x => ({ ...clean(x), about: String(x.about || "").slice(0, 140), by: String(x.by || "").slice(0, 40) }));
    g.innerHTML = list.map((p, i) => `<div class="plancard"><b>${escH(p.name)}</b><p class="hint">${p.steps.map(x => `${escH(x.n)} ${fmtShort(x.s)}`).join(" → ")} · ${fmtShort(p.steps.reduce((a, x) => a + x.s, 0))}</p>${p.about ? `<p class="hint">${escH(p.about)}${p.by ? ` · shared by ${escH(p.by)}` : ""}</p>` : ""}<div class="row"><button class="btn" data-use="${i}">Use this plan</button></div></div>`).join("") || `<p class="hint">No shared plans yet.</p>`;
    g.onclick = e => { const b = e.target.closest("[data-use]"); if (b) loadShared(list[+b.dataset.use], "Loaded"); }; } catch { g.innerHTML = `<p class="hint">The shared library couldn’t be loaded. Check the connection, or try again later.</p>`; } };

/* ---------- opening a shared plan or the library from a link ---------- */
function fromHash() { const m = location.hash.match(/^#plan=([\w-]+)$/);
  if (m) { try { loadShared(fromCode(m[1]), "A shared plan:"); } catch { show("plans", true); pmsg("That plan link couldn’t be read."); } }
  if (location.hash === "#gallery") { show("plans", true); $(".share").open = true; $("#planBrowse").click(); } }
addEventListener("hashchange", fromHash);
drawSteps(); drawSaved(); setTimeout(fromHash, 50);
};
if (window.__bbtReady) bbtMore(); else addEventListener("bbt-ready", bbtMore, { once: true }); // after bbt.js has loaded the saved settings
