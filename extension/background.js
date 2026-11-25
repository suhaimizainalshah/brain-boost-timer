/* Brain Boost Time(r): break reminders, the class timer and the address-bar keyword "bbt".
   Everything stays in this browser: no accounts, no servers. Alarms are used because Manifest V3's background
   code can be put to sleep, and timers made with setTimeout would be lost. */
const REMIND_AFTER = 60; // minutes of active browsing before a break reminder
const BIG = "bbt.html";

/* ---------- reminders on or off: clicking the toolbar icon, as in the original ---------- */
// clicking the icon always opens the menu: one click, one predictable thing (the menu holds the reminder switch)
async function title(on) { await chrome.action.setTitle({ title: `Brain Boost Time(r): break reminders ${on ? "on" : "off"}. Click for the menu` }); }
async function setEnabled(on) {
  await chrome.storage.local.set({ remind: on });
  const p = on ? "icon" : "off";
  await chrome.action.setIcon({ path: { 16: `icons/${p}16.png`, 32: `icons/${p}32.png` } });
  await title(on); chrome.contextMenus.update("remind", { checked: on }, () => chrome.runtime.lastError);
  if (on) chrome.alarms.create("tick", { periodInMinutes: 1 }); else { chrome.alarms.clear("tick"); chrome.storage.local.set({ minutes: 0 }); }
}
async function init() {
  const { remind = true, settings = {} } = await chrome.storage.local.get(["remind", "settings"]); await chrome.action.setPopup({ popup: "menu.html" }); await chrome.storage.local.remove("clickAction"); // older versions let the click do other things
  await setEnabled(remind); badge();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "big", title: "Open the big screen: timer and name picker", contexts: ["action"] });
    chrome.contextMenus.create({ id: "t5", title: "Start a 5-minute break timer", contexts: ["action"] });
    chrome.contextMenus.create({ id: "pick", title: "Pick a name", contexts: ["action"] });
    chrome.contextMenus.create({ id: "remind", title: "Hourly break reminders", type: "checkbox", checked: remind, contexts: ["action"] });
    chrome.contextMenus.create({ id: "set", title: "Settings", contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:sound", parentId: "set", title: "Sound", type: "checkbox", checked: settings.sound !== false, contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:remindSound", parentId: "set", title: "Chime for break reminders", type: "checkbox", checked: settings.remindSound !== false, contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:motion", parentId: "set", title: "Animation", type: "checkbox", checked: settings.motion !== false, contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:remember", parentId: "set", title: "Remember my timers", type: "checkbox", checked: settings.remember !== false, contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:sep", parentId: "set", type: "separator", contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:window", parentId: "set", title: "Open the big screen in its own window", type: "radio", checked: settings.openAs !== "tab", contexts: ["action"] });
    chrome.contextMenus.create({ id: "set:tab", parentId: "set", title: "Open the big screen in a tab", type: "radio", checked: settings.openAs === "tab", contexts: ["action"] });
  });
}
chrome.runtime.onInstalled.addListener(d => { init(); if (d.reason === "install") openBig("?welcome=1"); });
chrome.runtime.onStartup.addListener(init);
chrome.contextMenus.onClicked.addListener(async i => { if (i.menuItemId === "remind") setEnabled(!!i.checked);
  if (String(i.menuItemId).startsWith("set:")) { const k = i.menuItemId.slice(4), { settings = {} } = await chrome.storage.local.get("settings");
    if (k === "window" || k === "tab") settings.openAs = k; else settings[k] = !!i.checked;
    if (k === "remember" && !i.checked) await chrome.storage.local.set({ timerHistory: [] });
    await chrome.storage.local.set({ settings }); } if (i.menuItemId === "big") openBig(); if (i.menuItemId === "t5") startTimer(300, ""); if (i.menuItemId === "pick") openBig("?pick=1"); });

/* ---------- counting active minutes, then a reminder ---------- */
chrome.alarms.onAlarm.addListener(async a => {
  if (a.name === "tick") {
    const state = await chrome.idle.queryState(60), win = await chrome.windows.getLastFocused().catch(() => null);
    if (state !== "active" || !win?.focused) return; // idle or away from Chrome: not counted
    let { minutes = 0 } = await chrome.storage.local.get("minutes"); minutes++;
    if (minutes >= REMIND_AFTER) { minutes = 0; remind(REMIND_AFTER); }
    chrome.storage.local.set({ minutes });
  }
  if (a.name === "timer") timerDone();
  if (a.name === "badge") badge();
});
function remind(min) {
  chrome.windows.create({ url: `reminder.html?m=${min}`, type: "popup", width: 460, height: 420, focused: true });
}

