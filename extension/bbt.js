/* Brain Boost Time(r) big screen: the melting bubble tea timer, stirring, and the boba picker for names or numbers.
   The same file runs in the extension (Chrome storage, background alarms) and on the website (this page's own storage
   and timer), through the small adapter below. Sound uses the Web Audio API: no audio files. */
const $ = s => document.querySelector(s), NS = "http://www.w3.org/2000/svg";
const EXT = typeof chrome !== "undefined" && !!chrome.runtime?.id;
document.documentElement.classList.add(EXT ? "is-ext" : "is-web");
const ASSET = new URL(".", document.currentScript?.src || location.href).href; // icons sit beside this script, on the website too
const VERSION = EXT ? chrome.runtime.getManifest().version : "website";

/* ---------- where things are kept, and who runs the timer ---------- */
const listeners = [];
const store = EXT ? {
  get: k => chrome.storage.local.get(k), set: o => chrome.storage.local.set(o),
  on: cb => chrome.storage.onChanged.addListener(ch => cb(Object.fromEntries(Object.entries(ch).map(([k, v]) => [k, v.newValue])))) }
 : { get: async k => { const out = {}; for (const x of [].concat(k)) { try { const v = localStorage.getItem("bbt-" + x); if (v != null) out[x] = JSON.parse(v); } catch {} } return out; },
     set: async o => { for (const [k, v] of Object.entries(o)) { try { v == null ? localStorage.removeItem("bbt-" + k) : localStorage.setItem("bbt-" + k, JSON.stringify(v)); } catch {} } listeners.forEach(f => f(o)); },
     on: cb => listeners.push(cb) };
const bg = (m) => EXT ? chrome.runtime.sendMessage(m).catch(() => {}) : Promise.resolve();
/* ---------- your timers: recent and most used, kept only on this device ---------- */
const fmtShort = s => s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
async function remember(seconds, message) { // used on the website; the extension's background does the same
  if (!S.remember) return; const { timerHistory = [] } = await store.get("timerHistory"), m = S.rememberMsg ? (message || "").slice(0, 60) : "", k = seconds + "|" + m;
  const h = timerHistory.filter(x => x.s + "|" + x.m !== k), old = timerHistory.find(x => x.s + "|" + x.m === k);
  await store.set({ timerHistory: [{ s: seconds, m, n: (old?.n || 0) + 1, t: Date.now() }, ...h].slice(0, 8) }); }
function drawRecent(h = []) { const box = $("#recent"); if (!S.remember || !h.length) { box.innerHTML = ""; return; }
  const most = [...h].sort((a, b) => b.n - a.n || b.t - a.t).slice(0, 3), recent = [...h].sort((a, b) => b.t - a.t), show = [...new Map([...most, ...recent].map(x => [x.s + "|" + x.m, x])).values()].slice(0, 6);
  box.innerHTML = show.map((x, i) => `<span class="chip"><button data-i="${i}" title="Used ${x.n} time${x.n === 1 ? "" : "s"}">${fmtShort(x.s)}${x.m ? " · " + x.m.replace(/[&<]/g, c => ({ "&": "&amp;", "<": "&lt;" }[c])) : ""}</button><button class="x" data-forget="${i}" aria-label="Forget ${fmtShort(x.s)}${x.m ? " " + x.m.replace(/"/g, "") : ""}">✕</button></span>`).join("") + `<button class="chip-clear" id="clearRecent">Clear</button>`;
  box.onclick = async e => { const b = e.target.closest("button"); if (!b) return; const { timerHistory = [] } = await store.get("timerHistory");
    if (b.id === "clearRecent") { await store.set({ timerHistory: [] }); return say("Your timers were cleared."); }
    const x = show[+(b.dataset.i ?? b.dataset.forget)]; if (!x) return;
    if (b.dataset.forget != null) { await store.set({ timerHistory: timerHistory.filter(y => !(y.s === x.s && y.m === x.m)) }); return say("Forgotten."); }
    doneShown = false; $("#message").value = x.m; await startTimer(x.s, x.m); say(`Timer started: ${fmtShort(x.s)}`); }; }
async function startTimer(seconds, message) { if (EXT) return bg({ type: "start", seconds, message }); remember(seconds, message); await store.set({ timer: { endAt: Date.now() + seconds * 1000, duration: seconds, message: message || "", paused: null } }); }

