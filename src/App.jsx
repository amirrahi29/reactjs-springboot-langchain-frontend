import React, { useEffect, useMemo, useRef, useState } from "react";
import CommonAvatar from "./assets/img/CommonAvatar.jsx";

export default function App() {
  const [text, setText] = useState("नमस्ते! मेरा नाम गांधी जी है! अहिंसा परमो धर्मः।");
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1);
  const [voices, setVoices] = useState([]);     // all voices
  const [hlVoices, setHlVoices] = useState([]); // only Rishi/Lekha
  const [voiceURI, setVoiceURI] = useState("");
  const [blink, setBlink] = useState(true);

  // animation knobs (original feel)
  const [mouthScale, setMouthScale] = useState(0.25);
  const [articulation, setArticulation] = useState(1.35);

  // Refs
  const utterRef = useRef(null);
  const idxRef = useRef(0);
  const boundarySeen = useRef(false);
  const fallbackTimer = useRef(null);
  const rafRef = useRef(0);
  const lastBoundaryAt = useRef(0);

  // Keep the exact text we send to TTS separate from what the user typed
  const spokenTextRef = useRef("");    // normalized punctuation (used by TTS & lip-sync)
  const originalTextRef = useRef("");  // original user text (for emphasis on !/?)

  // ---------- helpers ----------
  // Replace punctuation so Rishi/Lekha don't say "exclamation point"
  function normalizeTextForSpeech(t) {
    return t
      .replace(/!/g, "।")        // exclamation -> danda pause
      .replace(/\?/g, "।")       // question -> pause
      .replace(/\.{2,}/g, "…")   // normalize ellipsis
      .replace(/\.\s+/g, "। ");  // period -> danda (keep space)
  }

  // load voices (prefer Rishi > Lekha)
  useEffect(() => {
    const normalize = (s) => (s || "").toLowerCase();
    const pickHiVoices = (list) =>
      list.filter(v => {
        const nm = normalize(v.name);
        const vu = normalize(v.voiceURI);
        return nm.includes("rishi") || nm.includes("lekha") || vu.includes("rishi") || vu.includes("lekha");
      });

    const loadVoices = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      const onlyHL = pickHiVoices(list);
      setHlVoices(onlyHL);

      if (!voiceURI) {
        const rishi = onlyHL.find(v => normalize(v.name).includes("rishi"));
        const lekha = onlyHL.find(v => normalize(v.name).includes("lekha"));
        const chosen = rishi || lekha || null;
        setVoiceURI(chosen ? chosen.voiceURI : "");
      }
    };

    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [voiceURI]);

  // rate → duration scaling
  const durScale = useMemo(() => {
    const r = Math.min(1.5, Math.max(0.6, rate));
    return 0.25 + (1 / r);
  }, [rate]);

  // Char → mouth motion map (original feel)
  const classify = useMemo(() => {
    const vowels = /[aāâáàeēéèiīíoōóòuūúùoअआइईउऊएऐओऔ]/i;
    const softs  = /[महनलरयवसफमं]/i;
    const digits = /[0-9०-९]/;
    return (chSpoken, nextChSpoken, chOriginal) => {
      const c = (chSpoken || " ").toLowerCase();

      // keep exclamation/question emphasis if original had them (we replaced with danda for TTS)
      if (chOriginal === "!") return { open: 1.35, dur: 140 * durScale, pause: 180 * durScale };
      if (chOriginal === "?") return { open: 0.85, dur: 160 * durScale, pause: 260 * durScale };

      // ellipsis
      if (c === "…" || (c === "." && nextChSpoken === ".")) {
        return { open: 0.18, dur: 220 * durScale, pause: 420 * durScale };
      }

      // punctuation / pauses
      if (c === ".")   return { open: 0.12, dur: 240 * durScale, pause: 340 * durScale };
      if (c === "।")   return { open: 0.14, dur: 260 * durScale, pause: 360 * durScale };
      if (/[,;:]/.test(c))  return { open: 0.22, dur: 160 * durScale, pause: 160 * durScale };
      if (/[—-]/.test(c))   return { open: 0.20, dur: 140 * durScale, pause: 120 * durScale };
      if (/["“”'’‘]/.test(c)) return { open: 0.24, dur: 110 * durScale, pause: 100 * durScale };
      if (/[(){}\[\]]/.test(c)) return { open: 0.22, dur: 120 * durScale, pause: 110 * durScale };

      if (/\s/.test(c))     return { open: 0.30, dur: 110 * durScale, pause:  40 * durScale };
      if (vowels.test(c))   return { open: 1.20, dur: 180 * durScale };
      if (softs.test(c))    return { open: 0.90, dur: 130 * durScale };
      if (digits.test(c))   return { open: 0.75, dur: 120 * durScale };

      return { open: 0.70, dur: 110 * durScale };
    };
  }, [durScale]);

  // tween mouth (original clamp & easing)
  function tweenMouth(to, ms = 90) {
    const start = performance.now();
    const from = mouthScale;
    const target = Math.max(0.22, Math.min(1.60, to)); // ORIGINAL clamp

    cancelAnimationFrame(rafRef.current);
    const animate = (t) => {
      const k = Math.min(1, (t - start) / Math.max(90, ms));
      const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setMouthScale(from + (target - from) * ease);
      if (k < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }

  // ---------- speaking ----------
  function handleSpeak() {
    if (!window.speechSynthesis) return alert("Speech Synthesis not supported");
    if (!text.trim()) return;

    const chosen = hlVoices.find(v => v.voiceURI === voiceURI);
    if (!chosen) {
      alert("Rishi/Lekha voices नहीं मिलीं। Windows/Edge पर 'Microsoft Rishi' या 'Microsoft Lekha' enable करें.");
      return;
    }

    stopAll(true);
    idxRef.current = 0;
    boundarySeen.current = false;
    lastBoundaryAt.current = 0;

    // prepare texts
    const original = text;
    const spoken = normalizeTextForSpeech(original);
    originalTextRef.current = original;
    spokenTextRef.current = spoken;

    const utter = new SpeechSynthesisUtterance(spoken);
    utterRef.current = utter;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;
    utter.voice = chosen;
    utter.lang = chosen.lang || "hi-IN";

    utter.onstart = () => {
      setSpeaking(true);
      setPaused(false);
      tweenMouth(0.4, 140);
      fallbackTimer.current = setTimeout(() => {
        if (!boundarySeen.current) simulateLipSync();
      }, 450);
    };

    utter.onend = () => {
      clearFallback();
      setSpeaking(false);
      tweenMouth(0.24, 220);
    };

    // boundary events → drive mouth
    utter.onboundary = (e) => {
      boundarySeen.current = true;

      const now = performance.now();
      if (now - lastBoundaryAt.current < 90) return; // throttle
      lastBoundaryAt.current = now;

      const i = e.charIndex ?? idxRef.current;
      idxRef.current = i;

      const s = spokenTextRef.current;
      const o = originalTextRef.current;

      const chS = s[i] || " ";
      const nextS = s[i + 1] || " ";
      const chO = o[i] || " ";

      const { open, dur, pause = 0 } = classify(chS, nextS, chO);

      const boosted = open * articulation;
      const target = Math.max(0.25, Math.min(1.60, mouthScale * 0.25 + boosted * 0.75));
      const openDur = Math.min(200, dur * (0.6 + 0.3 * Math.min(1, boosted)));

      tweenMouth(target, openDur);
      setTimeout(
        () => tweenMouth(0.30, Math.min(220, 70 + dur * 0.6)),
        (dur * 0.8) + (pause * 0.5)
      );
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // Fallback lipsync loop (uses spoken + original)
  function simulateLipSync() {
    clearFallback();
    const loop = () => {
      if (!speaking) return;

      const i = idxRef.current;
      const s = spokenTextRef.current;
      const o = originalTextRef.current;

      const chS = s[i] || " ";
      const nextS = s[i + 1] || " ";
      const chO = o[i] || " ";

      const { open, dur, pause = 0 } = classify(chS, nextS, chO);

      const boosted = open * articulation;
      const target = Math.max(0.25, Math.min(1.60, mouthScale * 0.25 + boosted * 0.75));
      const openDur = Math.min(200, dur * (0.6 + 0.3 * Math.min(1, boosted)));

      tweenMouth(target, openDur);
      setTimeout(() => tweenMouth(0.30, Math.min(220, 70 + dur * 0.6)), dur * 0.8);

      idxRef.current++;
      if (idxRef.current < s.length) {
        fallbackTimer.current = setTimeout(loop, (dur + pause + 40));
      }
    };
    loop();
  }

  function clearFallback() {
    clearTimeout(fallbackTimer.current);
    cancelAnimationFrame(rafRef.current);
  }

  function stopAll(silent = false) {
    clearFallback();
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
    setPaused(false);
    if (!silent) tweenMouth(0.24, 200);
  }

  function pauseSpeak() {
    if (!speaking || paused) return;
    window.speechSynthesis.pause();
    setPaused(true);
    tweenMouth(0.28, 120);
  }

  function resumeSpeak() {
    if (!speaking || !paused) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }

  useEffect(() => () => stopAll(true), []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 850, margin: "0 auto" }}>
      <h2>🧑‍🗣️ Professional Hindi Talking Avatar</h2>

      {/* Avatar */}
      <div
        className={blink ? "blink" : ""}
        style={{ display: "inline-block", "--mouthScale": mouthScale }}
      >
        <CommonAvatar width={260} height={360} />
      </div>

      {/* Text box */}
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 12,
          fontSize: 16,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
        placeholder="यहाँ लिखें जो अवतार बोलेगा..."
      />

      {/* Controls */}
      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handleSpeak} disabled={speaking && !paused}>🎙️ बोलो</button>
        <button onClick={pauseSpeak} disabled={!speaking || paused}>⏸️ रोकें</button>
        <button onClick={resumeSpeak} disabled={!speaking || !paused}>▶️ जारी रखें</button>
        <button onClick={stopAll} disabled={!speaking}>⏹️ बंद करें</button>

        <label style={{ marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={blink}
            onChange={(e) => setBlink(e.target.checked)}
          />{" "}
          पलक झपकना
        </label>
      </div>

      {/* Sliders */}
      <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label>
          गति: {rate.toFixed(2)}
          <input
            type="range"
            min="0.6"
            max="1.5"
            step="0.05"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          स्वर: {pitch.toFixed(2)}
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          वॉल्यूम:
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Articulation: {articulation.toFixed(2)}
          <input
            type="range"
            min="0.8"
            max="1.8"
            step="0.05"
            value={articulation}
            onChange={(e) => setArticulation(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          आवाज़:
          <select
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {hlVoices.length ? (
              hlVoices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} — {v.lang}
                </option>
              ))
            ) : (
              <option value="">(Rishi/Lekha not found)</option>
            )}
          </select>
        </label>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        ✅ Rishi/Lekha voices में punctuation बोला नहीं जाएगा—हमने normalize कर दिया है। Danda/ellipsis pauses intact.
      </p>
    </div>
  );
}
