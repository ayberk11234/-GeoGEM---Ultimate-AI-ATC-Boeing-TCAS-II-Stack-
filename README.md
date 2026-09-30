# ✈️ GeoGEM: Ultimate AI ATC & Boeing TCAS II Stack for GeoFS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-GeoFS-blue.svg)](https://www.geo-fs.com/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_Flash-emerald.svg)](https://aistudio.google.com/)
[![Airports](https://img.shields.io/badge/Towered_Airports-3%2C200%2B-orange.svg)]()

> **GeoGEM** transforms your GeoFS flight experience into a high-fidelity living simulation. Powered by Google Gemini Flash, procedural Web Audio VHF radio effects, a fully functional **Boeing TCAS II v7.1 Radar Canvas**, and an automated database of **3,200+ verified towered airports worldwide**, GeoGEM delivers real-world ICAO/DHMI air traffic control straight to your browser cockpit.

---

## 🌐 Language & Audio Notice
* **Interface (UI):** The avionics radio stack interface is primarily designed in **Turkish / Aviation Standard shorthand**.
* **Audio & Voiceovers:** Includes full **English (en-US)** and **Turkish (tr-TR)** voice synthesis dubbing. You can toggle language anytime using the **`TR / EN`** badge button on the top header.

---

## ✨ Key Features

* 🧠 **Gemini Flash AI ATC:** Real-time conversational ATC adhering to strict ICAO rules. The controller understands facility jurisdictions (DEL, GND, TWR, APP, ACC), denies pushback while airborne, issues altimeter/QNH settings, and enforces rules.
* 🛰️ **Boeing TCAS II v7.1 System:** Custom HTML5 Canvas radar display tracking nearby multiplayer traffic with authentic Boeing audio warnings (`TRAFFIC, TRAFFIC`, `CLIMB NOW!`, `DESCEND NOW!`).
* 🌍 **3,200+ Global Towered Airports:** Automatically streams real-world towered airports via an external JSON database. The auto-tune navigation engine automatically switches your COM radio to the nearest tower frequency wherever you fly on Earth.
* 📻 **Procedural VHF Audio Stack:** Built with Web Audio API. Generates authentic VHF carrier hum, bandpass squelch bursts, mic clicks, roger beeps, and continuous background radio static.
* 🎙️ **Live Background Radio Chatter:** Features simulated real-world airline traffic (THY, Pegasus, KLM, British Airways, Lufthansa, Delta, etc.) chatting on your frequency to keep the airspace alive.
* ⚠️ **Flight Envelope & Overspeed Monitor:** Automatically monitors jet & prop speed limits, enforcing the 250 KT speed limit below 10,000 ft MSL and alerting upon low-speed stall hazards.
* 🕹️ **Garmin / Bendix King Avionics Stack:** Draggable cockpit radio panel with COM1/COM2 flip-flop frequencies, Squawk (XPDR) transponder with IDENT, ATIS broadcasts, and quick CRAFT IFR clearance buttons.

---

## 📥 Installation Guide (Tampermonkey)

### 1. Install Tampermonkey Extension
Make sure you have a userscript manager installed in your browser:
* [Tampermonkey for Chrome / Edge](https://www.tampermonkey.net/)
* [Tampermonkey for Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)

### 2. Install the GeoGEM Script
1. Go to the [GeoGEM.user.js](./GeoGEM.user.js) file in this repository.
2. Click the **`Raw`** button at the top right of the code window.
3. Tampermonkey will automatically detect the userscript. Click **`Install`**.
4. Open or refresh [GeoFS](https://www.geo-fs.com/geofs.php). The avionics panel will appear on your screen!

---

## 🔑 How to Get a Free Google Gemini API Key

GeoGEM requires a free API Key from Google AI Studio to power the real-time AI controller responses:

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your standard Google Account.
3. Click the blue **`Get API key`** button in the left sidebar.
4. Click **`Create API key`** (Select "Create key in new project").
5. Copy the generated key (it starts with `AIzaSy...`).
6. *The API key is 100% free with generous daily limits provided by Google.*

---

## 🎮 How to Use in GeoFS

### 1. Activating Your API Key
* Open GeoFS in your browser.
* On the top-right corner of the **GeoGEM Radio Stack**, click the red **`KEY GİR!`** (Enter Key) button.
* Paste your Gemini API key and hit **OK**.
* The button will turn green (**`GEMINI: AKTİF`**). Your AI ATC is now live!

### 2. Tuning In & Facilities
* **Auto-Tune:** As you fly, GeoGEM tracks your aircraft and automatically switches your active frequency to the nearest towered airport in the world.
* **Facilities:** Click any facility button to tune:
  * **DEL:** IFR clearances and flight plans.
  * **GND:** Pushback, engine start, and taxi clearances.
  * **TWR:** Runway line-up, takeoff, and landing clearances.
  * **APP:** Descent vectors and ILS approach clearances.
  * **ACC:** En-route radar control.
  * **ATIS:** Generates automated airport weather and runway reports.

### 3. Talking to the ATC
* **Text Input:** Type your request into the bottom input field and press **Enter** (e.g., *"Tower, request takeoff runway 35R"* or *"Radio check"*).
* **Push-to-Talk (PTT):** Click the red microphone button (`mic`) to speak directly into your microphone (requires microphone permission).
* **Transmission Buffer (ESC to Cancel):** When you send a transmission, a 3-second yellow buffer countdown appears. Press **ESC** or click **`İPTAL ET (Cancel)`** if you made a typo or want to modify your message!

### 4. Boeing TCAS II Radar
* Click the **`BOEING TCAS II`** tab on the radio panel to open the real-time collision avoidance radar canvas.
* Adjust ranges between **6 NM, 12 NM, and 24 NM** using the range selector button.
* Click **`TEST HEDEFİ`** (Test Target) to inject a simulated conflicting Boeing 777 to test your resolution advisory alarms!

---

## 📋 Avionics Controls Reference

| Button / Control | Function |
| :--- | :--- |
| **COM1 / COM2 MIC** | Switches active transmit channel between COM1 and COM2 |
| **⇄ (Swap Arrow)** | Flips Active frequency with Standby frequency |
| **7700** | Declares Emergency (Mayday / Squawk 7700) |
| **TR / EN** | Toggles voice synthesizer and phraseology between Turkish and English |
| **CHATTER: ON/OFF** | Toggles background live radio chatter sound effects |
| **IDENT** | Activates Transponder radar squawk flash pulse |

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

Developed with passion for the global flight simulation community. Blue skies and safe landings! ✈️