/* ---------- flavours and colours ---------- */
const FLAVOURS = [
  ["classic", "Classic milk tea", "#D9B48F", "#A87B51", "#2B1B14"], ["brown", "Brown sugar", "#EBD7BE", "#8B5A2B", "#3B2416"],
  ["taro", "Taro", "#D6BDEB", "#9C7CC6", "#2B1B14"], ["matcha", "Matcha", "#C6E2A5", "#7FA650", "#2B1B14"],
  ["thai", "Thai tea", "#F9C58B", "#E07A2F", "#2B1B14"], ["strawberry", "Strawberry", "#FFC9D6", "#F05D82", "#C81D3A"],
  ["mango", "Mango", "#FFE7A3", "#F9A826", "#F2A20C"], ["lychee", "Lychee", "#FFF1F4", "#F4C3D0", "#E8E1D4"],
  ["passion", "Passionfruit", "#FFD98A", "#EF8354", "#F4B400"], ["apple", "Green apple", "#DDF5AE", "#8BC34A", "#5E9E2F"],
  ["grape", "Grape", "#DCC2F4", "#7B4BB7", "#5B2A86"], ["blue", "Blue raspberry", "#B5EDFF", "#2D9CDB", "#1565C0"],
  ["sunset", "Sunset (mango and strawberry)", "#FFD36E", "#F05D82", "#C81D3A"], ["ocean", "Ocean (blue and lychee)", "#E3F7FF", "#3A86FF", "#1D3557"]];
