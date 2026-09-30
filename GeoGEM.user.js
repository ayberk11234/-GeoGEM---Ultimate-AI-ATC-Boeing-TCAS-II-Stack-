// ==UserScript==
// @name         GeoGEM: Ultimate AI ATC & Boeing TCAS II Stack for GeoFS
// @namespace    https://avramovic.info/
// @version      10.0.0
// @description  Bilingual TR/EN AI ATC with Gemini 3.8/3.7 Flash, Global Multiplayer Radar Awareness, Flight Envelope & Overspeed Monitoring, Background Radio Chatter, and Boeing TCAS II v7.1.
// @author       Aviation Community, Modders, GeoFS Aviator & Nemanja Avramovic
// @license      MIT
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      generativelanguage.googleapis.com
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================================
       1. GLOBAL CONTEXT & UNSAFEWINDOW RESOLVER
       ========================================================================= */
    const gWindow = (typeof unsafeWindow !== 'undefined' && unsafeWindow !== null) ? unsafeWindow : window;

// GITHUB ÖZEL TCAS SESİ (Boeing Traffic Alert MP3)
    const TCAS_AUDIO_URL = "https://raw.githubusercontent.com/ayberk11234/geofs-sounds/main/tcas-traffic-warning.mp3";

    // GITHUB TELSİZ PARAZİT (CZZZ) SESİ
    const RADIO_STATIC_URL = "https://raw.githubusercontent.com/ayberk11234/geofs-sounds/main/radio-czzz/WALKIE%20TALKIE%20Sound%20FX%20Interference%20Glitch%20Noise%20(NO%20Copyright).mp3";
// GITHUB DÜNYA KULELERİ VERİTABANI
    const AIRPORTS_JSON_URL = "https://raw.githubusercontent.com/ayberk11234/airpots-names/refs/heads/main/tum_kuleler.json";
    /* =========================================================================
       2. DIŞ BAĞIMLILIKLAR (GOOGLE MATERIAL ICONS & FONTLAR)
       ========================================================================= */
    function injectExternalResources() {
        const docHead = document.head || document.getElementsByTagName('head')[0];
        if (docHead && !document.getElementById('geofs-atc-mat-icons')) {
            const matIcons = document.createElement('link');
            matIcons.id = 'geofs-atc-mat-icons';
            matIcons.rel = 'stylesheet';
            matIcons.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            docHead.appendChild(matIcons);
        }
        if (docHead && !document.getElementById('geofs-atc-roboto-mono')) {
            const monoFont = document.createElement('link');
            monoFont.id = 'geofs-atc-roboto-mono';
            monoFont.rel = 'stylesheet';
            monoFont.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Roboto+Mono:wght@400;600;700;800&display=swap';
            docHead.appendChild(monoFont);
        }
    }
    injectExternalResources();

    /* =========================================================================
       3. SEYRÜSEFER VE KÜRESEL COĞRAFYA MOTORU
       ========================================================================= */
    const Nav = {
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,

        toRad: function(deg) { return deg * this.DEG_TO_RAD; },
        toDeg: function(rad) { return rad * this.RAD_TO_DEG; },

        haversineNM: function (lat1, lon1, lat2, lon2) {
            const R = 3440.065; // Deniz mili
            const dLat = (lat2 - lat1) * this.DEG_TO_RAD;
            const dLon = (lon2 - lon1) * this.DEG_TO_RAD;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * this.DEG_TO_RAD) * Math.cos(lat2 * this.DEG_TO_RAD) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        },

        calculateBearing: function (lat1, lon1, lat2, lon2) {
            const dLon = (lon2 - lon1) * this.DEG_TO_RAD;
            const y = Math.sin(dLon) * Math.cos(lat2 * this.DEG_TO_RAD);
            const x = Math.cos(lat1 * this.DEG_TO_RAD) * Math.sin(lat2 * this.DEG_TO_RAD) -
                      Math.sin(lat1 * this.DEG_TO_RAD) * Math.cos(lat2 * this.DEG_TO_RAD) * Math.cos(dLon);
            return (Math.atan2(y, x) * this.RAD_TO_DEG + 360) % 360;
        },

        getClockPosition: function(ownHeading, bearing) {
            let diff = (bearing - ownHeading + 360) % 360;
            let clock = Math.round(diff / 30);
            if (clock === 0) clock = 12;
            return `saat ${clock} yönü`;
        },

        formatMorse: function (text) {
            const morseMap = {
                'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
                'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
                'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
                'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
                'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
                '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
                '9': '----.', '0': '-----'
            };
            return text.toUpperCase().split('').map(ch => morseMap[ch] || '').join(' ');
        }
    };

    /* =========================================================================
       4. GENİŞLETİLMİŞ DÜNYA HAVALİMANLARI VERİTABANI
       ========================================================================= */
 /* =========================================================================
       4. GENİŞLETİLMİŞ KÜRESEL DÜNYA HAVALİMANLARI VERİTABANI
       ========================================================================= */
    let AIRPORT_DATABASE = {
        // --- TÜRKİYE ---
        'LTFM': { name: 'İstanbul Havalimanı', city: 'İstanbul', elev: 325, runways: ['16R', '17L', '34L', '35R'], del: 121.725, gnd: 121.700, twr: 118.100, app: 125.400, acc: 120.050, atis: 124.550, ils: { '35R': 108.55 }, lat: 41.2753, lon: 28.7519 },
        'LTFJ': { name: 'Sabiha Gökçen', city: 'İstanbul', elev: 312, runways: ['06L', '06R', '24L', '24R'], del: 121.925, gnd: 121.850, twr: 118.800, app: 125.750, acc: 120.050, atis: 128.200, ils: { '06L': 110.10 }, lat: 40.8986, lon: 29.3092 },
        'LTAC': { name: 'Ankara Esenboğa', city: 'Ankara', elev: 3125, runways: ['03R', '03L', '21L', '21R'], del: 121.825, gnd: 121.900, twr: 118.100, app: 119.100, acc: 127.300, atis: 128.400, ils: { '03R': 109.30 }, lat: 40.1281, lon: 32.9951 },
        'LTBJ': { name: 'İzmir Adnan Menderes', city: 'İzmir', elev: 412, runways: ['16R', '16L', '34L', '34R'], del: 121.650, gnd: 121.900, twr: 118.700, app: 128.500, acc: 132.800, atis: 129.250, ils: { '34R': 108.70 }, lat: 38.2924, lon: 27.1570 },
        'LTAI': { name: 'Antalya Havalimanı', city: 'Antalya', elev: 177, runways: ['18C', '18L', '36C', '36R'], del: 121.675, gnd: 121.900, twr: 118.200, app: 124.350, acc: 133.400, atis: 128.050, ils: { '36C': 108.70 }, lat: 36.8987, lon: 30.8005 },

        // --- BİRLEŞİK KRALLIK & BATI AVRUPA ---
        'EGLL': { name: 'London Heathrow', city: 'Londra', elev: 83, runways: ['09L', '09R', '27L', '27R'], del: 121.980, gnd: 121.900, twr: 118.500, app: 119.725, acc: 132.125, atis: 128.075, ils: { '27R': 110.30 }, lat: 51.4700, lon: -0.4543 },
        'EGKK': { name: 'London Gatwick', city: 'Londra', elev: 202, runways: ['08R', '26L'], del: 121.950, gnd: 121.800, twr: 124.225, app: 126.825, acc: 132.125, atis: 136.525, ils: { '26L': 110.90 }, lat: 51.1481, lon: -0.1903 },
        'LFPG': { name: 'Paris Charles de Gaulle', city: 'Paris', elev: 392, runways: ['08L', '08R', '26L', '26R', '09L', '27R'], del: 121.775, gnd: 121.975, twr: 118.650, app: 121.150, acc: 125.700, atis: 127.125, ils: { '26L': 108.50 }, lat: 49.0097, lon: 2.5479 },
        'LFPO': { name: 'Paris Orly', city: 'Paris', elev: 291, runways: ['06', '24', '07', '25'], del: 121.700, gnd: 121.850, twr: 118.700, app: 123.875, acc: 125.700, atis: 126.500, ils: { '06': 111.75 }, lat: 48.7262, lon: 2.3652 },
        'EHAM': { name: 'Amsterdam Schiphol', city: 'Amsterdam', elev: -11, runways: ['18R', '36C', '09', '27', '18C', '36R'], del: 121.975, gnd: 121.700, twr: 119.225, app: 121.200, acc: 124.875, atis: 126.325, ils: { '18R': 110.10 }, lat: 52.3086, lon: 4.7639 },
        'EBBR': { name: 'Brussels Airport', city: 'Brüksel', elev: 184, runways: ['01', '19', '07R', '25L'], del: 121.950, gnd: 121.875, twr: 118.600, app: 118.250, acc: 125.000, atis: 132.475, ils: { '25L': 110.30 }, lat: 50.9014, lon: 4.4844 },

        // --- ORTA & GÜNEY AVRUPA ---
        'EDDF': { name: 'Frankfurt am Main', city: 'Frankfurt', elev: 364, runways: ['07C', '25C', '07R', '25L', '18'], del: 121.900, gnd: 121.700, twr: 119.900, app: 120.150, acc: 124.725, atis: 118.425, ils: { '25C': 111.15 }, lat: 50.0379, lon: 8.5622 },
        'EDDM': { name: 'Münih Havalimanı', city: 'Münih', elev: 1487, runways: ['08R', '26L', '08L', '26R'], del: 121.725, gnd: 121.950, twr: 120.500, app: 123.900, acc: 129.525, atis: 123.125, ils: { '26L': 108.30 }, lat: 48.3537, lon: 11.7860 },
        'LOWW': { name: 'Viyana Schwechat', city: 'Viyana', elev: 600, runways: ['11', '29', '16', '34'], del: 122.125, gnd: 121.775, twr: 119.400, app: 118.775, acc: 134.675, atis: 122.950, ils: { '16': 108.10 }, lat: 48.1103, lon: 16.5697 },
        'LSZH': { name: 'Zürih Kloten', city: 'Zürih', elev: 1416, runways: ['16', '34', '14', '32', '10', '28'], del: 121.850, gnd: 121.900, twr: 118.100, app: 120.750, acc: 128.050, atis: 128.525, ils: { '14': 108.30 }, lat: 47.4647, lon: 8.5492 },
        'LEMD': { name: 'Madrid-Barajas', city: 'Madrid', elev: 2000, runways: ['14L', '32R', '14R', '32L', '18R', '36L'], del: 121.700, gnd: 121.850, twr: 118.150, app: 124.025, acc: 127.500, atis: 130.850, ils: { '32L': 109.90 }, lat: 40.4983, lon: -3.5676 },
        'LEBL': { name: 'Barselona El Prat', city: 'Barselona', elev: 14, runways: ['07L', '25R', '07R', '25L'], del: 121.700, gnd: 121.650, twr: 118.100, app: 124.700, acc: 132.050, atis: 121.975, ils: { '25R': 110.30 }, lat: 41.2974, lon: 2.0785 },
        'LIRF': { name: 'Roma Fiumicino', city: 'Roma', elev: 15, runways: ['16L', '34R', '16R', '34L', '07', '25'], del: 121.800, gnd: 121.900, twr: 118.700, app: 125.500, acc: 124.800, atis: 126.125, ils: { '16L': 108.10 }, lat: 41.8003, lon: 12.2389 },

        // --- AMERİKA BİRLEŞİK DEVLETLERİ (DOĞU & BATI KIYISI) ---
        'KJFK': { name: 'New York JFK', city: 'New York', elev: 13, runways: ['04L', '22R', '13L', '31R'], del: 135.050, gnd: 121.900, twr: 119.100, app: 128.125, acc: 134.350, atis: 128.725, ils: { '04R': 109.50 }, lat: 40.6413, lon: -73.7781 },
        'KLGA': { name: 'New York LaGuardia', city: 'New York', elev: 21, runways: ['04', '22', '13', '31'], del: 127.050, gnd: 121.700, twr: 118.700, app: 126.400, acc: 134.350, atis: 125.950, ils: { '04': 110.50 }, lat: 40.7769, lon: -73.8740 },
        'KLAX': { name: 'Los Angeles International', city: 'Los Angeles', elev: 128, runways: ['06L', '24R', '06R', '24L', '07L', '25R'], del: 121.400, gnd: 121.650, twr: 120.950, app: 124.900, acc: 135.500, atis: 133.800, ils: { '24R': 108.50 }, lat: 33.9425, lon: -118.4081 },
        'KSFO': { name: 'San Francisco International', city: 'San Francisco', elev: 13, runways: ['01L', '19R', '01R', '19L', '10L', '28R'], del: 118.200, gnd: 121.800, twr: 120.500, app: 135.650, acc: 133.950, atis: 118.850, ils: { '28R': 111.70 }, lat: 37.6188, lon: -122.3750 },
        'KORD': { name: 'Chicago O\'Hare', city: 'Chicago', elev: 680, runways: ['09L', '27R', '10L', '28R', '04R', '22L'], del: 121.600, gnd: 121.900, twr: 120.750, app: 119.000, acc: 126.750, atis: 135.400, ils: { '10C': 108.95 }, lat: 41.9742, lon: -87.9073 },
        'KMIA': { name: 'Miami International', city: 'Miami', elev: 8, runways: ['08L', '26R', '08R', '26L', '09', '27'], del: 135.350, gnd: 121.800, twr: 118.300, app: 124.850, acc: 132.450, atis: 119.150, ils: { '08R': 110.90 }, lat: 25.7959, lon: -80.2870 },

        // --- ORTA DOĞU & ASYA ---
        'OMDB': { name: 'Dubai International', city: 'Dubai', elev: 62, runways: ['12L', '30R', '12R', '30L'], del: 120.350, gnd: 118.350, twr: 119.550, app: 124.450, acc: 126.500, atis: 131.700, ils: { '12L': 110.10 }, lat: 25.2532, lon: 55.3657 },
        'OTHH': { name: 'Doha Hamad', city: 'Doha', elev: 13, runways: ['16L', '34R', '16R', '34L'], del: 121.975, gnd: 121.850, twr: 118.050, app: 119.725, acc: 121.100, atis: 126.550, ils: { '34L': 109.90 }, lat: 25.2731, lon: 51.6080 },
        'RJTT': { name: 'Tokyo Haneda', city: 'Tokyo', elev: 35, runways: ['16R', '34L', '16L', '34R', '04', '22', '05', '23'], del: 121.825, gnd: 118.225, twr: 118.100, app: 119.100, acc: 123.700, atis: 128.800, ils: { '34R': 108.90 }, lat: 35.5494, lon: 139.7798 },
        'VHHH': { name: 'Hong Kong Chek Lap Kok', city: 'Hong Kong', elev: 28, runways: ['07L', '25R', '07R', '25L'], del: 121.600, gnd: 121.900, twr: 118.400, app: 119.100, acc: 126.300, atis: 128.200, ils: { '07L': 109.30 }, lat: 22.3080, lon: 113.9185 },
        'WSSS': { name: 'Singapur Changi', city: 'Singapur', elev: 22, runways: ['02L', '20R', '02C', '20C'], del: 121.650, gnd: 121.725, twr: 118.600, app: 120.300, acc: 134.400, atis: 128.600, ils: { '20R': 109.50 }, lat: 1.3644, lon: 103.9915 },
        'YSSY': { name: 'Sydney Kingsford Smith', city: 'Sidney', elev: 21, runways: ['16R', '34L', '16L', '34R', '07', '25'], del: 133.800, gnd: 121.700, twr: 120.500, app: 124.400, acc: 125.800, atis: 126.250, ils: { '16R': 110.90 }, lat: -33.9461, lon: 151.1772 }
    };

    const NAVAID_DATABASE = {
        'IST': { name: 'Istanbul VOR', freq: 112.50, lat: 41.2611, lon: 28.7302 },
        'BGD': { name: 'Beykoz VOR', freq: 117.70, lat: 41.1394, lon: 29.1353 },
        'LON': { name: 'London VOR', freq: 113.60, lat: 51.4880, lon: -0.4600 },
        'JFK': { name: 'Kennedy VOR', freq: 115.90, lat: 40.6327, lon: -73.7714 },
        'LAX': { name: 'Los Angeles VOR', freq: 113.60, lat: 33.9330, lon: -118.4320 }
    };

