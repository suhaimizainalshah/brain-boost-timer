<img src="extension/icons/logo.svg" alt="Brain Boost Time(r) logo" width="96" height="96">

# Brain Boost Time(r): Break Reminder, Class Timer and Name Picker

A Chrome extension for classrooms and anyone at a screen. It reminds you to take a break after an hour of active browsing, runs a big melting bubble tea timer you can start from the address bar, and picks names with a boba straw.

Brain Boost Time (BBT) began as a tech tool to facilitate effective and efficient in-class breaks, which received a **Gold Innergy Award 2022** from the Ministry of Education, Singapore (Educational Technology Division). This version 2 is rebuilt for Chrome’s current extension format (Manifest V3).


## Recognition
**Gold, Innergy Award 2022**, Ministry of Education, Singapore, awarded to Suhaimi Bin Zainal Shah (Educational Technology Division) for *Brain Boost Time (BBT): tech tool to facilitate effective and efficient in-class breaks*.

<img src="media/innergy-award-2022-gold.png" alt="Innergy Award 2022 Gold certificate from the Ministry of Education, Singapore, awarded to Suhaimi Bin Zainal Shah for Brain Boost Time (BBT), a tech tool to facilitate effective and efficient in-class breaks" width="640">

*The signature on the certificate is blurred for this public copy.*

## Features
### Break reminders
- **After 60 minutes of active browsing,** a reminder window suggests a Brain Boost Time break. Only minutes when Chrome is in use count: time away or idle doesn’t.
- **On or off:** click the toolbar icon. When reminders are off, the icon turns grey.

### The class timer
- **From the address bar:** type `bbt`, a space, then a time and an optional message: `bbt 5m Stretch and drink water`, `bbt 90s`, `bbt 2:30 Group work`, `bbt 1h`. Suggestions appear as you type. Without a message, a default Brain Boost Time message appears.
- **On the big screen:** presets (1, 3, 5 and 10 minutes), a custom time and message, and Start, Pause and Reset.
- **The melting bubble tea:** when a timer starts, ice cubes appear in the drink and melt as time passes, and the tea slowly lightens as it’s diluted. At the end, “Time’s up!” shows your message, with a chime and a notification.
- **It keeps going** when the big screen is closed: the notification still arrives on time.

### The name picker
- **Paste names** one per line, or separated by commas, spaces or tabs: they’re detected automatically, or choose how they’re separated.
- **Pick a name** with the button, or by clicking the straw: a boba travels up the straw and pops out with the name.
- **Names stay hidden** from the class until one is picked. Choose whether a name can be picked again, and put all names back with one click.

### Stir and tilt
- **Stir** (the 🌀 button or the S key): the straw swirls, the ice and boba spin, and they settle in a new arrangement. On the website, a phone can be shaken to stir.
- **Tilt the straw** by dragging it left or right (or with the arrow keys when it’s focused). Like a real straw, it pivots in the lid’s hole: the bottom swings the other way, and it stops when it touches the side of the cup. A click on the straw still picks.
- **🎲 Surprise me** (or the R key): a new flavour and boba, with a stir, and a label showing what it landed on.

### Picking names or numbers
- **Names or Numbers:** paste a list of names, or choose a number range (for example 1 to 30) for register or ID numbers.
- **Put all back** sits beside Pick. When everyone has been picked, Pick itself offers to put them all back.
- **Hide the list** keeps names off a projected screen while still picking from them. Clear the list from “Picked so far”.

### Make it yours
- **Flavours:** classic milk tea, brown sugar, taro, matcha, Thai tea, strawberry, mango, lychee, passionfruit, green apple, grape, blue raspberry, sunset and ocean, each with its own colours.
- **Boba:** black, dark brown, grey, or popping boba to match the flavour. Names always use a contrasting text colour.
- **Sound and animation** can each be switched off, and animation follows your device’s “reduce motion” setting.

### Quick commands
| Type in the address bar | What happens |
| --- | --- |
| `bbt 5m Message` | Start a timer (also `90s`, `2:30`, `1.5h`) |
| `bbt pick` | Open the name picker |
| `bbt on` / `bbt off` | Switch break reminders on or off |
| `bbt` | Open the big screen |

Right-click the toolbar icon for the big screen, a 5-minute timer and the name picker.