const BOBA = { black: "#16100c", brown: "#3B2416", grey: "#6b6b6b" };
const D = { remember: true, rememberMsg: true, flavour: "classic", boba: "black", sound: true, remindSound: true, motion: true, noRepeat: true, sep: "auto", names: "", pickedNames: [], pickedNums: [], mode: "names", numFrom: 1, numTo: 30, hideList: false, tilt: 0, seed: 7, openAs: "window" };
let S = { ...D }, T = null, chosen = 300, doneShown = false;
const reduce = () => !S.motion || matchMedia("(prefers-reduced-motion: reduce)").matches;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toHex = a => "#" + a.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const lum = h => { const [r, g, b] = hex(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const ink = bg => lum(bg) > .35 ? "#111111" : "#ffffff";
const flavour = () => FLAVOURS.find(f => f[0] === S.flavour) || FLAVOURS[0], bobaColour = () => S.boba === "match" ? flavour()[4] : BOBA[S.boba];
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // a stable random arrangement for each stir

/* ---------- the drink ---------- */
const cupX = y => [78 + (y - 150) * 30 / 410, 322 - (y - 150) * 30 / 410]; // the cup's inside edges at height y
const STRAW = { bx: 247, by: 512, tx: 289, ty: 8, half: 11 }; // the straw's centre line, from its bottom to its top, and half its width
// the straw passes through a hole in the lid, so it pivots there: the top moves one way, the bottom the other, inside the cup
const LID_Y = 144, PIV = { x: STRAW.bx + (STRAW.tx - STRAW.bx) * (STRAW.by - LID_Y) / (STRAW.by - STRAW.ty), y: LID_Y };
const turn = (x, y, deg) => { const a = deg * Math.PI / 180, dx = x - PIV.x, dy = y - PIV.y; return [PIV.x + dx * Math.cos(a) - dy * Math.sin(a), PIV.y + dx * Math.sin(a) + dy * Math.cos(a)]; };
// how far it can tilt each way before the bottom of the straw touches a wall of the cup (with a small gap)
const TILT = (() => { const ok = d => { for (const f of [1, .75, .5]) { const [x, y] = turn(STRAW.bx + (PIV.x - STRAW.bx) * (1 - f), STRAW.by + (PIV.y - STRAW.by) * (1 - f), d), [l, r] = cupX(y); if (x - STRAW.half < l + 3 || x + STRAW.half > r - 3 || y > 556) return false; } return true; };
  let lo = 0, hi = 0; while (lo > -40 && ok(lo - .25)) lo -= .25; while (hi < 40 && ok(hi + .25)) hi += .25; return { min: lo, max: hi }; })();
const clampTilt = t => Math.max(TILT.min, Math.min(TILT.max, +t || 0));
function pearls() { const r = rng(S.seed), out = []; let y = 556; for (let row = 0; row < 3; row++, y -= 25) { const [l, rr] = cupX(y); for (let x = l + 20 + r() * 14; x < rr - 16; x += 25 + r() * 5) out.push([x + (r() - .5) * 6, y + (r() - .5) * 8]); } return out; }
function drawPearls() { const g = $("#bobas"); g.innerHTML = ""; const c = bobaColour();
  for (const [x, y] of pearls()) { const e = document.createElementNS(NS, "circle"); e.setAttribute("cx", x); e.setAttribute("cy", y); e.setAttribute("r", 12.5); e.setAttribute("fill", c); g.append(e);
    const h = document.createElementNS(NS, "circle"); h.setAttribute("cx", x - 4); h.setAttribute("cy", y - 4); h.setAttribute("r", 3); h.setAttribute("fill", "rgba(255,255,255,.35)"); g.append(h); } }
function progress() { if (!T) return 0; const left = T.paused != null ? T.paused : T.endAt - Date.now(); return Math.min(1, Math.max(0, 1 - left / (T.duration * 1000))); }
function drawTea() {
  const f = flavour(), p = progress(), dil = T ? p * .55 : 0;
  $("#s1").setAttribute("stop-color", mix(f[2], "#FFF8EF", dil)); $("#s2").setAttribute("stop-color", mix(f[3], "#FFF1E2", dil));
  const level = 206 - (T ? p * 20 : 0); $("#liquid").setAttribute("y", level);
  const g = $("#ice"); g.innerHTML = ""; if (!T || p >= 1) return;
  const n = Math.max(3, Math.min(8, Math.round(T.duration / 75) + 2)), r = rng(S.seed * 31 + 3), [l, rr] = cupX(level + 30);
  for (let i = 0; i < n; i++) { const remain = Math.max(0, Math.min(1, (1 - p) * 1.15 - i * .015)), s = 52 * (.25 + .75 * remain ** .8); const cx = l + 30 + (rr - l - 60) * r(), cy = level + 12 + r() * 80, rot = r() * 60 - 30; if (remain <= 0) continue;
    const e = document.createElementNS(NS, "rect"); e.setAttribute("x", cx - s / 2); e.setAttribute("y", cy - s / 2); e.setAttribute("width", s); e.setAttribute("height", s); e.setAttribute("rx", 6 + 10 * (1 - remain)); e.setAttribute("class", "ice"); e.setAttribute("opacity", .45 + .55 * remain); e.setAttribute("transform", `rotate(${rot} ${cx} ${cy})`); g.append(e); }
}
const placeStraw = () => { S.tilt = clampTilt(S.tilt); $("#strawG").setAttribute("transform", `rotate(${S.tilt} ${PIV.x} ${PIV.y})`); };
const strawPoint = f => turn(STRAW.bx + (STRAW.tx - STRAW.bx) * f, STRAW.by + (STRAW.ty - STRAW.by) * f, S.tilt); // a point along the straw, f = 0 at the bottom, 1 at the top

/* ---------- stirring: everything swirls, then settles in a new arrangement ---------- */
let stirring = false;
async function stir() {
  if (stirring) return; stirring = true; sound("stir"); say("Stirred");
  if (!reduce()) { const opts = { duration: 1300, easing: "cubic-bezier(.3,.1,.2,1)" };
    for (const id of ["#bobas", "#ice"]) { const g = $(id); g.style.transformBox = "view-box"; g.style.transformOrigin = id === "#bobas" ? "200px 520px" : "200px 280px"; g.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(320deg)" }, { transform: "rotate(360deg)" }], opts); }
    { const g = $("#strawG"), a = clampTilt(S.tilt - 10), b = clampTilt(S.tilt + 10), t0 = S.tilt; let start = null; // swing between the limits, about the lid
      const step = now => { start ??= now; const k = Math.min(1, (now - start) / 1300), w = Math.sin(k * Math.PI * 2) * (1 - k); g.setAttribute("transform", `rotate(${w < 0 ? t0 + (a - t0) * -w : t0 + (b - t0) * w} ${PIV.x} ${PIV.y})`); if (k < 1) requestAnimationFrame(step); else placeStraw(); };
      requestAnimationFrame(step); }
    await new Promise(r => setTimeout(r, 1300)); }
  S.seed = Math.floor(Math.random() * 1e9); drawPearls(); drawTea(); save(); stirring = false;
}
$("#stir").onclick = stir;
const BOBA_NAMES = { black: "black boba", brown: "brown sugar boba", grey: "grey boba", match: "boba to match" };
let landedT;
async function surprise() {
  const pick = a => a[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * a.length)];
  const f = pick(FLAVOURS.filter(x => x[0] !== S.flavour)), b = pick(Object.keys(BOBA_NAMES));
  S.flavour = f[0]; S.boba = b; $("#flavour").value = f[0]; $("#boba").value = b; save(); drawPearls(); drawTea();
  const l = $("#landed"); l.textContent = `🎲 ${f[1]} with ${BOBA_NAMES[b]}`; l.hidden = false; clearTimeout(landedT); landedT = setTimeout(() => { l.hidden = true; }, 6000);
  if (!reduce()) l.animate([{ transform: "scale(.7)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: .6 }, { transform: "scale(1)" }], { duration: 380, easing: "ease-out" });
  say(`Surprise: ${f[1]} with ${BOBA_NAMES[b]}`); stir();
}
$("#surprise").onclick = surprise;

/* ---------- the timer ---------- */
const fmt = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
function parseTime(t) { t = t.trim(); let m = t.match(/^(\d{1,3}):([0-5]\d)$/); if (m) return +m[1] * 60 + +m[2]; m = t.match(/^(\d+(?:\.\d+)?)\s*(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?)?$/i); if (!m) return null; const u = (m[2] || "m")[0].toLowerCase(); return Math.round(+m[1] * (u === "s" ? 1 : u === "h" ? 3600 : 60)); }
let lastSay = 0, lastBadge = null;
if (EXT) addEventListener("pagehide", () => bg({ type: "badge" })); // when this screen closes, the background keeps the badge going
function tick() {
  const left = T ? (T.paused != null ? T.paused : T.endAt - Date.now()) / 1000 : chosen;
  const tt = fmt(left); $("#time").textContent = tt; $("#time").style.setProperty("--w", ((tt.match(/\d/g) || []).length * .62 + (tt.match(/:/g) || []).length * .32).toFixed(2)); drawTea(); // the giant numbers fit, however long the time
  $("#pause").disabled = !T; $("#pause").textContent = T?.paused != null ? "▶ Resume" : "❚❚ Pause"; $("#start").textContent = T ? "▶ Restart" : "▶ Start";
  $("#msg").textContent = T ? (T.paused != null ? "Paused" : T.message || "Brain Boost Time") : ($("#message").value || "Ready for Brain Boost Time");
  if (EXT) { const t = !T ? "" : left <= 0 ? "" : left >= 3600 ? Math.floor(left / 3600) + "h" : left < 600 ? `${Math.floor(Math.ceil(left) / 60)}:${String(Math.ceil(left) % 60).padStart(2, "0")}` : Math.ceil(left / 60) + "m"; // the countdown on the toolbar icon
    if (t !== lastBadge) { lastBadge = t; chrome.action.setBadgeText({ text: t }); chrome.action.setBadgeBackgroundColor({ color: T?.paused != null ? "#6b7280" : "#00838f" }); chrome.action.setBadgeTextColor?.({ color: "#ffffff" }); } }
  if (T && T.paused == null && left <= 0 && !doneShown) { // a lesson plan moves on by itself until its last step
    if (T.plan && T.plan.i < T.plan.steps.length - 1) window.onStepEnd?.();
    else if (T.plan) finish("Plan complete!", `“${T.plan.name}”: all ${T.plan.steps.length} steps done.`); else finish(); }
  if (T && T.paused == null && left > 0 && Date.now() - lastSay > 60000) { lastSay = Date.now(); say(`${fmt(left)} left`); }
}
function finish(title = "Time’s up!", text, quiet = false) { doneShown = true; window.onFinished?.(); $("#doneT").textContent = title; $("#doneMsg").textContent = text || T?.message || "Time for Brain Boost Time! Stretch, breathe and have a drink of water."; $("#done").hidden = false; $("#doneOk").focus(); (quiet || sound("chime")); say(title + " " + $("#doneMsg").textContent);
  if (!EXT && "Notification" in window && Notification.permission === "granted" && document.hidden) new Notification("Brain Boost Time(r)", { body: $("#doneMsg").textContent, icon: ASSET + "icons/icon128.png" }); }
$("#doneOk").onclick = async () => { $("#done").hidden = true; if (/Time’s up!|Plan complete!/.test($("#doneT").textContent)) await store.set({ timer: null }); };
$("#start").onclick = async () => { const custom = parseTime($("#custom").value || ""), secs = custom || chosen; if (!secs) return; doneShown = false; await startTimer(secs, $("#message").value.trim()); say(`Timer started: ${fmt(secs)}`); };
$("#pause").onclick = async () => { if (!T) return; if (T.paused == null) { await store.set({ timer: { ...T, paused: T.endAt - Date.now() } }); bg({ type: "pause" }); }
  else { const endAt = Date.now() + T.paused; await store.set({ timer: { ...T, endAt, paused: null } }); bg({ type: "resume", endAt }); } };
$("#reset").onclick = async () => { await store.set({ timer: null }); bg({ type: "stop" }); doneShown = false; $("#done").hidden = true; };
document.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { chosen = +b.dataset.s; $("#custom").value = ""; document.querySelectorAll("[data-s]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); if (!T) tick(); });
$("#custom").oninput = () => { const s = parseTime($("#custom").value); if (s && !T) { chosen = s; tick(); } };

/* ---------- the picker: names or numbers ---------- */
function names() { const t = S.names.trim(); if (!t) return []; const sep = S.sep === "auto" ? (/\n/.test(t) ? "lines" : /[,;]/.test(t) ? "commas" : /\t/.test(t) ? "tabs" : "spaces") : S.sep;
  return [...new Set(t.split({ lines: /\r?\n+/, commas: /[,;]+/, spaces: /\s+/, tabs: /\t+/ }[sep]).map(x => x.trim()).filter(Boolean))]; }
const range = () => { const a = Math.floor(+S.numFrom || 0), b = Math.floor(+S.numTo || 0), lo = Math.min(a, b), hi = Math.max(a, b); return hi - lo > 9999 ? [] : Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i)); };
const allItems = () => S.mode === "numbers" ? range() : names(), pickedKey = () => S.mode === "numbers" ? "pickedNums" : "pickedNames";
const left = () => { const all = allItems(); return S.noRepeat ? all.filter(n => !S[pickedKey()].includes(n)) : all; };
function drawPicker() {
  const all = allItems(), l = left(), picked = S[pickedKey()], kind = S.mode === "numbers" ? "number" : "name";
  $("#mNames").setAttribute("aria-pressed", String(S.mode === "names")); $("#mNums").setAttribute("aria-pressed", String(S.mode === "numbers"));
  $("#namesBox").hidden = S.mode !== "names"; $("#numsBox").hidden = S.mode !== "numbers";
  $("#list").hidden = S.hideList; $("#hiddenNote").hidden = !S.hideList || S.mode !== "names";
  $("#count").textContent = !all.length ? (S.mode === "numbers" ? "Choose a range (up to 10,000 numbers)" : "Add some names to pick from") : `${all.length} ${kind}${all.length === 1 ? "" : "s"}${S.noRepeat ? `, ${l.length} left` : ""}`;
  const out = S.noRepeat && all.length && !l.length; // everyone has been picked: the Pick button offers to put them back
  $("#pick").textContent = out ? `↺ All picked: put them back` : "🧋 Pick"; $("#resetPicks").disabled = !picked.length;
  $("#pickedN").textContent = picked.length; $("#picked").innerHTML = picked.map(n => `<li>${n.replace(/[&<]/g, c => ({ "&": "&amp;", "<": "&lt;" }[c]))}</li>`).join("");
}
let picking = false;
async function pick() {
  if (picking) return; const all = allItems(); if (!all.length) { openPicker(); (S.mode === "numbers" ? $("#numTo") : $("#list")).focus(); return say(S.mode === "numbers" ? "Choose a range first." : "Add some names first."); }
  const pool = left(); if (!pool.length) return putBack();
  picking = true; const v = pool[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * pool.length)], c = bobaColour(), b = $("#bubble"); b.hidden = true;
  if (!reduce()) { sound("slurp"); const e = document.createElementNS(NS, "circle"); e.setAttribute("r", 13); e.setAttribute("fill", c); $("#flying").append(e); // up the straw, at its angle
    const pts = [0, .5, 1].map(strawPoint), [ex, ey] = strawPoint(1.08);
    await e.animate([...pts.map(([x, y], i) => ({ transform: `translate(${x}px,${y}px)`, offset: i / 3 })), { transform: `translate(${ex}px,${ey - 30}px) scale(1.6)`, opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished; e.remove(); }
  b.textContent = v; b.style.background = c; b.style.color = ink(c); b.hidden = false; b.setAttribute("aria-hidden", "false");
  if (!reduce()) b.animate([{ transform: "translate(-50%,10px) scale(.4)", opacity: 0 }, { transform: "translate(-50%,0) scale(1.08)", opacity: 1, offset: .7 }, { transform: "translate(-50%,0) scale(1)" }], { duration: 420, easing: "ease-out" });
  sound("pop"); say(`Picked: ${v}`); S[pickedKey()] = [...S[pickedKey()], v]; save(); drawPicker(); picking = false;
}
function putBack() { S[pickedKey()] = []; save(); drawPicker(); $("#bubble").hidden = true; say(S.mode === "numbers" ? "All numbers are back in the cup." : "All names are back in the cup."); }
$("#pick").onclick = pick; $("#resetPicks").onclick = putBack; $("#bubble").onclick = () => { $("#bubble").hidden = true; };
$("#mNames").onclick = () => { S.mode = "names"; save(); drawPicker(); }; $("#mNums").onclick = () => { S.mode = "numbers"; save(); drawPicker(); };
for (const id of ["numFrom", "numTo"]) $("#" + id).oninput = () => { S[id] = $("#" + id).value; S.pickedNums = S.pickedNums.filter(n => range().includes(n)); save(); drawPicker(); };
$("#list").oninput = () => { S.names = $("#list").value; save(); drawPicker(); }; $("#sep").onchange = () => { S.sep = $("#sep").value; save(); drawPicker(); };
$("#noRepeat").onchange = () => { S.noRepeat = $("#noRepeat").checked; save(); drawPicker(); };
$("#hideList").onchange = () => { S.hideList = $("#hideList").checked; save(); drawPicker(); };
$("#clearList").onclick = () => { if (S.names && !confirm("Clear the whole name list?")) return; S.names = ""; S.pickedNames = []; $("#list").value = ""; save(); drawPicker(); say("The name list is empty."); };

/* ---------- the straw: drag to tilt it, click to pick ---------- */
{ const st = $("#strawG"); let down = null;
  st.onpointerdown = e => { e.preventDefault(); down = { x: e.clientX, tilt: S.tilt, moved: false }; st.setPointerCapture?.(e.pointerId); };
  st.onpointermove = e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 6) down.moved = true; if (down.moved) { S.tilt = clampTilt(down.tilt + dx / 6); st.classList.add("dragging"); placeStraw(); } };
  st.onpointerup = () => { if (!down) return; const moved = down.moved; down = null; st.classList.remove("dragging"); if (moved) { save(); say(`Straw tilted ${Math.round(S.tilt)} degrees`); } else pick(); };
  st.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const was = S.tilt; S.tilt = clampTilt(S.tilt + (e.key === "ArrowLeft" ? -2 : 2)); placeStraw(); save(); if (S.tilt === was) say("The straw is touching the side of the cup"); } };
  st.setAttribute("aria-label", "The straw: Enter picks, left and right arrows tilt it"); }

/* ---------- panels, settings and suggestions ---------- */
const toggle = (btn, panel, open) => { const p = $(panel), on = open ?? p.hidden; p.hidden = !on; $(btn).setAttribute("aria-expanded", String(on)); };
const openPicker = () => toggle("#namesBtn", "#names", true);
$("#namesBtn").onclick = () => toggle("#namesBtn", "#names"); $("#setBtn").onclick = () => toggle("#setBtn", "#settings");
$("#flavour").innerHTML = FLAVOURS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join("");
for (const k of ["flavour", "boba"]) $("#" + k).onchange = () => { S[k] = $("#" + k).value; save(); drawPearls(); drawTea(); };
for (const k of ["sound", "motion"]) $("#" + k).onchange = () => { S[k] = $("#" + k).checked; save(); };
$("#remindSound").onchange = async () => { S.remindSound = $("#remindSound").checked; save(); if (EXT) await chrome.storage.local.set({ settings: S }); if (S.remindSound) sound("chime"); }; // the reminder window reads it from the extension’s storage
for (const k of ["remember", "rememberMsg"]) $("#" + k).onchange = async () => { S[k] = $("#" + k).checked; save(); if (EXT) await chrome.storage.local.set({ settings: S }); // the background reads these
  if (!S.remember) { await store.set({ timerHistory: [] }); say("Timers won’t be remembered, and the list was cleared."); }
  else if (!S.rememberMsg) { const { timerHistory = [] } = await store.get("timerHistory"); await store.set({ timerHistory: timerHistory.map(x => ({ ...x, m: "" })) }); say("Messages won’t be remembered, and saved ones were removed."); }
  $("#rememberMsg").disabled = !S.remember; drawRecent((await store.get("timerHistory")).timerHistory); };
$("#openAs").onchange = () => { S.openAs = $("#openAs").value; save(); };
$("#remind").onchange = () => EXT ? bg({ type: "remind", on: $("#remind").checked }) : store.set({ remind: $("#remind").checked });
/* ---------- recommend a flavour or request a feature: works with Gmail, Outlook, an email app, or copying ---------- */
const DEV = "suhaimizainalshah@gmail.com";
function suggestion() { const kind = document.querySelector('#suggForm [name="kind"]:checked')?.value || "feature", text = $("#suggText").value.trim();
  const subject = `Brain Boost Time(r): ${{ flavour: "a flavour idea", feature: "a feature request", problem: "something not working" }[kind]}`;
  const body = `${text || "(Write your idea here.)"}\n\n---\n${EXT ? `Version: ${VERSION} (Chrome extension)` : "From: the website"}\nFlavour in use: ${flavour()[1]}`; return { subject, body }; }
function suggestLink() {} // kept so older calls still work
$("#suggest").onclick = () => { $("#suggStatus").textContent = ""; $("#suggestDlg").showModal(); $("#suggText").focus(); };
$("#suggForm").addEventListener("click", async e => { const b = e.target.closest("[data-send]"); if (!b) return; const { subject, body } = suggestion(), st = $("#suggStatus");
  if (!$("#suggText").value.trim()) { $("#suggText").focus(); st.textContent = "Write a few words first."; return; }
  const q = encodeURIComponent, open = u => window.open(u, "_blank", "noopener");
  if (b.dataset.send === "gmail") { open(`https://mail.google.com/mail/?view=cm&fs=1&to=${q(DEV)}&su=${q(subject)}&body=${q(body)}`); st.textContent = "Gmail opened in a new tab. Send it from there."; }
  if (b.dataset.send === "outlook") { open(`https://outlook.live.com/mail/0/deeplink/compose?to=${q(DEV)}&subject=${q(subject)}&body=${q(body)}`); st.textContent = "Outlook opened in a new tab. Send it from there."; }
  if (b.dataset.send === "app") { const a = document.createElement("a"); a.href = `mailto:${DEV}?subject=${q(subject)}&body=${q(body)}`; a.click(); st.textContent = "If nothing opened, your computer has no email app set up: use Gmail, Outlook or Copy instead."; }
  if (b.dataset.send === "copy") { try { await navigator.clipboard.writeText(`To: ${DEV}\nSubject: ${subject}\n\n${body}`); st.textContent = `Copied. Paste it into an email to ${DEV}.`; } catch { st.textContent = `Couldn’t copy here. Please email ${DEV}.`; } } });
if (!EXT && "Notification" in window && Notification.permission === "default") { const n = $("#notify"); n.hidden = false; n.onclick = async () => { await Notification.requestPermission(); n.hidden = true; }; }
let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set({ settings: S }), 250); suggestLink(); };
const say = t => { $("#live").textContent = ""; setTimeout(() => $("#live").textContent = t, 30); };
addEventListener("keydown", e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.key.toLowerCase() === "s") stir(); if (e.key.toLowerCase() === "r") surprise(); if (e.key.toLowerCase() === "p") pick(); });