/* ---------- the class timer (shared with the big screen) ---------- */
async function startTimer(seconds, message) {
  const endAt = Date.now() + seconds * 1000;
  const { settings = {}, timerHistory = [] } = await chrome.storage.local.get(["settings", "timerHistory"]); // remembered only on this device, and only if allowed
  if (settings.remember !== false) { const m = settings.rememberMsg !== false ? (message || "").slice(0, 60) : "", k = seconds + "|" + m, old = timerHistory.find(x => x.s + "|" + x.m === k);
    await chrome.storage.local.set({ timerHistory: [{ s: seconds, m, n: (old?.n || 0) + 1, t: Date.now() }, ...timerHistory.filter(x => x.s + "|" + x.m !== k)].slice(0, 8) }); }
  await chrome.storage.local.set({ timer: { endAt, duration: seconds, message: message || "", paused: null } });
  chrome.alarms.create("timer", { when: endAt });
  openBig();
}
async function startStep(plan, i) { // one step of a lesson plan
  const st = plan.steps[i], endAt = Date.now() + st.s * 1000;
  await chrome.storage.local.set({ timer: { endAt, duration: st.s, message: st.n, paused: null, plan: { name: plan.name, steps: plan.steps, i } } });
  chrome.alarms.create("timer", { when: endAt });
}
async function count() { const { stats = {} } = await chrome.storage.local.get("stats"), d = new Date().toISOString().slice(0, 10); stats[d] = (stats[d] || 0) + 1; // private break counts, on this device
  const keep = Object.fromEntries(Object.entries(stats).sort().slice(-60)); await chrome.storage.local.set({ stats: keep }); }
async function timerDone() {
  const { timer } = await chrome.storage.local.get("timer"); if (!timer || timer.paused != null) return;
  if (timer.endAt > Date.now() + 1000) return; // not due yet: a late or repeated call can never skip a step
  if (timer.plan && timer.plan.i < timer.plan.steps.length - 1) { // next step
    const next = timer.plan.steps[timer.plan.i + 1]; await startStep(timer.plan, timer.plan.i + 1);
    chrome.notifications.create("bbt-step", { type: "basic", iconUrl: "icons/icon128.png", title: `Next: ${next.n}`, message: `Step ${timer.plan.i + 2} of ${timer.plan.steps.length} in “${timer.plan.name}”.`, priority: 1 }); return; }
  count();
  const msg = timer.message || "Time for Brain Boost Time! Stretch, breathe and have a drink of water.";
  chrome.notifications.create("bbt-done", { type: "basic", iconUrl: "icons/icon128.png", title: "Brain Boost Time(r)", message: msg, priority: 2 });
  const { bigTab } = await chrome.storage.session.get("bigTab"), open = bigTab && await chrome.tabs.get(bigTab).catch(() => null);
  if (!open) openBig("?done=1"); // the big screen shows "Time's up" itself when it's open
}
chrome.notifications.onClicked.addListener(() => openBig());
// the big screen opens in its own window (movable, resizable and minimisable), or a tab if chosen in settings;
// an open one is brought forward rather than opening another
async function openBigIfClosed() { const { bigTab } = await chrome.storage.session.get("bigTab"); if (!(bigTab && await chrome.tabs.get(bigTab).catch(() => null))) openBig(); }
async function openBig(q = "") {
  const url = chrome.runtime.getURL(BIG), { bigTab } = await chrome.storage.session.get("bigTab"), t = bigTab ? await chrome.tabs.get(bigTab).catch(() => null) : null;
  if (t) { if (q) await chrome.tabs.update(t.id, { url: url + q }); await chrome.tabs.update(t.id, { active: true }); await chrome.windows.update(t.windowId, { focused: true, state: "normal" }).catch(() => {}); return; }
  const { settings } = await chrome.storage.local.get("settings");
  if ((settings?.openAs || "window") === "window") { const w = await chrome.windows.create({ url: url + q, type: "popup", width: 1240, height: 860, focused: true }); chrome.storage.session.set({ bigTab: w.tabs[0].id }); }
  else { const tab = await chrome.tabs.create({ url: url + q }); chrome.storage.session.set({ bigTab: tab.id }); }
}
chrome.runtime.onMessage.addListener((m, s, reply) => {
  if (m.type === "start") startTimer(m.seconds, m.message).then(() => reply(true));
  if (m.type === "pause") chrome.alarms.clear("timer").then(() => reply(true));
  if (m.type === "resume") { chrome.alarms.create("timer", { when: m.endAt }); reply(true); }
  if (m.type === "stop") chrome.alarms.clear("timer").then(() => reply(true));
  if (m.type === "remind") setEnabled(!!m.on).then(() => reply(true));
  if (m.type === "open") openBig(m.q || "").then(() => reply(true));
  if (m.type === "badge") badge().then(() => reply(true));
  if (m.type === "due") timerDone().then(() => reply(true)); // the big screen saw a step end: move on now, without waiting for Chrome's alarm
  if (m.type === "startPlan" && m.plan?.steps?.length) { startStep(m.plan, 0).then(() => { openBigIfClosed(); reply(true); }); }
  if (m.type === "planSkip") chrome.storage.local.get("timer").then(async ({ timer }) => { if (timer?.plan && timer.plan.i < timer.plan.steps.length - 1) await startStep(timer.plan, timer.plan.i + 1); else { await chrome.storage.local.set({ timer: null }); chrome.alarms.clear("timer"); } reply(true); });
  if (m.type === "snooze") chrome.storage.local.set({ minutes: Math.max(0, REMIND_AFTER - 10) }).then(() => reply(true)); // remind again after 10 active minutes // the big screen closed: the background takes over the badge
  return true;
});

