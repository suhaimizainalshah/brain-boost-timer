const m = +new URLSearchParams(location.search).get("m") || 60;
document.getElementById("h").textContent = m >= 60 ? `You’ve been on this browser for ${m === 60 ? "an hour" : (m / 60) + " hours"}` : `You’ve been on this browser for ${m} minutes`;
document.getElementById("go").onclick = () => chrome.runtime.sendMessage({ type: "start", seconds: 300, message: "Break over: welcome back!" }, () => window.close());
document.getElementById("later").onclick = () => window.close();
document.getElementById("snooze").onclick = () => chrome.runtime.sendMessage({ type: "snooze" }, () => window.close());
addEventListener("keydown", e => { if (e.key === "Escape") window.close(); });