/* ---------- on the website: an in-page break reminder, and a shake to stir on phones ---------- */
let webMinutes = 0;
if (!EXT) { setInterval(() => { if (!$("#remind").checked || document.hidden) return; if (++webMinutes >= 60) { webMinutes = 0; finish("Time for a break", "You’ve been here for an hour. Why not take a Brain Boost Time break? Stand up, stretch and have some water.", S.remindSound === false); } }, 60000);
  let lastShake = 0; addEventListener("devicemotion", e => { const a = e.accelerationIncludingGravity; if (!a) return; const f = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0); if (f > 32 && Date.now() - lastShake > 2000) { lastShake = Date.now(); stir(); } }); }

/* ---------- sound ---------- */
let AC; function sound(kind) { if (!S.sound) return; try { AC ||= new AudioContext(); const t = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
  const noise = (len, f0, f1, vol, q = 6) => { const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = AC.createBufferSource(), bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + len); src.buffer = buf; src.connect(bp); bp.connect(g); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + len); src.start(t); };
  if (kind === "slurp") noise(.55, 380, 1500, .5);
  if (kind === "stir") { noise(1.2, 900, 500, .25, 2); [0, .25, .5, .75].forEach(d => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = "triangle"; o.frequency.value = 1900 + Math.random() * 500; o.connect(gg); gg.connect(AC.destination); gg.gain.setValueAtTime(.0001, t + d); gg.gain.exponentialRampToValueAtTime(.12, t + d + .01); gg.gain.exponentialRampToValueAtTime(.0001, t + d + .12); o.start(t + d); o.stop(t + d + .14); }); } // ice clinks
  if (kind === "pop") { const o = AC.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1100, t + .09); o.connect(g); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14); o.start(t); o.stop(t + .15); }
  if (kind === "chime" && S.chime === "bell") [880, 1320, 1760, 2640].forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = "sine"; o.frequency.value = f; o.connect(gg); gg.connect(AC.destination); gg.gain.setValueAtTime(.0001, t); gg.gain.exponentialRampToValueAtTime(.3 / (i + 1), t + .01); gg.gain.exponentialRampToValueAtTime(.0001, t + 2.4); o.start(t); o.stop(t + 2.5); }); // a struck bell
  else if (kind === "chime" && S.chime === "soft") [440, 554.37].forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = "sine"; o.frequency.value = f; o.connect(gg); gg.connect(AC.destination); const st = t + i * .35; gg.gain.setValueAtTime(.0001, st); gg.gain.exponentialRampToValueAtTime(.16, st + .08); gg.gain.exponentialRampToValueAtTime(.0001, st + 1.2); o.start(st); o.stop(st + 1.3); }); // two quiet notes
  else if (kind === "chime") [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.frequency.value = f; o.connect(gg); gg.connect(AC.destination); const s = t + i * .18; gg.gain.setValueAtTime(.0001, s); gg.gain.exponentialRampToValueAtTime(.35, s + .02); gg.gain.exponentialRampToValueAtTime(.0001, s + .9); o.start(s); o.stop(s + 1); });
} catch {} }