function getAirportData(icao) {
        const ap = AIRPORT_DATABASE[icao] || {};
        return {
            name: ap.name || icao,
            city: ap.city || 'Bilinmeyen Bölge',
            elev: ap.elev || 100,
            runways: (ap.runways && ap.runways.length > 0) ? ap.runways : ['09', '27'],
            del: ap.del || 121.600,
            gnd: ap.gnd || 121.900,
            twr: ap.twr || 118.100,
            app: ap.app || 124.000,
            acc: ap.acc || 125.000,
            atis: ap.atis || 127.500,
            ils: ap.ils || { '09': 109.50, '27': 110.10 },
            lat: ap.lat || 41.0,
            lon: ap.lon || 29.0
        };
    }

    const AtisEngine = {
        letters: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF'],
        generateAtis: function(icao) {
            const ap = getAirportData(icao);
            const letter = this.letters[Math.floor(Math.random() * this.letters.length)];
            const rwy = ap.runways[0] || '35R';
            const windDir = gWindow.geofs?.weather?.windDirection ? Math.round(gWindow.geofs.weather.windDirection) : 340;
            const windSpd = gWindow.geofs?.weather?.windSpeed ? Math.round(gWindow.geofs.weather.windSpeed) : 8;
            return `${ap.name} BİLGİ ${letter}. ZAMAN 1200Z. İNİŞ VE KALKIŞ PİSTİ ${rwy}. RÜZGAR ${windDir} DERECEDEN ${windSpd} KNOT. GÖRÜŞ 10 KİLOMETRE. BULUT AZ 3000 FT. SICAKLIK 18. QNH 1018. İLK TEMASTA ${letter} BİLGİSİNİ ALDIĞINIZI BİLDİRİN.`;
        }
    };

    /* =========================================================================
       AKILLI KÜRESEL OTO-TUNE MOTORU (DÜNYANIN HER YERİNDE EN YAKIN MEYDAN)
       ========================================================================= */
    const AirportAutoTune = {
        lastCheck: 0,
        checkIntervalMs: 5000,

        updateNearest: function(ownShip) {
            if (!ownShip || !ownShip.lat || !ownShip.lon) return;

            const now = Date.now();
            if (now - this.lastCheck < this.checkIntervalMs) return;
            this.lastCheck = now;

            let closestIcao = ATCState.tunedIcao;
            let minDistance = Infinity;

            for (const icao in AIRPORT_DATABASE) {
                const ap = AIRPORT_DATABASE[icao];
                const dist = Nav.haversineNM(ownShip.lat, ownShip.lon, ap.lat, ap.lon);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIcao = icao;
                }
            }

            // Dünyanın neresinde olursan ol, en yakın meydana geçiş yap
            if (closestIcao !== ATCState.tunedIcao) {
                const oldIcao = ATCState.tunedIcao;
                ATCState.tunedIcao = closestIcao;
                const newAp = getAirportData(closestIcao);

                ATCState.com1.active = newAp.twr;
                ATCState.com1.standby = newAp.gnd;
                ATCState.currentFacility = 'TWR';

                updateRadioDisplay();
                document.querySelectorAll('.tool-fac-btn').forEach(b => b.classList.remove('active-fac'));
                document.getElementById('btn-tune-twr')?.classList.add('active-fac');

                audioFX.playRogerBeep();
                logTranscript('SEKTÖR RADAR', `Meydan/Bölge değişti: ${oldIcao} geride kaldı. En yakın meydan: ${newAp.name} (${closestIcao}) [Mesafe: ${minDistance.toFixed(1)} NM]. Kule (${newAp.twr.toFixed(3)} MHz) bağlandı.`, 'alert');
            }
        }
    };


    /* =========================================================================
       5. AKUSTİK VHF, BOEING ALARM VE GITHUB MP3 MOTORU
       ========================================================================= */
class RadioAudioEngine {
        constructor() {
            this.ctx = null;
            this.masterGain = null;
            this.sfxGain = null;
            this.carrierGain = null;
            this.carrierNode = null;
            this.initialized = false;
            this.volumeMaster = 0.90;
            this.emergencyWarbleOsc = null;
            this.emergencyLfo = null;

            // GitHub Boeing TCAS MP3 Ses Nesnesi
            this.trafficAudio = new Audio(TCAS_AUDIO_URL);
            this.trafficAudio.volume = 1.0;

            // BURAYI EKLE: Arka Plan Telsiz Czzz Sesi (Döngü Açık)
            this.staticAudio = new Audio(RADIO_STATIC_URL);
            this.staticAudio.loop = true; // Konuşma bitene kadar başa sarıp durmadan çalar
            this.staticAudio.volume = 1.0; // Sesi bastırmasın diye hafif seviye
        }

        init() {
            if (!this.initialized) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext || gWindow.AudioContext || gWindow.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(this.volumeMaster, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);

                    this.sfxGain = this.ctx.createGain();
                    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
                    this.sfxGain.connect(this.masterGain);

                    this.carrierGain = this.ctx.createGain();
                    this.carrierGain.gain.setValueAtTime(0, this.ctx.currentTime);
                    this.carrierGain.connect(this.masterGain);

                    this.initCarrierHiss();
                    this.initialized = true;
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        initCarrierHiss() {
            if (!this.ctx) return;
            const bufferSize = this.ctx.sampleRate * 2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.10;
            }
            this.carrierNode = this.ctx.createBufferSource();
            this.carrierNode.buffer = buffer;
            this.carrierNode.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1800;
            filter.Q.value = 1.3;

            this.carrierNode.connect(filter);
            filter.connect(this.carrierGain);
            this.carrierNode.start(0);
        }

        startCarrierHum() {
            this.init();
            if (!this.ctx || !this.carrierGain) return;
            this.carrierGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.carrierGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.05);
        }

        stopCarrierHum() {
            if (!this.ctx || !this.carrierGain) return;
            this.carrierGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.carrierGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.08);
        }

        playMicClick(release = false) {
            this.init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(release ? 380 : 720, t);
            osc.frequency.exponentialRampToValueAtTime(release ? 140 : 280, t + 0.035);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.042);
        }

        playSquelchBurst(duration = 0.16) {
            this.init();
            if (!this.ctx) return;
            const dur = Math.max(0.06, duration);
            const bufferSize = Math.floor(this.ctx.sampleRate * dur);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.90;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1750;
            bandpass.Q.value = 1.35;

            const gain = this.ctx.createGain();
            const t = this.ctx.currentTime;

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(t);
        }

        playRogerBeep() {
            this.init();
            if (!this.ctx) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1320, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.08);
        }

        playTrafficMp3Alert() {
            try {
                this.init();
                this.trafficAudio.currentTime = 0;
                this.trafficAudio.play().catch(() => {
                    this.playBoeingBeep(880, 0.35);
                });
            } catch (e) {
                this.playBoeingBeep(880, 0.35);
            }
        }

        playBoeingBeep(frequency = 1200, duration = 0.25) {
            this.init();
            if (!this.ctx) return;
            try {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(frequency, t);
                gain.gain.setValueAtTime(0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + duration);
            } catch(e) {}
        }