/* ---------- the address bar: type bbt, a space, then a time ---------- */
// "5m", "90s", "1h", "1.5h", "10 min", "2:30" (minutes:seconds), each optionally followed by a message
function parse(text) {
  const t = text.trim();
  let m = t.match(/^(\d{1,3}):([0-5]\d)\b\s*(.*)$/); if (m) return { seconds: +m[1] * 60 + +m[2], message: m[3].trim() };
  m = t.match(/^(\d+(?:\.\d+)?)\s*(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?)\b\s*(.*)$/i);
  if (m) { const u = m[2][0].toLowerCase(), n = +m[1], s = Math.round(n * (u === "s" ? 1 : u === "m" ? 60 : 3600)); if (s > 0 && s <= 86400) return { seconds: s, message: m[3].trim() }; }
  return null;
}
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const human = s => s < 60 ? `${s} second${s === 1 ? "" : "s"}` : s < 3600 ? `${+(s / 60).toFixed(1)} minute${s === 60 ? "" : "s"}` : `${+(s / 3600).toFixed(2)} hour${s === 3600 ? "" : "s"}`;
chrome.omnibox.setDefaultSuggestion({ description: "Brain Boost Time(r): type a time such as <match>5m</match> or <match>30s</match>, then a message (optional)" });
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const p = parse(text), out = [];
  if (p) chrome.omnibox.setDefaultSuggestion({ description: `Set a <match>${esc(human(p.seconds))}</match> timer${p.message ? `: <dim>“${esc(p.message)}”</dim>` : " with the default message"}` });
  else chrome.omnibox.setDefaultSuggestion({ description: "Brain Boost Time(r): type a time such as <match>5m</match>, <match>90s</match> or <match>2:30</match>, then a message (optional)" });
  for (const [c, d] of [["pick", "Pick a name with the boba straw"], ["on", "Switch break reminders on"], ["off", "Switch break reminders off"], ["5m Brain Boost Time!", "A 5-minute break"], ["10m Group work", "A 10-minute group work timer"]])
    if (!text || c.startsWith(text.trim().toLowerCase())) out.push({ content: c, description: `<match>${esc(c)}</match> <dim>${esc(d)}</dim>` });
  suggest(out.slice(0, 5));
});
chrome.omnibox.onInputEntered.addListener(text => {
  const t = text.trim().toLowerCase(), p = parse(text);
  if (p) return startTimer(p.seconds, p.message);
  if (t === "pick" || t === "names") return openBig("?pick=1");
  if (t === "on" || t === "off") return setEnabled(t === "on");
  openBig(); // "bbt" on its own, or anything else, opens the big screen
});
self.__parse = parse; // for testing

// Alt+Shift+B always opens the big screen, whatever the icon does
chrome.commands.onCommand.addListener(c => { if (c === "open-big-screen") openBig(); });

/* ---------- the countdown on the toolbar icon ----------
   While the big screen is open it shows seconds (it updates the badge every second); otherwise the background shows
   minutes, every 30 seconds, which is as often as Chrome lets a sleeping extension wake. Paused timers show in grey. */
function badgeText(left, precise) { // at most four characters fit on the badge
  if (left <= 0) return ""; if (left >= 3600) return Math.floor(left / 3600) + "h";
  if (precise && left < 600) { const t = Math.ceil(left); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; }
  return left < 60 ? "<1m" : Math.ceil(left / 60) + "m";
}
async function badge() {
  const { timer } = await chrome.storage.local.get("timer");
  if (!timer) { chrome.action.setBadgeText({ text: "" }); chrome.alarms.clear("badge"); return; }
  const { bigTab } = await chrome.storage.session.get("bigTab"), open = bigTab && await chrome.tabs.get(bigTab).catch(() => null);
  if (open && timer.paused == null) return; // the big screen keeps the seconds up to date itself
  const left = (timer.paused != null ? timer.paused : timer.endAt - Date.now()) / 1000;
  chrome.action.setBadgeBackgroundColor({ color: timer.paused != null ? "#6b7280" : "#00838f" }); chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  chrome.action.setBadgeText({ text: badgeText(left, false) });
  if (timer.paused == null && left > 0) chrome.alarms.create("badge", { periodInMinutes: 0.5 }); else chrome.alarms.clear("badge");
}
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && "timer" in ch) badge(); });

// keep the right-click ticks in step when settings change on the big screen
chrome.storage.onChanged.addListener((ch, area) => { if (area !== "local" || !ch.settings?.newValue) return; const s = ch.settings.newValue, u = (id, checked) => chrome.contextMenus.update(id, { checked }, () => chrome.runtime.lastError);
  u("set:sound", s.sound !== false); u("set:remindSound", s.remindSound !== false); u("set:motion", s.motion !== false); u("set:remember", s.remember !== false); u("set:window", s.openAs !== "tab"); u("set:tab", s.openAs === "tab"); });