/* ---------- start-up ---------- */
store.on(ch => { if ("timerHistory" in ch) drawRecent(ch.timerHistory || []); if ("timer" in ch) { T = ch.timer || null; if (T && T.paused == null && T.endAt > Date.now()) doneShown = false; tick(); } if ("remind" in ch) $("#remind").checked = ch.remind !== false; });
(async () => {
  const st = await store.get(["settings", "timer", "remind", "timerHistory"]), saved = st.settings || {};
  if (saved.picked && !saved.pickedNames) saved.pickedNames = saved.picked; // from version 2.0
  S = { ...D, ...saved }; T = st.timer || null;
  $("#flavour").value = S.flavour; $("#boba").value = S.boba; $("#sound").checked = S.sound; $("#remindSound").checked = S.remindSound !== false; $("#motion").checked = S.motion; $("#noRepeat").checked = S.noRepeat; $("#sep").value = S.sep; $("#list").value = S.names; $("#hideList").checked = S.hideList; $("#remember").checked = S.remember; $("#rememberMsg").checked = S.rememberMsg; $("#rememberMsg").disabled = !S.remember;
  $("#numFrom").value = S.numFrom; $("#numTo").value = S.numTo; $("#openAs").value = S.openAs; $("#remind").checked = st.remind !== false;
  if (!EXT) document.querySelector('label.sw:has(#remind)')?.lastChild && (document.querySelector('label.sw:has(#remind)').lastChild.textContent = " Hourly break reminder");
  document.querySelector('[data-s="300"]').setAttribute("aria-pressed", "true"); drawPearls(); placeStraw(); drawPicker(); suggestLink(); drawRecent(st.timerHistory || []);
  const q = new URLSearchParams(location.search); if (q.get("pick")) openPicker(); if (q.get("welcome")) { $("#msg").textContent = "Welcome! Choose a time, or type bbt 5m in the address bar."; toggle("#setBtn", "#settings", true); }
  if (T && T.paused == null && T.endAt <= Date.now()) { if (q.get("done")) finish(); else doneShown = true; }
  tick(); setInterval(tick, 250);
  window.__bbtReady = true; dispatchEvent(new Event("bbt-ready")); // more.js waits for this
})();
window.__bbt = { TILT, PIV, turn, names, range, parseTime, ink, stir, get S() { return S; } };