startRadioStatic() {
            try {
                this.init();
                if (!this.staticAudio) return;
                this.staticAudio.currentTime = 0;
                this.staticAudio.volume = 1.0;
                const playPromise = this.staticAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn("[ATC Audio] Telsiz parazit sesi tarayıcı tarafından engellendi:", err);
                    });
                }
            } catch(e) {}
        }

        stopRadioStatic() {
            try {
                if (!this.staticAudio) return;
                this.staticAudio.pause();
                this.staticAudio.currentTime = 0;
            } catch(e) {}
        }

        stopRadioStatic() {
            try {
                this.staticAudio.pause();
                this.staticAudio.currentTime = 0;
            } catch(e) {}
        }


    }

    const audioFX = new RadioAudioEngine();

    /* =========================================================================
       6. GEMINI 3.8 & 3.7 FLASH YÜKSEK MUHAKEME VE RADAR ZEKA MOTORU
       ========================================================================= */
    const GeminiClient = {
        models: [
            'gemini-3.8-flash',
            'gemini-3.7-flash',
            'gemini-3.5-flash-lite'
        ],
        activeModel: 'gemini-3.8-flash',

        getApiKey: function () {
            return (localStorage.getItem('geofs_gemini_api_key') || '').trim();
        },

        setApiKey: function (key) {
            if (key && key.trim()) {
                localStorage.setItem('geofs_gemini_api_key', key.trim());
            } else {
                localStorage.removeItem('geofs_gemini_api_key');
            }
            this.updateKeyBadge();
        },

        promptForApiKey: function () {
            const current = this.getApiKey();
            const entered = prompt(
                "Google AI Studio Gemini 3.8/3.7 API Key'inizi girin:\n(Örn: AIzaSy...)\n\nSilmek için boş bırakıp Tamam'a basın.",
                current
            );
            if (entered !== null) {
                this.setApiKey(entered);
                if (entered.trim() !== '') {
                    logTranscript('SİSTEM', 'Gemini 3.8/3.7 Flash API Key kaydedildi!', 'atc');
                } else {
                    logTranscript('SİSTEM', 'Gemini API Key silindi.', 'alert');
                }
            }
        },

        updateKeyBadge: function () {
            const btn = document.getElementById('btn-gemini-key');
            if (!btn) return;
            const hasKey = !!this.getApiKey();
            btn.style.background = hasKey ? '#10b981' : '#dc2626';
            btn.style.borderColor = hasKey ? '#34d399' : '#f87171';
            btn.innerText = hasKey ? 'GEMINI 3.8: AKTİF' : 'KEY GİR!';
        },

        sendHttpRequest: function (url, payload, timeoutMs = 15000) {
            return new Promise((resolve, reject) => {
                const gmReq = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest :
                              ((typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest : null);

                let isDone = false;
                const timer = setTimeout(() => {
                    if (!isDone) {
                        isDone = true;
                        reject(new Error("Zaman aşımı (Timeout)"));
                    }
                }, timeoutMs);

                if (gmReq) {
                    gmReq({
                        method: 'POST',
                        url: url,
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify(payload),
                        timeout: timeoutMs,
                        onload: function (res) {
                            if (isDone) return;
                            isDone = true;
                            clearTimeout(timer);
                            if (res.status >= 200 && res.status < 300) {
                                try {
                                    resolve(JSON.parse(res.responseText));
                                } catch (e) {
                                    reject(new Error("JSON Parse Hatası"));
                                }
                            } else {
                                reject(new Error(`HTTP ${res.status}: ${res.responseText}`));
                            }
                        },
                        ontimeout: function () {
                            if (isDone) return;
                            isDone = true;
                            clearTimeout(timer);
                            reject(new Error("İstek zaman aşımına uğradı"));
                        },
                        onerror: function () {
                            if (isDone) return;
                            isDone = true;
                            clearTimeout(timer);
                            reject(new Error("Ağ/CORS Bağlantı Hatası"));
                        }
                    });
                } else {
                    const controller = new AbortController();
                    const abortTimer = setTimeout(() => controller.abort(), timeoutMs);

                    fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    })
                    .then(async (res) => {
                        clearTimeout(abortTimer);
                        if (!res.ok) {
                            const errTxt = await res.text();
                            throw new Error(`HTTP ${res.status}: ${errTxt}`);
                        }
                        return res.json();
                    })
                    .then(resolve)
                    .catch((err) => {
                        clearTimeout(abortTimer);
                        reject(err);
                    });
                }
            });
        },

        generateContent: async function (systemPrompt, conversationHistory) {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                this.promptForApiKey();
                const recheck = this.getApiKey();
                if (!recheck) {
                    throw new Error("Lütfen 'KEY GİR!' butonundan Gemini 3.8/3.7 API Key kaydedin!");
                }
            }

            const cleanHistory = conversationHistory.slice(-5);
            const contents = cleanHistory.map(item => ({
                role: item.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: item.content }]
            }));

            let lastError = null;

            for (const model of this.models) {
                try {
                    // DÜZELTME: Uzun, detaylı ve teknik cevaplar için 4096 token ayrıldı
                    const genConfig = {
                        temperature: 0.35,
                        topP: 0.90,
                        maxOutputTokens: 4096,
                        thinkingConfig: {
                            thinkingLevel: 'low'
                        }
                    };

                    const payload = {
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: contents,
                        generationConfig: genConfig
                    };

                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.getApiKey()}`;
                    const data = await this.sendHttpRequest(url, payload, 15000);

                    const parts = data.candidates?.[0]?.content?.parts || [];
                    const replyParts = parts.filter(p => !p.thought).map(p => p.text).filter(Boolean);
                    const reply = replyParts.join('\n').trim();

                    if (reply) {
                        this.activeModel = model;
                        const modelBadge = document.getElementById('active-model-indicator');
                        if (modelBadge) modelBadge.innerText = `${model.toUpperCase()} (ONLINE)`;
                        return reply;
                    }
                } catch (err) {
                    lastError = err;
                    console.warn(`[Gemini Flash] ${model} hata verdi, bir sonraki model deneniyor:`, err.message);
                }
            }

            throw lastError || new Error("Gemini modellerinden yanıt alınamadı.");
        }
    };

    /* =========================================================================
       7. KOKPİT DURUM MOTORU VE GÜVENLİK BEKÇİSİ
       ========================================================================= */
    const ATCState = {
        lang: 'TR',
        tunedIcao: 'LTFM',

        activeCom: 1,
        com1: { active: 118.100, standby: 121.700 },
        com2: { active: 125.400, standby: 121.900 },

        nav1: { active: 112.50, standby: 108.55, ident: 'IST' },
        nav2: { active: 117.70, standby: 110.10, ident: 'BGD' },

        adf: { active: 385.0, standby: 412.0 },

        transponder: {
            code: '1200',
            mode: 'ALT',
            identActive: false,
            identTimer: null
        },

        currentFacility: 'TWR',
        conversationHistory: {},

        emergencyMode: false,
        isSpeaking: false,
        isProcessing: false,
        processingWatchdogTimer: null,

        // Otomatik Arka Plan Trafik Telsizi (Chatter Engine)
        backgroundChatterActive: true,
        lastChatterTime: Date.now(),

        txBuffer: {
            pendingMessage: null,
            timerId: null,
            intervalId: null,
            remainingMs: 3000,
            bufferDurationMs: 3000
        },

        tcas: {
            rangeNM: 12,
            previousDistances: new Map(),
            currentAlertLevel: "NONE",
            lastAlertTime: 0,
            simTargetActive: false,
            simTargetBearing: 35,
            simTargetDist: 4.5,
            simTargetAltDiff: 700
        },

        startProcessingWatchdog: function () {
            clearTimeout(this.processingWatchdogTimer);
            this.processingWatchdogTimer = setTimeout(() => {
                if (this.isProcessing) {
                    console.warn("[ATC Watchdog] İşlem zaman aşımı, kilitlenme çözüldü.");
                    this.isProcessing = false;
                    const statusLabel = document.getElementById('atc-network-status');
                    if (statusLabel) {
                        statusLabel.innerText = "RX: BEKLEMEDE";
                        statusLabel.style.color = "#10b981";
                    }
                }
            }, 16000);
        },

        getActiveFrequency: function () {
            return this.activeCom === 1 ? this.com1.active : this.com2.active;
        },

        swapFrequency: function (comIndex = null) {
            const com = (comIndex || this.activeCom) === 1 ? this.com1 : this.com2;
            const temp = com.active;
            com.active = com.standby;
            com.standby = temp;
            updateRadioDisplay();
        },

        generateSquawk: function () {
            const code = '' + Math.floor(Math.random() * 6 + 1) +
                Math.floor(Math.random() * 8) +
                Math.floor(Math.random() * 8) +
                Math.floor(Math.random() * 8);
            this.transponder.code = code;
            return code;
        }
    };

    /* =========================================================================
       8. KÜRESEL MULTIPLAYER RADAR VE UÇUŞ ZARFI (ENVELOPE) DENETÇİSİ
       ========================================================================= */
    const M_TO_FEET = 3.28084;

    function getOwnShipComprehensiveState() {
        if (!gWindow.geofs || !gWindow.geofs.aircraft || !gWindow.geofs.aircraft.instance) return null;
        const inst = gWindow.geofs.aircraft.instance;
        const lla = inst.llaLocation || inst.lastLlaLocation;
        if (!lla) return null;

        const animValues = gWindow.geofs.animation ? gWindow.geofs.animation.values : {};
        const groundContact = animValues.groundContact === 1 || animValues.groundContact === true;

        let agl = animValues.altitudeAboveGround;
        if (agl === undefined || agl === null) {
            agl = (animValues.haglFeet !== undefined) ? animValues.haglFeet : (lla[2] * M_TO_FEET);
        }

        let altMsl = (animValues.altitude !== undefined) ? animValues.altitude :
                     ((animValues.altitudeMeters !== undefined) ? (animValues.altitudeMeters * M_TO_FEET) : (lla[2] * M_TO_FEET));

        const kias = Math.round(animValues.kias || 0);
        const hdg = Math.round(animValues.heading360 || 0);
        const vs = Math.round(animValues.verticalSpeed || 0);
        const acName = inst.aircraftRecord?.name || 'Boeing 737-800';

        // Uçuş Zarfı / Hata Tespiti (Overspeed, Stall, 10K Hız Sınırı, Terrain)
        const envelopeWarnings = [];
        const isJet = acName.toLowerCase().includes('737') || acName.toLowerCase().includes('a320') ||
                      acName.toLowerCase().includes('777') || acName.toLowerCase().includes('787') ||
                      acName.toLowerCase().includes('a350') || acName.toLowerCase().includes('md-11');

        if (isJet) {
            if (altMsl < 10000 && kias > 255 && !groundContact) {
                envelopeWarnings.push(`HIZ KURALI İHLALİ: 10.000 ft altında süratiniz ${kias} KT! (Maksimum 250 KT olmalıdır)`);
            }
            if (kias > 340) {
                envelopeWarnings.push(`KRİTİK OVERSPEED İKAZI: Uçağın Vmo/Mmo sınırını aştınız (${kias} KT)! Gövde yapısal limiti tehlikede!`);
            }
            if (kias < 135 && altMsl > 1000 && !groundContact) {
                envelopeWarnings.push(`DÜŞÜK SÜRAT / STALL TEHLİKESİ: Süratiniz ${kias} KT'a düştü!`);
            }
        } else {
            // Genel Havacılık / Pervaneli
            if (kias > 165 && acName.toLowerCase().includes('cessna')) {
                envelopeWarnings.push(`OVERSPEED: Pervaneli uçak hız limiti aşıldı (${kias} KT)!`);
            }
        }

        if (!groundContact && agl < 400 && kias > 200) {
            envelopeWarnings.push(`ALÇAK İRTİFA VE TEHLİKELİ YAKLAŞMA: Yere sadece ${Math.round(agl)} ft mesafedesiniz!`);
        }

        return {
            lat: lla[0],
            lon: lla[1],
            altFeet: Math.round(altMsl),
            aglFeet: Math.round(agl),
            groundContact: groundContact,
            kias: kias,
            heading: hdg,
            verticalSpeed: vs,
            aircraftType: acName,
            envelopeWarnings: envelopeWarnings
        };
    }

    // Serverdaki Bütün Uçakları Tutan ve Raporlayan Küresel Tarayıcı
    const GlobalRadarScanner = {
        scanAllTraffic: function(ownShip) {
            const allTargets = [];
            const mpSource = gWindow.multiplayer?.users || gWindow.geofs?.multiplayer?.users ||
                             gWindow.geofs?.multiplayer?.visibleUsers || gWindow.multiplayer?.visibleUsers || {};

            for (const id in mpSource) {
                const ac = mpSource[id];
                if (!ac || ac === gWindow.geofs?.aircraft?.instance) continue;

                let lat = null, lon = null, altM = null;
                if (ac._apiLla && Array.isArray(ac._apiLla)) {
                    lat = ac._apiLla[0]; lon = ac._apiLla[1]; altM = ac._apiLla[2];
                } else if (ac.referencePoint && ac.referencePoint.lla) {
                    lat = ac.referencePoint.lla[0]; lon = ac.referencePoint.lla[1]; altM = ac.referencePoint.lla[2];
                } else if (ac.llaLocation && Array.isArray(ac.llaLocation)) {
                    lat = ac.llaLocation[0]; lon = ac.llaLocation[1]; altM = ac.llaLocation[2];
                }

                if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) continue;

                const altFt = Math.round((altM || 0) * M_TO_FEET);
                const distNM = Nav.haversineNM(ownShip.lat, ownShip.lon, lat, lon);
                const bearing = Nav.calculateBearing(ownShip.lat, ownShip.lon, lat, lon);
                const clockPos = Nav.getClockPosition(ownShip.heading, bearing);
                const callsign = ac.callsign || (ac.user && ac.user.callsign) || ac.name || `TFC-${String(id).substring(0, 4)}`;
                const model = ac.aircraftRecord?.name || ac.model || 'Bilinmeyen Uçak';

                allTargets.push({
                    id: id,
                    callsign: callsign,
                    model: model,
                    lat: lat,
                    lon: lon,
                    altFt: altFt,
                    distNM: parseFloat(distNM.toFixed(1)),
                    bearing: Math.round(bearing),
                    clockPos: clockPos,
                    altDiffFt: altFt - ownShip.altFeet
                });
            }

            allTargets.sort((a, b) => a.distNM - b.distNM);
            return allTargets;
        },

        // New York, Londra veya belirli bir koordinattaki uçakları sayar
        countTrafficInRegion: function(centerLat, centerLon, radiusNM = 40) {
            const mpSource = gWindow.multiplayer?.users || gWindow.geofs?.multiplayer?.users ||
                             gWindow.geofs?.multiplayer?.visibleUsers || gWindow.multiplayer?.visibleUsers || {};
            let count = 0;
            const planes = [];

            for (const id in mpSource) {
                const ac = mpSource[id];
                if (!ac) continue;
                let lat = null, lon = null;
                if (ac._apiLla) { lat = ac._apiLla[0]; lon = ac._apiLla[1]; }
                else if (ac.referencePoint?.lla) { lat = ac.referencePoint.lla[0]; lon = ac.referencePoint.lla[1]; }
                else if (ac.llaLocation) { lat = ac.llaLocation[0]; lon = ac.llaLocation[1]; }

                if (lat !== null && lon !== null) {
                    const dist = Nav.haversineNM(centerLat, centerLon, lat, lon);
                    if (dist <= radiusNM) {
                        count++;
                        planes.push(ac.callsign || `TFC-${id}`);
                    }
                }
            }
            return { count, planes };
        }
    };

    /* =========================================================================
       9. ARKA PLAN TELSİZ TRAFİK SİMÜLATÖRÜ (BACKGROUND RADIO CHATTER)
       ========================================================================= */
    const BackgroundRadioChatter = {
        virtualAirlines: ['THY', 'PGT', 'BAW', 'DLH', 'AFR', 'KLM', 'UAE', 'AAL', 'DAL'],
        facilities: ['TWR', 'APP', 'GND', 'ACC'],

        generateRandomTransmission: function(tunedIcao) {
            const ap = getAirportData(tunedIcao);
            const rwy = ap.runways[Math.floor(Math.random() * ap.runways.length)] || '35R';
            const airline = this.virtualAirlines[Math.floor(Math.random() * this.virtualAirlines.length)];
            const flightNum = Math.floor(Math.random() * 890 + 100);
            const callsign = `${airline}-${flightNum}`;

            const chatterPoolTR = [
                `${callsign}, kule, rüzgar ${Math.floor(Math.random()*360)} dereceden ${Math.floor(Math.random()*15+3)} knot, pist ${rwy} iniş serbest.`,
                `${callsign}, yaklaşma, 5000 feete alçalın, QNH 1018, ILS pist ${rwy} için serbestsiniz.`,
                `${callsign}, holding point pist ${rwy} beklemede kalın, inen trafiği takip edin.`,
                `${callsign}, kalkış sonrası sağdan baş 080 tırmanın, FL140 serbest, iyi uçuşlar.`,
                `${callsign}, yer, taksi yolu Bravo üzerinden 14 numaralı körüğe taksi yapın.`,
                `${callsign}, radar temas, tırmanışa devam edin FL240, direkt BIG VOR.`
            ];

            const chatterPoolEN = [
                `${callsign}, tower, wind ${Math.floor(Math.random()*360)} at ${Math.floor(Math.random()*15+3)} knots, runway ${rwy} cleared to land.`,
                `${callsign}, descend and maintain 4000 feet, QNH 1019, cleared ILS runway ${rwy}.`,
                `${callsign}, line up and wait runway ${rwy}, traffic on short final.`,
                `${callsign}, radar contact, climb and maintain FL280, direct to waypoint.`,
                `${callsign}, taxi to gate 22 via taxiway Alpha and Mike, hold short runway ${rwy}.`
            ];

            const pool = ATCState.lang === 'TR' ? chatterPoolTR : chatterPoolEN;
            const message = pool[Math.floor(Math.random() * pool.length)];

            return { callsign, message };
        },

        tick: function() {
            if (!ATCState.backgroundChatterActive) return;
            if (ATCState.isSpeaking || ATCState.isProcessing) return;

            const now = Date.now();
            // Her 25 ila 40 saniyede bir telsizde arka plan konuşması aksın
            if (now - ATCState.lastChatterTime > (Math.random() * 15000 + 25000)) {
                ATCState.lastChatterTime = now;
                const chatter = this.generateRandomTransmission(ATCState.tunedIcao);
                logTranscript(`${ATCState.tunedIcao} ATC [DİĞER TRAFİK]`, chatter.message, 'atc');

                // Pilot meşgul değilse ve TCAS sakinse hafif telsiz konuşması geçsin
                if (!ATCState.isSpeaking && ATCState.tcas.currentAlertLevel === "NONE") {
                    atcSpeak(chatter.message, false);
                }
            }
        }
    };

    /* =========================================================================
       10. GELİŞMİŞ PİLOT VE GEMINI 3.8 FLASH İLETİŞİM MOTORU
       ========================================================================= */
    async function processPilotTransmission(pilotMsg) {
        if (!pilotMsg || pilotMsg.trim() === '') return;

        ATCState.isProcessing = true;
        ATCState.startProcessingWatchdog();

        const statusLabel = document.getElementById('atc-network-status');
        if (statusLabel) {
            statusLabel.innerText = "TX: İLETİLİYOR...";
            statusLabel.style.color = "#f59e0b";
        }

        audioFX.playMicClick(true);

        const ownShip = getOwnShipComprehensiveState();
        if (!ownShip) {
            ATCState.isProcessing = false;
            return;
        }

        const user = gWindow.geofs?.userRecord || {};
        const callsign = (user.id !== 0 && user.callsign) ? user.callsign : (ATCState.lang === 'TR' ? 'THY-191' : 'KLM-738');
        logTranscript(callsign, pilotMsg, 'pilot');

        const pLower = pilotMsg.toLowerCase();

        // 1. Acil Durum / Mayday
        if (pLower.includes('mayday') || pLower.includes('pan pan') || pLower.includes('acil durum')) {
            ATCState.emergencyMode = true;
            ATCState.transponder.code = '7700';
            updateRadioDisplay();
            const ap = getAirportData(ATCState.tunedIcao);
            const emerReply = `${callsign}, MAYDAY İKAZI ALINDI! Tüm sektördeki diğer trafikler beklemeye alındı. Pist ${ap.runways[0]} sizin için tahsis edildi. Rüzgar sakin, acil durum kurtarma ekipleri intikal halinde!`;
            logTranscript(`${ATCState.tunedIcao} KULE (ACİL)`, emerReply, 'alert');
            atcSpeak(emerReply, true);
            ATCState.isProcessing = false;
            if (statusLabel) { statusLabel.innerText = "RX: BEKLEMEDE"; statusLabel.style.color = "#10b981"; }
            return;
        }

        // 2. Küresel Trafik Verilerini Topla
        const allTraffic = GlobalRadarScanner.scanAllTraffic(ownShip);
        const nearTrafficTop5 = allTraffic.slice(0, 5);

        // New York & Özel Bölge Taramaları
        const nyData = GlobalRadarScanner.countTrafficInRegion(40.6413, -73.7781, 40);
        const istData = GlobalRadarScanner.countTrafficInRegion(41.2753, 28.7519, 35);

        // Trafik Tablosunu Hazırla (Gemini için)
        let trafficSummary = nearTrafficTop5.map(t =>
            `- Callsign: ${t.callsign} | Tip: ${t.model} | Mesafe: ${t.distNM} NM | İrtifa: ${t.altFt} ft (Fark: ${t.altDiffFt >= 0 ? '+' : ''}${t.altDiffFt} ft) | Yön: ${t.clockPos} (${t.bearing}°)`
        ).join('\n');

        if (!trafficSummary) trafficSummary = "Civarda radar kapsamasında başka uçak yok, hava sahası temiz.";

        const ap = getAirportData(ATCState.tunedIcao);
        const distNM = Nav.haversineNM(ownShip.lat, ownShip.lon, ap.lat, ap.lon).toFixed(1);

        // DETAYLI VE UZUN YANIT VEREN DHMİ/ICAO SYSTEM PROMPT'U
let systemPrompt = "";
        if (ATCState.lang === 'TR') {
            systemPrompt = `Sen ${ap.name} (${ATCState.tunedIcao}) meydanında görev yapan son derece profesyonel, dikkatli ve gerçekçi bir DHMİ Kıdemli Hava Trafik Kontrolörüsün.
Pozisyonun: ${ATCState.currentFacility} (Frekans: ${ATCState.getActiveFrequency().toFixed(3)} MHz).
Pilot Bilgileri: Callsign: "${callsign}", Uçak Tipi: ${ownShip.aircraftType}, Squawk Kodu: ${ATCState.transponder.code}.
Mevcut Telemetri: İrtifa: ${ownShip.altFeet} ft MSL (Yerden: ${ownShip.aglFeet} ft), Sürat: ${ownShip.kias} KT, Baş: ${ownShip.heading}°, Dikey Hız: ${ownShip.verticalSpeed} ft/dk, Durum: ${ownShip.groundContact ? 'PİSTTE/YERDE' : 'HAVADA'}.
Meydana Mesafe: ${distNM} NM, Aktif Pistler: ${ap.runways.join(', ')}.

MEYDAN FREKANS LİSTESİ:
DEL (Delivery): ${ap.del.toFixed(3)} MHz | GND (Yer): ${ap.gnd.toFixed(3)} MHz | TWR (Kule): ${ap.twr.toFixed(3)} MHz | APP (Yaklaşma): ${ap.app.toFixed(3)} MHz | ACC (Saha/Radar): ${ap.acc.toFixed(3)} MHz

KÜRESEL VE ÇEVRESEL MULTIPLAYER RADAR TABLOSU:
Yakındaki Trafikler:
${trafficSummary}

UÇUŞ GÜVENLİĞİ VE İHLAL RAPORU:
${ownShip.envelopeWarnings.length > 0 ? ownShip.envelopeWarnings.join('\n') : 'Uçuş zarfı ve hız parametreleri normal.'}

HAVACILIK POZİSYON VE YETKİ KURALLARI (ÇOK ÖNEMLİ):
1. FİZİKSEL DURUMLAR: Eğer uçak HAVADAYSA ve pushback, taksi veya motor çalıştırma isterse şaşkınlıkla kesin olarak reddet (Örn: "${callsign}, uçağınız şu anda ${ownShip.altFeet} feette havada! Havada pushback yapılması fiziksel olarak imkansızdır, irtifanızı koruyun ve niyetinizi bildirin!").
2. SEN ŞU ANDA SADECE "${ATCState.currentFacility}" POZİSYONUSUN! Kendi yetki alanın dışındaki talepleri ASLA ONAYLAMA:
   - DEL (Delivery): Sadece IFR uçuş planı ve rota müsaadesi verir. Taksi/pushback veremez!
   - GND (Yer Kontrol): Sadece pushback, motor çalıştırma ve pist başına taksi izni verir. ASLA kalkış (takeoff) veya iniş (landing) izni VEREMEZ! Pilot kalkış isterse: "${callsign}, kalkış izni Kule yetkisindedir. Kule ile ${ap.twr.toFixed(3)} frekansında temas kurun." de.
   - TWR (Kule): Sadece piste giriş (line up), kalkış izni, iniş izni ve pas geçme yönetir. ASLA pushback veya kapı taksisi İZNİ VERMEZ! Pilot pushback isterse: "${callsign}, pushback ve taksi için Yer Kontrol ${ap.gnd.toFixed(3)} ile temas kurun." diyerek yönlendir.
   - APP (Yaklaşma): Havada alçalma, ILS yaklaşma ve radar vektörü verir.
   - ACC (Radar): Seyir irtifası (FL) ve rota verir.

GENEL TALİMATLAR:
3. KESİNLİKLE KISA VE KESİK CEVAP VERME! Gerçek DHMİ/ICAO frazyolojisiyle doyurucu ve eksiksiz konuş. Rüzgarı, altimetreyi (QNH), tahsis edilen irtifa/pist bilgilerini eksiksiz söyle.
4. EĞER PİLOTUN UÇUŞUNDA BİR İHLAL VARSA (Overspeed, 10.000 ft altında 250 kt aşımı vb.): Selam verdikten hemen sonra sertçe uyar ve hızını düzeltmesini emret.
5. Pilot çevredeki veya havalimanlarındaki trafikleri sorarsa Radar Tablosundaki uçakları saat yönü ve mesafesiyle rapor et.
6. Hitap olarak "${callsign}" çağrı adını kullan.`;
        } else {
            systemPrompt = `You are a Senior ICAO Air Traffic Controller at ${ap.name} (${ATCState.tunedIcao}).
Active Facility/Position: ${ATCState.currentFacility} (Tuned Frequency: ${ATCState.getActiveFrequency().toFixed(3)} MHz).
Pilot Information: Callsign: "${callsign}", Aircraft: ${ownShip.aircraftType}, Squawk: ${ATCState.transponder.code}.
Current Telemetry: Altitude: ${ownShip.altFeet} ft MSL (${ownShip.aglFeet} ft AGL), Speed: ${ownShip.kias} KTS, Heading: ${ownShip.heading}°, V/S: ${ownShip.verticalSpeed} fpm, Flight State: ${ownShip.groundContact ? 'ON GROUND' : 'AIRBORNE'}.
Distance to Airport: ${distNM} NM, Active Runways: ${ap.runways.join(', ')}.

AIRPORT FREQUENCY DIRECTORY:
DEL (Delivery): ${ap.del.toFixed(3)} MHz | GND (Ground): ${ap.gnd.toFixed(3)} MHz | TWR (Tower): ${ap.twr.toFixed(3)} MHz | APP (Approach): ${ap.app.toFixed(3)} MHz | ACC (Center/Radar): ${ap.acc.toFixed(3)} MHz

GLOBAL & MULTIPLAYER RADAR TRAFFIC:
Traffic In Vicinity:
${trafficSummary}

FLIGHT SAFETY & VIOLATION REPORT:
${ownShip.envelopeWarnings.length > 0 ? ownShip.envelopeWarnings.join('\n') : 'Flight envelope normal.'}

STRICT ICAO FACILITY JURISDICTION & ROLE RULES:
1. PHYSICAL IMPOSSIBILITIES: If the aircraft is AIRBORNE and requests pushback, taxi, or engine start, express professional disbelief and firmly deny it (e.g., "${callsign}, you are currently airborne at ${ownShip.altFeet} feet! Pushback is physically impossible in flight, maintain altitude and state intentions!").
2. YOU ARE STRICTLY CONTROLLING AS "${ATCState.currentFacility}"! DO NOT grant clearances outside your jurisdiction:
   - DEL (Delivery): Issues ONLY IFR clearances and squawk codes. NEVER issues taxi or pushback.
   - GND (Ground): Handles pushback, start-up, and taxi to runway holding points. NEVER grants takeoff or landing clearances! If pilot requests takeoff: "${callsign}, takeoff clearance is with Tower. Contact Tower on ${ap.twr.toFixed(3)}."
   - TWR (Tower): Controls runway access, line-up, takeoff, landing clearances, and go-arounds. NEVER grants pushback or ramp taxi clearances! If requested, instruct: "${callsign}, contact Ground on ${ap.gnd.toFixed(3)} for pushback and taxi."
   - APP (Approach): Controls radar vectors, descent profiles, and ILS/RNAV approach clearances.
   - ACC (Center): Controls en-route cruising levels (FL) and direct waypoints.

MANDATORY INSTRUCTIONS:
3. DO NOT GIVE SHORT OR CUT ANSWERS! Speak in full, authentic, professional ICAO phraseology with complete details (wind, altimeter QNH, assigned heading/altitude).
4. FLIGHT VIOLATIONS: If there is an overspeed (e.g., speed > 250 KTS below 10,000 ft MSL or exceeding structural limits), immediately acknowledge the pilot but issue a firm, urgent command to correct speed.
5. If the pilot asks about traffic or specific airspaces, give accurate radar bearings, clock positions, altitudes, and distances from the radar table.
6. Always address the pilot by their callsign: "${callsign}".`;
        }

        if (!ATCState.conversationHistory[ATCState.tunedIcao]) {
            ATCState.conversationHistory[ATCState.tunedIcao] = [];
        }
        const hist = ATCState.conversationHistory[ATCState.tunedIcao];
        if (hist.length > 6) hist.splice(0, 2);

        hist.push({ role: 'user', content: `Pilot: "${pilotMsg}" [Sürat: ${ownShip.kias}kt, İrtifa: ${ownShip.altFeet}ft, Baş: ${ownShip.heading}°]` });

        try {
            let reply = await GeminiClient.generateContent(systemPrompt, hist);
            hist.push({ role: 'assistant', content: reply });
            logTranscript(`${ATCState.tunedIcao} ${ATCState.currentFacility}`, reply, 'atc');
            atcSpeak(reply, false);
        } catch (err) {
            console.error('Gemini Hatası:', err);
            logTranscript('ATC SİSTEMİ', `[Hata]: ${err.message}`, 'alert');
        } finally {
            ATCState.isProcessing = false;
            if (statusLabel) {
                statusLabel.innerText = "RX: BEKLEMEDE";
                statusLabel.style.color = "#10b981";
            }
        }
    }

    /* =========================================================================
       11. BOEING SPEC TCAS II v7.1 KUSURSUZ ENTEGRASYON VE ÇİZİM DÖNGÜSÜ
       ========================================================================= */
    function initBoeingTcasEngine() {
        const canvas = document.getElementById('tcas-radar-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        setInterval(() => {
            const ownShip = getOwnShipComprehensiveState();
            if (!ownShip) return;

            // Arka Plan Telsiz Konuşmalarını Çalıştır
            BackgroundRadioChatter.tick();
            // En Yakın Meydanı Otomatik Tara
            AirportAutoTune.updateNearest(ownShip);


            const modeBadge = document.getElementById("tcas-mode-badge");
            const callsignLabel = document.getElementById("tcas-target-callsign");
            const distLabel = document.getElementById("tcas-target-dist");
            const altLabel = document.getElementById("tcas-target-alt");
            const trendLabel = document.getElementById("tcas-target-trend");
            const actionBox = document.getElementById("tcas-action-box");

            // YERDEYKEN TCAS INHIBITED (GND)
            if (ownShip.groundContact || ownShip.aglFeet < 150) {
                ATCState.tcas.currentAlertLevel = "NONE";
                if (modeBadge) { modeBadge.innerText = "STBY"; modeBadge.style.background = "#52606d"; }
                if (callsignLabel) callsignLabel.innerText = "INHIBITED (GND)";
                if (distLabel) distLabel.innerText = "--.- NM";
                if (altLabel) altLabel.innerText = "---- FT";
                if (trendLabel) trendLabel.innerText = "YERYÜZÜ";
                if (actionBox) actionBox.style.display = "none";
                drawTcasCanvas(ctx, canvas, ownShip, []);
                return;
            }

            const allTraffic = GlobalRadarScanner.scanAllTraffic(ownShip);

            // Test Hedefi Varsa Listeye Enjekte Et
            if (ATCState.tcas.simTargetActive) {
                ATCState.tcas.simTargetDist -= 0.04;
                if (ATCState.tcas.simTargetDist < 0.4) ATCState.tcas.simTargetDist = 4.8;

                allTraffic.unshift({
                    id: 'SIM-99',
                    callsign: 'THY-TEST',
                    model: 'Boeing 777-300ER',
                    distNM: parseFloat(ATCState.tcas.simTargetDist.toFixed(1)),
                    altFt: ownShip.altFeet + ATCState.tcas.simTargetAltDiff,
                    altDiffFt: ATCState.tcas.simTargetAltDiff,
                    bearing: (ownShip.heading + ATCState.tcas.simTargetBearing) % 360,
                    clockPos: 'saat 1 yönü'
                });
            }

            const nearest = allTraffic[0];

            if (!nearest || nearest.distNM > ATCState.tcas.rangeNM) {
                ATCState.tcas.currentAlertLevel = "NONE";
                if (modeBadge) { modeBadge.innerText = "ARMED"; modeBadge.style.background = "#2b6cb0"; }
                if (callsignLabel) callsignLabel.innerText = "CLEAR";
                if (distLabel) distLabel.innerText = "--.- NM";
                if (altLabel) altLabel.innerText = "---- FT";
                if (trendLabel) trendLabel.innerText = "TEMİZ";
                if (actionBox) actionBox.style.display = "none";
                drawTcasCanvas(ctx, canvas, ownShip, allTraffic);
                return;
            }

            // HUD Bilgilerini Güncelle
            if (callsignLabel) callsignLabel.innerText = nearest.callsign;
            if (distLabel) distLabel.innerText = `${nearest.distNM} NM`;
            const sign = nearest.altDiffFt >= 0 ? "+" : "";
            if (altLabel) altLabel.innerText = `${sign}${nearest.altDiffFt} FT`;

            const absAltDiff = Math.abs(nearest.altDiffFt);

            // BOEING TCAS II v7.1 KUSURSUZ ALARM PROTOKOLÜ
            const isRA = (nearest.distNM < 2.5 && absAltDiff < 850) || (nearest.distNM < 1.2 && absAltDiff < 950);
            const isTA = (nearest.distNM < 6.5 && absAltDiff < 1500);

            const now = Date.now();

            if (isRA) {
                ATCState.tcas.currentAlertLevel = "RA";
                if (modeBadge) { modeBadge.innerText = "RA"; modeBadge.style.background = "#e53e3e"; }

                let escapeCmd = (ownShip.aglFeet < 1000 || nearest.altDiffFt <= 0) ? "CLIMB, CLIMB NOW!" : "DESCEND, DESCEND NOW!";

                if (actionBox) {
                    actionBox.style.display = "block";
                    actionBox.style.background = "rgba(229, 62, 62, 0.35)";
                    actionBox.style.border = "1px solid #e53e3e";
                    actionBox.style.color = "#fc8181";
                    actionBox.innerText = escapeCmd;
                }

                if (now - ATCState.tcas.lastAlertTime > 5000) {
                    audioFX.playBoeingBeep(1200, 0.3);
                    atcSpeak(escapeCmd, true);
                    ATCState.tcas.lastAlertTime = now;
                }
            } else if (isTA) {
                const wasNotTA = ATCState.tcas.currentAlertLevel !== "TA";
                ATCState.tcas.currentAlertLevel = "TA";
                if (modeBadge) { modeBadge.innerText = "TA"; modeBadge.style.background = "#d69e2e"; }

                if (actionBox) {
                    actionBox.style.display = "block";
                    actionBox.style.background = "rgba(214, 158, 46, 0.25)";
                    actionBox.style.border = "1px solid #d69e2e";
                    actionBox.style.color = "#f6e05e";
                    actionBox.innerText = "TRAFFIC, TRAFFIC";
                }

                if (wasNotTA || now - ATCState.tcas.lastAlertTime > 8000) {
                    audioFX.playTrafficMp3Alert();
                    ATCState.tcas.lastAlertTime = now;
                }
            } else {
                if (ATCState.tcas.currentAlertLevel === "RA" || ATCState.tcas.currentAlertLevel === "TA") {
                    ATCState.tcas.currentAlertLevel = "NONE";
                    if (actionBox) {
                        actionBox.style.display = "block";
                        actionBox.style.background = "rgba(56, 161, 105, 0.25)";
                        actionBox.style.border = "1px solid #38a169";
                        actionBox.style.color = "#68d391";
                        actionBox.innerText = "CLEAR OF CONFLICT";
                    }
                    atcSpeak("Clear of conflict.", true);
                    setTimeout(() => {
                        if (ATCState.tcas.currentAlertLevel === "NONE" && actionBox) actionBox.style.display = "none";
                    }, 4000);
                } else {
                    if (modeBadge) { modeBadge.innerText = "ARMED"; modeBadge.style.background = "#2b6cb0"; }
                    if (actionBox) actionBox.style.display = "none";
                }
            }

            drawTcasCanvas(ctx, canvas, ownShip, allTraffic);
        }, 1000);
    }

    function drawTcasCanvas(ctx, canvas, ownShip, trafficList) {
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const maxRange = ATCState.tcas.rangeNM;

        ctx.clearRect(0, 0, width, height);

        // Çemberler
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
            ctx.beginPath();
            ctx.arc(cx, cy, (width / 2 - 12) * ratio, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Kendi Uçağımız
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 6, cy + 6);
        ctx.lineTo(cx, cy + 3);
        ctx.lineTo(cx - 6, cy + 6);
        ctx.closePath();
        ctx.fill();

        trafficList.forEach((t) => {
            if (t.distNM > maxRange) return;
            const relBearing = (t.bearing - ownShip.heading + 360) % 360;
            const rad = Nav.toRad(relBearing);
            const scale = (t.distNM / maxRange) * (width / 2 - 12);
            const tx = cx + Math.sin(rad) * scale;
            const ty = cy - Math.cos(rad) * scale;

            const absAltDiff = Math.abs(t.altDiffFt);
            let color = "#00f0ff";
            let isRA = (t.distNM < 2.5 && absAltDiff < 850);
            let isTA = (t.distNM < 6.5 && absAltDiff < 1500);

            if (isRA) color = "#ef4444";
            else if (isTA) color = "#f59e0b";

            ctx.fillStyle = color;
            ctx.strokeStyle = color;

            if (isRA) {
                ctx.fillRect(tx - 5, ty - 5, 10, 10);
            } else if (isTA) {
                ctx.beginPath();
                ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(tx, ty - 5);
                ctx.lineTo(tx + 5, ty);
                ctx.lineTo(tx, ty + 5);
                ctx.lineTo(tx - 5, ty);
                ctx.closePath();
                ctx.stroke();
            }

            ctx.font = '9px "Share Tech Mono", monospace';
            const sign = t.altDiffFt >= 0 ? '+' : '';
            const altTag = `${sign}${Math.round(t.altDiffFt / 100)}`;
            ctx.fillText(altTag, tx + 7, ty + 3);
        });
    }

    /* =========================================================================
       12. ARAYÜZ VE KOKPİT PANEL KODU
       ========================================================================= */
    function injectAvionicsRadioUI() {
        if (document.getElementById('geofs-ai-radio-stack')) return;

        const css = document.createElement('style');
        css.textContent = `
            #geofs-ai-radio-stack {
                position: fixed;
                top: 40px;
                right: 20px;
                width: 450px;
                background: linear-gradient(160deg, #181d24 0%, #0e1217 60%, #080a0d 100%);
                border: 2px solid #323d4b;
                border-radius: 8px;
                box-shadow: 0 18px 45px rgba(0,0,0,0.92);
                z-index: 999999;
                font-family: 'Share Tech Mono', 'Roboto Mono', monospace;
                color: #e2e8f0;
                user-select: none;
            }
            .stack-header {
                background: #090c10;
                padding: 7px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #283341;
                border-radius: 6px 6px 0 0;
                cursor: move;
            }
            .stack-header-left {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 700;
                color: #38bdf8;
                font-size: 13px;
            }
            .header-badges { display: flex; align-items: center; gap: 6px; }
            .badge-btn {
                border-radius: 4px;
                font-size: 10px;
                font-weight: 800;
                padding: 3px 7px;
                cursor: pointer;
                border: 1px solid transparent;
            }
            .badge-key { background: #dc2626; color: #fff; border-color: #f87171; }
            .badge-lang { background: #0284c7; color: #fff; border-color: #38bdf8; }
            .badge-emer { background: #b91c1c; color: #fff; border-color: #ef4444; font-weight: 900; }
            .badge-chatter { background: #059669; color: #fff; border-color: #34d399; }

            .audio-panel-strip {
                background: #11161d;
                border-bottom: 1px solid #222b37;
                padding: 5px 8px;
                display: flex;
                justify-content: space-between;
                gap: 3px;
            }
            .audio-btn {
                flex: 1;
                background: #1a222c;
                border: 1px solid #334155;
                color: #94a3b8;
                font-size: 9px;
                font-weight: bold;
                padding: 3px 0;
                text-align: center;
                cursor: pointer;
                border-radius: 3px;
            }
            .audio-btn.active {
                background: #0284c7;
                color: #fff;
                border-color: #38bdf8;
                box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
            }

            .stack-tabs {
                display: flex;
                background: #0c1015;
                border-bottom: 1px solid #222c38;
            }
            .stack-tab {
                flex: 1;
                text-align: center;
                padding: 6px 0;
                font-size: 10px;
                font-weight: 700;
                color: #64748b;
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }
            .stack-tab.active {
                color: #38bdf8;
                border-bottom-color: #38bdf8;
                background: rgba(56, 189, 248, 0.05);
            }

            .stack-body { padding: 9px 11px; display: flex; flex-direction: column; gap: 8px; }
            .emergency-banner {
                background: #7f1d1d;
                border: 1px solid #ef4444;
                color: #fff;
                font-size: 11px;
                font-weight: bold;
                padding: 4px 8px;
                border-radius: 4px;
                text-align: center;
                display: none;
            }

            .radio-ch-box {
                background: #05070a;
                border: 1px solid #1c2633;
                border-radius: 5px;
                padding: 6px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .radio-ch-box.active-carrier {
                border-color: #0284c7;
                box-shadow: 0 0 8px rgba(2, 132, 199, 0.2);
            }
            .freq-box { text-align: center; min-width: 95px; }
            .freq-tag { font-size: 9px; color: #64748b; font-weight: bold; }
            .freq-digital { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
            .freq-act-color { color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.4); }
            .freq-stby-color { color: #f59e0b; }
            .btn-swap-freq {
                background: #1b2430;
                border: 1px solid #3b4859;
                color: #e2e8f0;
                cursor: pointer;
                border-radius: 4px;
                padding: 4px 9px;
            }

            .tool-fac-btn {
                background: #141b24;
                border: 1px solid #283545;
                color: #94a3b8;
                font-size: 10px;
                font-weight: bold;
                padding: 5px 0;
                border-radius: 3px;
                cursor: pointer;
                text-align: center;
            }
            .tool-fac-btn.active-fac {
                background: #d97706;
                color: #ffffff !important;
                border-color: #f59e0b !important;
                box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
            }

            .xpdr-strip {
                background: #06090d;
                border: 1px solid #1c2531;
                border-radius: 4px;
                padding: 5px 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11px;
            }
            .xpdr-digital { font-size: 16px; color: #00f0ff; font-weight: bold; letter-spacing: 2.5px; }

            .tcas-flight-hud {
                background: #04070a;
                border: 1px solid #1c2a38;
                border-radius: 5px;
                padding: 6px 10px;
                margin-top: 6px;
                font-size: 11px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .tcas-action-box {
                margin-top: 5px;
                padding: 5px;
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                border-radius: 4px;
                display: none;
                letter-spacing: 1px;
            }

            .stack-log-container {
                height: 155px;
                overflow-y: auto;
                background: #030507;
                border: 1px solid #18202a;
                border-radius: 4px;
                padding: 6px 8px;
                font-size: 11px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .log-msg-atc { color: #38bdf8; }
            .log-msg-pilot { color: #4ade80; }
            .log-msg-alert { color: #f87171; font-weight: bold; }
            .log-msg-abort { color: #fbbf24; font-style: italic; font-weight: bold; }

            .quick-phrases-bar {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
            }
            .btn-phrase {
                background: #141b24;
                border: 1px solid #283545;
                color: #94a3b8;
                font-size: 9px;
                font-weight: bold;
                padding: 4px 2px;
                border-radius: 3px;
                cursor: pointer;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .btn-phrase:hover { background: #1e2938; color: #38bdf8; border-color: #38bdf8; }

            #tx-countdown-panel {
                display: none;
                background: #1c1917;
                border: 1.5px solid #f59e0b;
                border-radius: 5px;
                padding: 6px 8px;
                flex-direction: column;
                gap: 5px;
                box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
            }
            .tx-buffer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                font-weight: bold;
            }
            .tx-buffer-msg {
                font-size: 12px;
                color: #fef08a;
                background: #0c0a09;
                padding: 4px 6px;
                border-radius: 3px;
                border: 1px solid #44403c;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .tx-progress-wrap {
                width: 100%;
                height: 5px;
                background: #292524;
                border-radius: 3px;
                overflow: hidden;
            }
            .tx-progress-bar {
                width: 100%;
                height: 100%;
                background: #f59e0b;
                transition: width 0.05s linear;
            }
            .tx-buffer-actions { display: flex; gap: 6px; }
            .btn-abort-tx {
                flex: 2;
                background: #dc2626;
                color: #fff;
                border: 1px solid #ef4444;
                font-size: 11px;
                font-weight: 900;
                padding: 4px 0;
                border-radius: 3px;
                cursor: pointer;
                text-align: center;
            }
            .btn-send-now {
                flex: 1;
                background: #16a34a;
                color: #fff;
                border: 1px solid #22c55e;
                font-size: 10px;
                font-weight: bold;
                padding: 4px 0;
                border-radius: 3px;
                cursor: pointer;
                text-align: center;
            }

            .stack-input-row { display: flex; gap: 5px; }
            .stack-input {
                flex: 1;
                background: #030406;
                border: 1px solid #2b3747;
                color: #fff;
                padding: 6px 9px;
                font-size: 11px;
                border-radius: 4px;
                outline: none;
            }
            .stack-input:focus { border-color: #38bdf8; }
            .btn-ptt {
                background: #dc2626;
                border: none;
                color: #fff;
                padding: 0 12px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .btn-ptt.active-tx { background: #16a34a; }
        `;
        document.head.appendChild(css);

        const container = document.createElement('div');
        container.id = 'geofs-ai-radio-stack';
        container.innerHTML = `
            <div class="stack-header" id="stack-drag-handle">
                <div class="stack-header-left">
                    <i class="material-icons" style="font-size:16px;color:#38bdf8;">settings_input_antenna</i>
                    <span id="stack-header-title">ATC RADYO (GEMINI 3.8 FLASH)</span>
                </div>
                <div class="header-badges">
                    <button class="badge-btn badge-key" id="btn-gemini-key">KEY GİR!</button>
                    <button class="badge-btn badge-chatter" id="btn-toggle-chatter" title="Arka Plan Telsiz Konuşmalarını Aç/Kapat">CHATTER: AÇIK</button>
                    <button class="badge-btn badge-emer" id="btn-emergency-7700">7700</button>
                    <button class="badge-btn badge-lang" id="btn-lang-toggle">TR</button>
                    <i class="material-icons" id="btn-stack-toggle" style="cursor:pointer;font-size:18px;">remove</i>
                </div>
            </div>

            <!-- GMA 340 Ses Seçici Panel -->
            <div class="audio-panel-strip">
                <div class="audio-btn active" id="audio-com1-mic">COM1 MIC</div>
                <div class="audio-btn" id="audio-com2-mic">COM2 MIC</div>
                <div class="audio-btn" id="audio-com1-mon">COM1 MON</div>
                <div class="audio-btn" id="audio-com2-mon">COM2 MON</div>
                <div class="audio-btn" id="audio-nav1">NAV1</div>
                <div class="audio-btn" id="audio-nav2">NAV2</div>
                <div class="audio-btn" id="audio-adf">ADF</div>
            </div>

            <!-- Tab Butonları -->
            <div class="stack-tabs">
                <div class="stack-tab active" data-tab="tab-com">COM / ATC</div>
                <div class="stack-tab" data-tab="tab-nav">NAV / DME</div>
                <div class="stack-tab" data-tab="tab-tcas">BOEING TCAS II</div>
                <div class="stack-tab" data-tab="tab-craft">CRAFT / ATIS</div>
            </div>

            <div class="stack-body" id="stack-body-panel">
                <div class="emergency-banner" id="emergency-active-banner">
                    ⚠ ACİL DURUM MODU AKTİF (MAYDAY / SQUAWK 7700) ⚠
                </div>

                <!-- TAB 1: COM & ATC KATI -->
                <div class="tab-pane active" id="pane-tab-com">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:11px;">
                        <span>MEYDAN: <strong id="disp-tuned-icao" style="color:#38bdf8;cursor:pointer;" title="Meydanı Değiştir">LTFM</strong></span>
                        <span>SEKTÖR: <strong id="disp-facility" style="color:#f59e0b;font-size:12px;">TWR</strong></span>
                    </div>

                    <div class="radio-ch-box active-carrier" id="box-com1" style="margin-bottom:6px;">
                        <div class="freq-box">
                            <div class="freq-tag">COM1 AKTİF</div>
                            <div class="freq-digital freq-act-color" id="disp-com1-act">118.100</div>
                        </div>
                        <button class="btn-swap-freq" id="btn-swap-com1">&#x21C4;</button>
                        <div class="freq-box">
                            <div class="freq-tag">COM1 BEKLEME</div>
                            <div class="freq-digital freq-stby-color" id="disp-com1-stby">121.700</div>
                        </div>
                    </div>

                    <div class="radio-ch-box" id="box-com2" style="margin-bottom:6px;">
                        <div class="freq-box">
                            <div class="freq-tag">COM2 AKTİF</div>
                            <div class="freq-digital freq-act-color" id="disp-com2-act">125.400</div>
                        </div>
                        <button class="btn-swap-freq" id="btn-swap-com2">&#x21C4;</button>
                        <div class="freq-box">
                            <div class="freq-tag">COM2 BEKLEME</div>
                            <div class="freq-digital freq-stby-color" id="disp-com2-stby">121.900</div>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:6px;">
                        <button class="tool-fac-btn" id="btn-tune-del">DEL</button>
                        <button class="tool-fac-btn" id="btn-tune-gnd">GND</button>
                        <button class="tool-fac-btn active-fac" id="btn-tune-twr">TWR</button>
                        <button class="tool-fac-btn" id="btn-tune-app">APP</button>
                        <button class="tool-fac-btn" id="btn-tune-acc">ACC</button>
                        <button class="tool-fac-btn" id="btn-tune-atis">ATIS</button>
                    </div>

                    <div class="xpdr-strip">
                        <span>XPDR: <strong class="xpdr-digital" id="disp-xpdr">1200</strong></span>
                        <span>MOD: <strong id="disp-xpdr-mode" style="color:#38bdf8;">ALT</strong></span>
                        <div style="display:flex;align-items:center;gap:4px;">
                            <span class="led-lamp" id="xpdr-ident-led"></span>
                            <button class="btn-phrase" id="btn-xpdr-ident" style="padding:2px 8px;">IDENT</button>
                            <button class="btn-phrase" id="btn-xpdr-vfr" style="padding:2px 8px;">VFR</button>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: NAV / DME / ADF KATI -->
                <div class="tab-pane" id="pane-tab-nav" style="display:none;">
                    <div class="radio-ch-box" style="margin-bottom:6px;">
                        <div class="freq-box">
                            <div class="freq-tag">NAV1 AKTİF</div>
                            <div class="freq-digital freq-act-color" id="disp-nav1-act">112.50</div>
                            <div style="font-size:10px;color:#38bdf8;" id="disp-nav1-id">IST (VOR)</div>
                        </div>
                        <button class="btn-swap-freq" id="btn-swap-nav1">&#x21C4;</button>
                        <div class="freq-box">
                            <div class="freq-tag">NAV1 BEKLEME</div>
                            <div class="freq-digital freq-stby-color" id="disp-nav1-stby">108.55</div>
                            <button class="btn-phrase" id="btn-nav1-ident" style="margin-top:2px;">MORS ID</button>
                        </div>
                    </div>

                    <div class="xpdr-strip" style="margin-bottom:6px;">
                        <span>DME1: <strong style="color:#10b981;" id="disp-dme1-dist">--.- NM</strong></span>
                        <span>RAD: <strong style="color:#f59e0b;" id="disp-nav1-rad">---°</strong></span>
                        <span>GS: <strong style="color:#38bdf8;" id="disp-dme1-spd">--- KT</strong></span>
                    </div>

                    <div class="radio-ch-box">
                        <div class="freq-box">
                            <div class="freq-tag">ADF AKTİF</div>
                            <div class="freq-digital freq-act-color" id="disp-adf-act">385.0</div>
                        </div>
                        <button class="btn-swap-freq" id="btn-swap-adf">&#x21C4;</button>
                        <div class="freq-box">
                            <div class="freq-tag">ADF BEKLEME</div>
                            <div class="freq-digital freq-stby-color" id="disp-adf-stby">412.0</div>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: BOEING SPEC TCAS II v7.1 RADAR EKRANI -->
                <div class="tab-pane" id="pane-tab-tcas" style="display:none; text-align:center;">
                    <canvas id="tcas-radar-canvas" width="240" height="240" style="background:#020406;border:1px solid #1a2736;border-radius:5px;display:block;margin:0 auto;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);"></canvas>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px;">
                        <span>MENZİL: <strong id="disp-tcas-range" style="color:#38bdf8;">12 NM</strong></span>
                        <button class="btn-phrase" id="btn-toggle-tcas-range">MENZİL SEÇ</button>
                        <button class="btn-phrase" id="btn-test-tcas-target" style="border-color:#f59e0b;color:#fef08a;">TEST HEDEFİ</button>
                    </div>

                    <div class="tcas-flight-hud">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="color:#94a3b8;font-weight:bold;">TCAS MODU:</span>
                            <span id="tcas-mode-badge" style="font-weight:bold;font-size:10px;padding:2px 6px;border-radius:3px;background:#486581;color:#fff;">STBY</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span>EN YAKIN: <strong id="tcas-target-callsign" style="color:#f0f4f8;">NONE</strong></span>
                            <span>MESAFE: <strong id="tcas-target-dist" style="color:#38bdf8;">--.- NM</strong></span>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span>İRTİFA FARKI: <strong id="tcas-target-alt" style="color:#f59e0b;">---- FT</strong></span>
                            <span id="tcas-target-trend" style="color:#10b981;">TEMİZ</span>
                        </div>
                    </div>

                    <div id="tcas-action-box" class="tcas-action-box">
                        NO CONFLICT
                    </div>
                </div>

                <!-- TAB 4: CRAFT IFR VE ATIS -->
                <div class="tab-pane" id="pane-tab-craft" style="display:none;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:11px;font-weight:bold;color:#f59e0b;">MEYDAN ATIS BÜLTENİ</span>
                        <button class="btn-phrase" id="btn-refresh-atis">YENİLE</button>
                    </div>
                    <div id="atis-text-box" style="background:#040608;border:1px solid #1c2633;border-radius:4px;padding:6px;font-size:10px;color:#fbbf24;height:70px;overflow-y:auto;margin-bottom:8px;">
                        ATIS verisi bekleniyor...
                    </div>
                    <div class="quick-phrases-bar">
                        <button class="btn-phrase" id="btn-craft-ifr">IFR İZNİ (CRAFT)</button>
                        <button class="btn-phrase" id="btn-craft-push">PUSHBACK & START</button>
                        <button class="btn-phrase" id="btn-craft-taxi">TAKSİ İZNİ</button>
                        <button class="btn-phrase" id="btn-craft-tkof">KALKIŞ İZNİ</button>
                    </div>
                </div>

                <!-- HIZLI TELSİZ İLETİŞİM TUŞLARI -->
                <div class="quick-phrases-bar">
                    <button class="btn-phrase" data-msg="Ses kontrol, kule beni duyuyor musunuz?">RADIO CHECK</button>
                    <button class="btn-phrase" data-msg="Pist başına taksi izni talep ediyoruz.">TAXI RQ</button>
                    <button class="btn-phrase" data-msg="Kalkışa hazırız, rüzgar bilgisi ve kalkış izni talep ediyoruz.">TAKEOFF RQ</button>
                    <button class="btn-phrase" data-msg="Piste son yaklaşmadayız, iniş izni talep ediyoruz.">LANDING RQ</button>
                    <button class="btn-phrase" data-msg="Pas geçiyoruz, missed approach uyguluyoruz!">GO-AROUND</button>
                    <button class="btn-phrase" data-msg="Radar, etrafımdaki ve yakınlardaki trafik durumunu rapor eder misiniz?">TRAFFIC INFO RQ</button>
                    <button class="btn-phrase" data-msg="Son talimatı tekrar eder misiniz?">SAY AGAIN</button>
                    <button class="btn-phrase" data-msg="Anlaşıldı, talimat uygulandı.">ROGER</button>
                </div>

                <!-- Telsiz Konuşma Geçmişi (Log) -->
                <div class="stack-log-container" id="atc-transcript-box">
                    <div class="log-msg-atc"><b>SİSTEM:</b> Telsiz ve Küresel Radar hazır. Gemini 3.8 Flash, Envelope Monitor ve Background Chatter aktif!</div>
                </div>

                <!-- 3 Saniyelik İptal & Düzeltme Barı -->
                <div id="tx-countdown-panel">
                    <div class="tx-buffer-header">
                        <span style="color:#f59e0b;">⏳ TELSİZ GÖNDERİLİYOR: <span id="tx-countdown-seconds">3.0</span>s</span>
                        <span style="font-size:9px;color:#94a3b8;">ESC İLE İPTAL ET</span>
                    </div>
                    <div class="tx-buffer-msg" id="tx-buffer-text">...</div>
                    <div class="tx-progress-wrap">
                        <div class="tx-progress-bar" id="tx-progress-fill"></div>
                    </div>
                    <div class="tx-buffer-actions">
                        <button class="btn-abort-tx" id="btn-tx-abort">✕ İPTAL ET / DÜZELT (ESC)</button>
                        <button class="btn-send-now" id="btn-tx-send-now">⚡ ŞİMDİ GÖNDER</button>
                    </div>
                </div>

                <!-- Pilot Giriş ve PTT Butonu -->
                <div class="stack-input-row">
                    <input type="text" class="stack-input" id="radio-pilot-input" placeholder="Telsiz mesajını yaz veya PTT bas..." />
                    <button class="btn-ptt" id="radio-ptt-btn">
                        <i class="material-icons" style="font-size:18px;">mic</i>
                    </button>
                </div>

                <!-- Alt Durum Çubuğu -->
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b;">
                    <span id="atc-network-status" style="color:#10b981;font-weight:bold;">RX: BEKLEMEDE</span>
                    <span id="active-model-indicator" style="color:#38bdf8;">GEMINI-3.8-FLASH (ONLINE)</span>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        makeDraggable(container, document.getElementById('stack-drag-handle'));
        setupAvionicsEvents();
        GeminiClient.updateKeyBadge();
        initBoeingTcasEngine();
    }

    function makeDraggable(element, handle) {
        let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
        handle.onmousedown = (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'i') return;
            e.preventDefault();
            mouseX = e.clientX;
            mouseY = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e2) => {
                e2.preventDefault();
                posX = mouseX - e2.clientX;
                posY = mouseY - e2.clientY;
                mouseX = e2.clientX;
                mouseY = e2.clientY;
                element.style.top = (element.offsetTop - posY) + 'px';
                element.style.left = (element.offsetLeft - posX) + 'px';
                element.style.right = 'auto';
            };
        };
    }

    function logTranscript(speaker, message, type = 'atc') {
        const box = document.getElementById('atc-transcript-box');
        if (!box) return;

        const row = document.createElement('div');
        row.className = `log-msg-${type}`;
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        row.innerHTML = `[${time}] <b>${speaker}:</b> ${message}`;
        box.appendChild(row);
        box.scrollTop = box.scrollHeight;
    }
function atcSpeak(text, isEmergencyPriority = false) {
        if (!('speechSynthesis' in window)) return;
        ATCState.isSpeaking = true;

        if (isEmergencyPriority) {
            window.speechSynthesis.cancel();
            audioFX.stopRadioStatic(); // Acil durumda paraziti sustur
        }

        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.05;
        u.pitch = 0.90;

        const voices = window.speechSynthesis.getVoices();
        if (ATCState.lang === 'TR' && !isEmergencyPriority) {
            u.lang = 'tr-TR';
            const v = voices.find(x => x.lang.startsWith('tr'));
            if (v) u.voice = v;
        } else {
            u.lang = 'en-US';
            const boeingVoice = voices.find(v => (v.name.includes("David") || v.name.includes("Male") || v.name.includes("Natural")) && v.lang.startsWith("en")) ||
                                voices.find(v => v.lang.startsWith("en")) || null;
            if (boeingVoice) u.voice = boeingVoice;
        }

        if (!isEmergencyPriority) {
            audioFX.startCarrierHum();
            audioFX.playSquelchBurst(0.18);
            audioFX.startRadioStatic(); // <--- 1. BURAYA EKLE: Konuşma başlar başlamaz czzz sesi başlar
        }

        // Uzun konuşmaların kesilmemesi için dinamik süre
        const ttsWatchdog = setTimeout(() => {
            audioFX.stopCarrierHum();
            audioFX.stopRadioStatic(); // <--- 2. BURAYA EKLE: Zaman aşımı olursa durdur
            ATCState.isSpeaking = false;
        }, Math.max(12000, (text || '').length * 180));

        u.onend = () => {
            clearTimeout(ttsWatchdog);
            audioFX.stopCarrierHum();
            audioFX.stopRadioStatic(); // <--- 3. BURAYA EKLE: Konuşma tam bittiği an sustur
            ATCState.isSpeaking = false;
            if (!isEmergencyPriority) {
                audioFX.playRogerBeep();
                setTimeout(() => audioFX.playSquelchBurst(0.09), 60);
            }
        };

        u.onerror = () => {
            clearTimeout(ttsWatchdog);
            audioFX.stopCarrierHum();
            audioFX.stopRadioStatic(); // <--- 4. BURAYA EKLE: Hata olursa sustur
            ATCState.isSpeaking = false;
        };

        window.speechSynthesis.speak(u);
    }

    function queueTransmissionWithCancelBuffer(rawMsg) {
        if (!rawMsg || rawMsg.trim() === '') return;

        if (ATCState.isProcessing) ATCState.isProcessing = false;
        abortPendingTransmission(false);

        const msg = rawMsg.trim();
        ATCState.txBuffer.pendingMessage = msg;
        ATCState.txBuffer.remainingMs = ATCState.txBuffer.bufferDurationMs;

        const panel = document.getElementById('tx-countdown-panel');
        const txtBox = document.getElementById('tx-buffer-text');
        const countSec = document.getElementById('tx-countdown-seconds');
        const progFill = document.getElementById('tx-progress-fill');

        if (panel && txtBox && countSec && progFill) {
            txtBox.innerText = `"${msg}"`;
            countSec.innerText = '3.0';
            progFill.style.width = '100%';
            panel.style.display = 'flex';
        }

        audioFX.playMicClick(false);

        const startTime = Date.now();
        const totalDuration = ATCState.txBuffer.bufferDurationMs;

        ATCState.txBuffer.intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const left = Math.max(0, totalDuration - elapsed);
            ATCState.txBuffer.remainingMs = left;

            if (countSec) countSec.innerText = (left / 1000).toFixed(1);
            if (progFill) progFill.style.width = `${(left / totalDuration) * 100}%`;

            if (left <= 0) {
                clearInterval(ATCState.txBuffer.intervalId);
                ATCState.txBuffer.intervalId = null;
            }
        }, 50);

        ATCState.txBuffer.timerId = setTimeout(() => {
            finalizeAndTransmit(msg);
        }, totalDuration);
    }

    function abortPendingTransmission(restoreToInput = true) {
        if (ATCState.txBuffer.timerId) { clearTimeout(ATCState.txBuffer.timerId); ATCState.txBuffer.timerId = null; }
        if (ATCState.txBuffer.intervalId) { clearInterval(ATCState.txBuffer.intervalId); ATCState.txBuffer.intervalId = null; }

        const abortedMsg = ATCState.txBuffer.pendingMessage;
        ATCState.txBuffer.pendingMessage = null;

        const panel = document.getElementById('tx-countdown-panel');
        if (panel) panel.style.display = 'none';

        if (abortedMsg && restoreToInput) {
            audioFX.playMicClick(false);
            const inputField = document.getElementById('radio-pilot-input');
            if (inputField) {
                inputField.value = abortedMsg;
                inputField.focus();
            }
            logTranscript('PİLOT', `[İPTAL EDİLDİ]: "${abortedMsg}"`, 'abort');
        }
    }

    function finalizeAndTransmit(msg) {
        if (ATCState.txBuffer.timerId) { clearTimeout(ATCState.txBuffer.timerId); ATCState.txBuffer.timerId = null; }
        if (ATCState.txBuffer.intervalId) { clearInterval(ATCState.txBuffer.intervalId); ATCState.txBuffer.intervalId = null; }

        const panel = document.getElementById('tx-countdown-panel');
        if (panel) panel.style.display = 'none';

        const finalMsg = msg || ATCState.txBuffer.pendingMessage;
        ATCState.txBuffer.pendingMessage = null;

        if (finalMsg) {
            processPilotTransmission(finalMsg);
        }
    }

    function setupAvionicsEvents() {
        document.getElementById('btn-gemini-key').addEventListener('click', () => GeminiClient.promptForApiKey());

        const btnToggle = document.getElementById('btn-stack-toggle');
        const bodyPanel = document.getElementById('stack-body-panel');
        btnToggle.addEventListener('click', () => {
            const isHidden = bodyPanel.style.display === 'none';
            bodyPanel.style.display = isHidden ? 'flex' : 'none';
            btnToggle.innerText = isHidden ? 'remove' : 'add';
        });

        // Arka Plan Trafik Telsizi Açma/Kapama
        const btnChatter = document.getElementById('btn-toggle-chatter');
        btnChatter.addEventListener('click', () => {
            ATCState.backgroundChatterActive = !ATCState.backgroundChatterActive;
            btnChatter.innerText = ATCState.backgroundChatterActive ? 'CHATTER: AÇIK' : 'CHATTER: KAPALI';
            btnChatter.style.background = ATCState.backgroundChatterActive ? '#059669' : '#475569';
            audioFX.playRogerBeep();
        });

        const tabs = document.querySelectorAll('.stack-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const targetPane = tab.getAttribute('data-tab').replace('tab-', 'pane-tab-');
                document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
                const target = document.getElementById(targetPane);
                if (target) target.style.display = 'block';
            });
        });

        document.getElementById('btn-tx-abort').addEventListener('click', () => abortPendingTransmission(true));
        document.getElementById('btn-tx-send-now').addEventListener('click', () => finalizeAndTransmit());

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && ATCState.txBuffer.pendingMessage) {
                e.preventDefault();
                abortPendingTransmission(true);
            }
        });

        document.getElementById('audio-com1-mic').addEventListener('click', () => {
            ATCState.activeCom = 1;
            document.getElementById('audio-com1-mic').classList.add('active');
            document.getElementById('audio-com2-mic').classList.remove('active');
            document.getElementById('box-com1').classList.add('active-carrier');
            document.getElementById('box-com2').classList.remove('active-carrier');
            audioFX.playMicClick(false);
        });

        document.getElementById('audio-com2-mic').addEventListener('click', () => {
            ATCState.activeCom = 2;
            document.getElementById('audio-com2-mic').classList.add('active');
            document.getElementById('audio-com1-mic').classList.remove('active');
            document.getElementById('box-com2').classList.add('active-carrier');
            document.getElementById('box-com1').classList.remove('active-carrier');
            audioFX.playMicClick(false);
        });

        document.getElementById('btn-swap-com1').addEventListener('click', () => {
            audioFX.playMicClick(false);
            ATCState.swapFrequency(1);
        });
        document.getElementById('btn-swap-com2').addEventListener('click', () => {
            audioFX.playMicClick(false);
            ATCState.swapFrequency(2);
        });

        document.getElementById('btn-toggle-tcas-range').addEventListener('click', () => {
            audioFX.playRogerBeep();
            const ranges = [6, 12, 24];
            const nextIdx = (ranges.indexOf(ATCState.tcas.rangeNM) + 1) % ranges.length;
            ATCState.tcas.rangeNM = ranges[nextIdx];
            document.getElementById('disp-tcas-range').innerText = `${ATCState.tcas.rangeNM} NM`;
        });

        document.getElementById('btn-test-tcas-target').addEventListener('click', () => {
            audioFX.playRogerBeep();
            ATCState.tcas.simTargetActive = !ATCState.tcas.simTargetActive;
            ATCState.tcas.simTargetDist = 4.8;
            const btn = document.getElementById('btn-test-tcas-target');
            if (btn) {
                btn.style.background = ATCState.tcas.simTargetActive ? '#f59e0b' : '#141b24';
                btn.style.color = ATCState.tcas.simTargetActive ? '#000' : '#fef08a';
            }
        });

        document.getElementById('btn-emergency-7700').addEventListener('click', () => {
            if (ATCState.emergencyMode) {
                ATCState.emergencyMode = false;
                ATCState.generateSquawk();
                updateRadioDisplay();
                document.getElementById('emergency-active-banner').style.display = 'none';
                logTranscript('SİSTEM', 'Acil durum kapatıldı.', 'atc');
            } else {
                processPilotTransmission('MAYDAY MAYDAY MAYDAY, acil durum deklare ediyoruz!');
            }
        });

        const btnLang = document.getElementById('btn-lang-toggle');
        btnLang.addEventListener('click', () => {
            audioFX.playRogerBeep();
            ATCState.lang = ATCState.lang === 'TR' ? 'EN' : 'TR';
            btnLang.innerText = ATCState.lang;
            document.getElementById('stack-header-title').innerText = ATCState.lang === 'TR' ? 'ATC RADYO (GEMINI 3.8 FLASH)' : 'ATC RADIO (GEMINI 3.8 FLASH)';
        });

        const facMap = {
            'btn-tune-del': 'del', 'btn-tune-gnd': 'gnd', 'btn-tune-twr': 'twr',
            'btn-tune-app': 'app', 'btn-tune-acc': 'acc', 'btn-tune-atis': 'atis'
        };
        Object.entries(facMap).forEach(([btnId, facKey]) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-fac-btn').forEach(b => b.classList.remove('active-fac'));
                btn.classList.add('active-fac');

                const ap = getAirportData(ATCState.tunedIcao);
                const targetFreq = ap[facKey] || 118.100;

                if (ATCState.activeCom === 1) {
                    ATCState.com1.active = targetFreq;
                } else {
                    ATCState.com2.active = targetFreq;
                }
                ATCState.currentFacility = facKey.toUpperCase();
                updateRadioDisplay();
                audioFX.playSquelchBurst(0.12);

                if (facKey === 'atis') {
                    const atisTxt = AtisEngine.generateAtis(ATCState.tunedIcao);
                    logTranscript(`${ATCState.tunedIcao} ATIS`, atisTxt, 'atis');
                    atcSpeak(atisTxt);
                }
            });
        });

document.getElementById('disp-tuned-icao').addEventListener('click', () => {
            const list = Object.keys(AIRPORT_DATABASE);
            const nextIdx = (list.indexOf(ATCState.tunedIcao) + 1) % list.length;
            ATCState.tunedIcao = list[nextIdx];
            const ap = getAirportData(ATCState.tunedIcao);
            ATCState.com1.active = ap.twr;
            ATCState.com1.standby = ap.gnd;
            ATCState.currentFacility = 'TWR';
            document.querySelectorAll('.tool-fac-btn').forEach(b => b.classList.remove('active-fac'));
            document.getElementById('btn-tune-twr')?.classList.add('active-fac');
            updateRadioDisplay();
            audioFX.playRogerBeep();
            logTranscript('SİSTEM', `Meydan ayarlandı: ${ap.name} (${ATCState.tunedIcao})`, 'atc');
        });

        /* ================= BURAYA YAPIŞTIRDIN ================= */
        // CRAFT Buton Dinleyicileri
        const craftMap = {
            'btn-craft-ifr': 'IFR uçuş planı ve kalkış müsaadesi talep ediyoruz.',
            'btn-craft-push': 'Pushback ve motor çalıştırma izni talep ediyoruz.',
            'btn-craft-taxi': 'Pist başına taksi izni talep ediyoruz.',
            'btn-craft-tkof': 'Kalkışa hazırız, kalkış izni talep ediyoruz.',
            'btn-refresh-atis': null
        };

        Object.entries(craftMap).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', () => {
                if (id === 'btn-refresh-atis') {
                    const txt = AtisEngine.generateAtis(ATCState.tunedIcao);
                    const box = document.getElementById('atis-text-box');
                    if (box) box.innerText = txt;
                    logTranscript(`${ATCState.tunedIcao} ATIS`, txt, 'atis');
                    atcSpeak(txt);
                } else if (text) {
                    queueTransmissionWithCancelBuffer(text);
                }
            });
        });
        /* ===================================================== */


        document.querySelectorAll('.quick-phrases-bar .btn-phrase[data-msg]').forEach(btn => {
            btn.addEventListener('click', () => {
                queueTransmissionWithCancelBuffer(btn.getAttribute('data-msg'));
            });
        });

        const inputField = document.getElementById('radio-pilot-input');
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && inputField.value.trim() !== '') {
                const text = inputField.value;
                inputField.value = '';
                queueTransmissionWithCancelBuffer(text);
            }
        });

        // PTT Mikrofon Düğmesi
        const pttBtn = document.getElementById('radio-ptt-btn');
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRec) {
            let recognition = null;
            let isRec = false;

            pttBtn.addEventListener('click', () => {
                if (isRec) {
                    if (recognition) recognition.stop();
                    isRec = false;
                    pttBtn.classList.remove('active-tx');
                    audioFX.playMicClick(true);
                    return;
                }

                recognition = new SpeechRec();
                recognition.lang = ATCState.lang === 'TR' ? 'tr-TR' : 'en-US';

                recognition.onstart = () => {
                    isRec = true;
                    pttBtn.classList.add('active-tx');
                    audioFX.playMicClick(false);
                };

                recognition.onresult = (evt) => {
                    const text = evt.results[0][0].transcript;
                    queueTransmissionWithCancelBuffer(text);
                };

                recognition.onend = () => { isRec = false; pttBtn.classList.remove('active-tx'); };
                recognition.onerror = () => { isRec = false; pttBtn.classList.remove('active-tx'); };

                try { recognition.start(); } catch(e){}
            });
        }
    }

    function updateRadioDisplay() {
        const dCom1Act = document.getElementById('disp-com1-act');
        const dCom1Stby = document.getElementById('disp-com1-stby');
        const dCom2Act = document.getElementById('disp-com2-act');
        const dCom2Stby = document.getElementById('disp-com2-stby');
        const dXpdr = document.getElementById('disp-xpdr');
        const dXpdrMode = document.getElementById('disp-xpdr-mode');
        const dFac = document.getElementById('disp-facility');
        const dIcao = document.getElementById('disp-tuned-icao');

        if (dCom1Act) dCom1Act.innerText = ATCState.com1.active.toFixed(3);
        if (dCom1Stby) dCom1Stby.innerText = ATCState.com1.standby.toFixed(3);
        if (dCom2Act) dCom2Act.innerText = ATCState.com2.active.toFixed(3);
        if (dCom2Stby) dCom2Stby.innerText = ATCState.com2.standby.toFixed(3);
        if (dXpdr) dXpdr.innerText = ATCState.transponder.code;
        if (dXpdrMode) dXpdrMode.innerText = ATCState.transponder.mode;
        if (dFac) dFac.innerText = ATCState.currentFacility;
        if (dIcao) dIcao.innerText = ATCState.tunedIcao;
    }

    /* =========================================================================
       13. BAŞLATICI VE SES KİLİDİ AÇICI
       ========================================================================= */
function loadGlobalAirports() {
        const gmReq = (typeof GM_xmlhttpRequest !== 'undefined') ? GM_xmlhttpRequest :
                      ((typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest : null);
        if (!gmReq) return;

        gmReq({
            method: 'GET',
            url: AIRPORTS_JSON_URL,
            onload: function (res) {
                try {
                    const data = JSON.parse(res.responseText);
                    AIRPORT_DATABASE = Object.assign(AIRPORT_DATABASE, data);
                    console.log(`[GeoFS ATC] ${Object.keys(data).length} adet kuleli meydan başarıyla yüklendi!`);
                    logTranscript('SİSTEM', `Küresel Radar: Dünyadaki ${Object.keys(data).length} kule bağlandı!`, 'atc');
                } catch (e) {
                    console.error('[GeoFS ATC] Kuleler yüklenirken hata:', e);
                }
            }
        });
    }

    function bootEngine() {
        loadGlobalAirports();
        injectAvionicsRadioUI();
        ATCState.generateSquawk();
        updateRadioDisplay();

        const checkGeofs = setInterval(() => {
            if (gWindow.geofs && gWindow.geofs.animation) {
                clearInterval(checkGeofs);
                console.log('[GeoFS AI Pro ATC] Gemini 3.8 Flash, Envelope Monitor & Global Radar Aktif!');
            }
        }, 1000);
    }

window.addEventListener('click', function unlockAudio() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            ctx.resume().then(() => ctx.close());
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
        }
        // MP3 SES KİLİDİNİ KALDIR
        if (audioFX && audioFX.staticAudio) {
            audioFX.staticAudio.play().then(() => {
                audioFX.staticAudio.pause();
                audioFX.staticAudio.currentTime = 0;
            }).catch(() => {});
        }
    }, { once: true });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        bootEngine();
    } else {
        window.addEventListener('DOMContentLoaded', bootEngine);
    }

})();
