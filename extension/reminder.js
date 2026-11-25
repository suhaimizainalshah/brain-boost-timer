const m = +new URLSearchParams(location.search).get("m") || 60;
document.getElementById("h").textContent = m >= 60 ? `You’ve been on this browser for ${m === 60 ? "an hour" : (m / 60) + " hours"}` : `You’ve been on this browser for ${m} minutes`;
document.getElementById("go").onclick = () => chrome.runtime.sendMessage({ type: "start", seconds: 300, message: "Break over: welcome back!" }, () => window.close());
document.getElementById("later").onclick = () => window.close();
document.getElementById("snooze").onclick = () => chrome.runtime.sendMessage({ type: "snooze" }, () => window.close());
addEventListener("keydown", e => { if (e.key === "Escape") window.close(); });

/* the reminder's chime: the same chime, bell or soft sound as the timer, with its own switch */
let settings = {};
function chime(kind) { try { const AC = new AudioContext(), t = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
  const notes = kind === "bell" ? [880, 1320, 1760, 2640] : kind === "soft" ? [440, 554.37] : [659.25, 783.99, 1046.5];
  notes.forEach((f, i) => { const o = AC.createOscillator(), gg = AC.createGain(); o.type = "sine"; o.frequency.value = f; o.connect(gg); gg.connect(g);
    const s = t + i * (kind === "bell" ? .02 : .16); gg.gain.setValueAtTime(.0001, s); gg.gain.exponentialRampToValueAtTime(kind === "soft" ? .12 : .2, s + .03); gg.gain.exponentialRampToValueAtTime(.0001, s + (kind === "bell" ? 2.2 : 1.1)); o.start(s); o.stop(s + 2.4); });
  g.gain.value = 1; if (AC.state === "suspended") AC.resume(); return AC; } catch { return null; } }
function showSwitch() { const on = settings.remindSound !== false, b = document.getElementById("snd"); b.textContent = on ? "🔊 Sound on" : "🔇 Sound off"; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Chime for break reminders: on. Turn off" : "Chime for break reminders: off. Turn on"); }
chrome.storage.local.get("settings").then(({ settings: s = {} }) => { settings = s; showSwitch(); if (settings.remindSound !== false) chime(settings.chime || "chime"); });
document.getElementById("snd").onclick = async () => { settings.remindSound = settings.remindSound === false; await chrome.storage.local.set({ settings }); showSwitch(); if (settings.remindSound) chime(settings.chime || "chime"); };
