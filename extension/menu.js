/* The toolbar menu: a running timer, the big screen, your timers and quick timers, the picker, and break reminders. */
const $ = s => document.querySelector(s), send = m => chrome.runtime.sendMessage(m);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(mm).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${mm}:${String(x).padStart(2, "0")}`; };
const short = s => s % 3600 === 0 ? `${s / 3600} h` : s % 60 === 0 ? `${s / 60} min` : s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* break reminders: the switch, the minutes to the next one, and the icon’s colour */
async function draw() { const { remind = true, minutes = 0 } = await chrome.storage.local.get(["remind", "minutes"]);
  $("#remind").checked = remind; $("#logo").src = remind ? "icons/icon48.png" : "icons/off48.png";
  const left = Math.max(1, 60 - minutes); $("#next").textContent = remind ? `About ${left} minute${left === 1 ? "" : "s"} of active browsing until the next break reminder.` : "Reminders are off."; }
$("#remind").onchange = async () => { await send({ type: "remind", on: $("#remind").checked }); draw(); };

/* opening the big screen, quick timers and the picker */
$("#big").onclick = async () => { await send({ type: "open" }); window.close(); };
$("#pick").onclick = async () => { await send({ type: "open", q: "?pick=1" }); window.close(); };
document.querySelectorAll("[data-s]").forEach(b => b.onclick = async () => { await send({ type: "start", seconds: +b.dataset.s, message: "" }); window.close(); });

/* your timers: the most used first */
async function mine() { const { timerHistory = [], settings = {} } = await chrome.storage.local.get(["timerHistory", "settings"]), box = $("#mine");
  if (settings.remember === false || !timerHistory.length) { box.innerHTML = ""; return; }
  const top = [...timerHistory].sort((a, b) => b.n - a.n || b.t - a.t).slice(0, 4);
  box.innerHTML = top.map((x, i) => `<button class="btn" data-i="${i}" title="${esc(x.m || "No message")}">${short(x.s)}${x.m ? " · " + esc(x.m) : ""}</button>`).join("");
  box.onclick = async e => { const b = e.target.closest("[data-i]"); if (!b) return; const x = top[+b.dataset.i]; await send({ type: "start", seconds: x.s, message: x.m }); window.close(); }; }

/* a running timer, live, with pause, resume and stop */
async function running() { const { timer } = await chrome.storage.local.get("timer"), box = $("#running");
  if (!timer || (timer.paused == null && timer.endAt <= Date.now())) { box.hidden = true; return; } box.hidden = false;
  $("#rtTime").textContent = fmt((timer.paused != null ? timer.paused : timer.endAt - Date.now()) / 1000);
  $("#rtMsg").textContent = timer.paused != null ? "Paused" : (timer.message || "Timer running");
  $("#rtPause").textContent = timer.paused != null ? "▶ Resume" : "❚❚ Pause";
  const p = timer.plan, nx = p && p.steps[p.i + 1]; $("#rtStep").hidden = $("#rtNext").hidden = !p;
  if (p) { $("#rtStep").textContent = `“${p.name}”: step ${p.i + 1} of ${p.steps.length}${nx ? ` · next: ${nx.n}` : " · last step"}`; $("#rtNext").textContent = nx ? "Next step ▸" : "Finish ▸"; } }
$("#rtNext").onclick = async () => { await send({ type: "planSkip" }); running(); };
$("#rtPause").onclick = async () => { const { timer } = await chrome.storage.local.get("timer"); if (!timer) return;
  if (timer.paused == null) { await chrome.storage.local.set({ timer: { ...timer, paused: timer.endAt - Date.now() } }); await send({ type: "pause" }); }
  else { const endAt = Date.now() + timer.paused; await chrome.storage.local.set({ timer: { ...timer, endAt, paused: null } }); await send({ type: "resume", endAt }); }
  running(); };
$("#rtStop").onclick = async () => { await chrome.storage.local.set({ timer: null }); await send({ type: "stop" }); running(); };

draw(); mine(); running(); setInterval(running, 250);