## The toolbar icon
- **Click it** for the menu: a running timer (with pause, resume and stop), the big screen, your timers and quick 1, 3, 5 and 10 minute timers, the picker, and the break reminders switch, showing the minutes until the next reminder.
- **The countdown shows on the icon** while a timer runs: seconds while the big screen is open (for example 4:59), and minutes otherwise (5m, then <1m), since Chrome lets a closed extension update only every 30 seconds. Grey means paused.
- **In colour:** break reminders on. **Grey:** off.
- **Right-click it** to open the big screen, start a 5-minute timer, pick a name, tick break reminders on or off, or change **Settings**: sound, animation, remembering your timers, and whether the big screen opens in its own window or a tab. These stay in step with the big screen’s own settings.
- **Alt+Shift+B** opens the big screen (change it at `chrome://extensions/shortcuts`).

## Window or tab
The big screen opens in its own window, which can be moved, resized and minimised; choose “A tab” in settings to open it as a tab instead. Opening it again brings the same window forward.

## Suggestions
“Recommend a flavour or request a feature from the developer”, at the foot of the page, opens a short form. Send it through Gmail, Outlook or your email app, or copy it, so it works even without an email app set up.

## Accessibility
Keyboard operable (the straw is a button), screen reader announcements for picks and the timer, contrast checked in light and dark mode, and reduced motion respected.

## Privacy
Nothing leaves your browser. Settings and names are kept in Chrome’s local storage on your device. There are no accounts, analytics or network requests. See `PRIVACY.md`.

## Permissions
`alarms` (timers and the minute count), `notifications` (time’s up), `storage` (settings and names), `idle` (so idle time doesn’t count) and `contextMenus` (the right-click menu). No access to websites.


## Lesson plans
- **Build a plan:** open **Lesson plan**, name it, and add steps (such as Do now 5 min, Group work 10 min, Pack up 2 min). Reorder with the arrows; up to 20 steps of up to 3 hours each.
- **Run it:** each step moves on by itself, with a chime and what comes next. The step shows under the timer and in the toolbar menu, with **Next step** to move on early. In the extension, plans carry on with the big screen closed.
- **Save it** on this device, and **share it**: copy a link (it opens the plan on the website), download a plan file, or open one.

## The shared plan library
Teachers can share plans, and anyone can use the ones in the library, with no accounts on the website and no personal data.
1. **Sharing:** **Share with other teachers** opens a GitHub issue, already filled in with the plan (it needs a free GitHub account; without one, teachers can use the suggestion form).
2. **Checking:** the developer reviews each issue labelled `lesson-plan`. Create that label once, in the repository’s **Issues → Labels**.
3. **Adding:** copy the plan’s JSON from the issue into `plans/index.json` (with an optional `about` and `by`), and commit. It appears in **Browse shared plans** on the website straight away.

Five starter plans are included: a standard 60-minute lesson, group work rounds, exam practice, focus and break (25/5), and think, pair, share.

## Handy keys (big screen)
Space starts or pauses · F full screen with giant numbers, for projectors (or the ⛶ Full screen button) · S stir · R surprise me · P pick · Esc closes the panel you opened last.

## More touches
- **Panels close** with their ✕ or Esc, including the picker and the lesson plan.
- **Chime:** chime, bell or soft, in Flavour and settings.
- **Break reminders** offer “Remind me in 10 minutes”.
- **This week:** a private count of finished timers, kept on this device.
- **A short welcome** on first use: start a timer, pick someone, plan a lesson.

## Remembered timers
Your recent and most-used timers appear as buttons on the big screen and in the menu. They are kept only on this device: never sent anywhere or synced. Each can be forgotten (✕), all can be cleared, at most eight are kept, and you can choose not to remember timers, or to remember lengths but not messages, which is sensible on a shared computer.

## Files
| Where | What |
| --- | --- |
| `index.html` | **The website**: GitHub Pages opens it directly. It uses the extension’s own `bbt.js`, styles and icons, so there is one copy of the code |
| `extension/` | **The Chrome extension**: `manifest.json`, `background.js`, the big screen (`bbt.html`, `bbt.js`, `bbt.css`), the menu, the reminder window and `icons/` |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `web-icons/`, `site.webmanifest` | The website’s icons and app manifest, so it can be added to a phone’s home screen |
| `plans/index.json` | The shared plan library the website shows |
| `.github/ISSUE_TEMPLATE/lesson-plan.yml` | The form teachers use to share a plan |
| `.github/workflows/extension-zip.yml` | Builds the store-ready ZIP from `extension/` on every push |

## Publishing
- **The website:** switch on GitHub Pages (Settings → Pages → `main`, `/ (root)`).
- **The Chrome Web Store:** the store needs `manifest.json` at the top of the ZIP, so upload the ZIP that GitHub builds (Actions → the latest run → **bbt-extension**), or right-click the `extension` folder and choose **Compress**.
- **Trying it locally:** in `chrome://extensions`, switch on Developer mode, choose **Load unpacked**, and pick the `extension` folder.

## Licence
All rights reserved until a licence is added.
