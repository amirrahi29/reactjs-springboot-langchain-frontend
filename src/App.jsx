import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import CommonAvatar from "./assets/img/CommonAvatar.jsx";

/** ===== App Brand ===== */
const APP_NAME = "Raahi Studio";

/** ===== API ===== */
const BASE_URL = "http://localhost:8080/api";

/* -------------------- Helpers -------------------- */
async function readChatReply(res) {
  try {
    const data = await res.json();
    return (
      data.reply ||
      data.content ||
      data.answer ||
      data.output ||
      data.message ||
      JSON.stringify(data)
    );
  } catch {
    return await res.text();
  }
}
const norm = (s) => (s || "").toLowerCase();
const uid = () =>
  "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
const catCode = (c) => (typeof c === "string" ? c : c?.code || c?.name || c);
const catLabel = (c, i) =>
  typeof c === "string"
    ? c
    : c?.displayName || c?.name || c?.code || `Category ${i + 1}`;

/* ---- Voice helpers ---- */
function normalizeGender(g) {
  const s = norm(g);
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return s;
}
const isRishi = (v) => norm(v.name).includes("rishi") || norm(v.voiceURI || "").includes("rishi");
const isLekha = (v) => norm(v.name).includes("lekha") || norm(v.voiceURI || "").includes("lekha");
const isHindi = (v) =>
  norm(v.lang || "").startsWith("hi") ||
  norm(v.name).includes("hindi") ||
  norm(v.voiceURI || "").includes("hindi");

function pickVoiceByGender(voices, genderRaw) {
  const gender = normalizeGender(genderRaw);
  if (gender === "female") {
    return (
      voices.find(isLekha) ||
      voices.find((v) => isHindi(v) && !isRishi(v)) ||
      voices.find(isHindi) ||
      voices[0] ||
      null
    );
  }
  if (gender === "male") {
    return (
      voices.find(isRishi) ||
      voices.find((v) => isHindi(v) && !isLekha(v)) ||
      voices.find(isHindi) ||
      voices[0] ||
      null
    );
  }
  return voices.find(isHindi) || voices[0] || null;
}

/* -------------------- UI atoms -------------------- */
function Button({ children, kind = "solid", ...p }) {
  const variant =
    kind === "solid"
      ? "primary"
      : kind === "gray"
      ? "secondary"
      : "outline-primary";
  return (
    <button {...p} className={`btn btn-${variant} ${p.className || ""}`}>
      {children}
    </button>
  );
}
function Card({ children, style, className = "", ...p }) {
  return (
    <div
      {...p}
      className={`card border-0 ${className}`}
      style={{
        boxShadow: "0 12px 28px rgba(0,0,0,.07), 0 2px 8px rgba(0,0,0,.05)",
        borderRadius: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* Progressive round image */
const ProgressiveRoundImage = memo(function ProgressiveRoundImage({
  src,
  alt,
  size = 120,
  ring = true,
  ringColor = "var(--vaani-ring)",
}) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div
      className="position-relative overflow-hidden rounded-circle mx-auto d-flex align-items-center justify-content-center"
      style={{
        width: size,
        height: size,
        border: ring ? `3px solid ${ringColor}` : "none",
        background:
          "linear-gradient(180deg,var(--vaani-soft-1),var(--vaani-soft-2))",
      }}
    >
      {!loaded && !err && (
        <div
          className="position-absolute d-flex align-items-center justify-content-center w-100 h-100"
          style={{
            background:
              "linear-gradient(90deg,#f1f5f9,#e2e8f0,#f1f5f9) no-repeat",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s linear infinite",
            fontSize: 12,
            color: "var(--vaani-muted)",
          }}
        >
          Loading…
        </div>
      )}
      {!err ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
          className={`img-fluid rounded-circle ${loaded ? "d-block" : "d-none"}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted fs-3">
          <i className="bi bi-person"></i>
        </div>
      )}
      <style>{`@keyframes shimmer{0%{background-position:0 0}100%{background-position:200% 0}}`}</style>
    </div>
  );
});

/* Typing Effect */
const TypingMessage = memo(({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const bubbleRef = useRef(null);

  const smoothScroll = () => {
    const container = bubbleRef.current?.closest(".overflow-auto");
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(() => {
          const next = text.substring(0, i + 1);
          if (i % 4 === 0) smoothScroll();
          return next;
        });
        i++;
      } else {
        clearInterval(timer);
        onComplete && onComplete();
        setTimeout(smoothScroll, 40);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <div
      ref={bubbleRef}
      className="cloud-bubble cloud-assistant"
      style={{ maxWidth: "72%" }}
    >
      <div className="cloud-body">{displayedText}</div>
    </div>
  );
});

/* Thinking Indicator */
const ThinkingMessage = memo(() => (
  <div className="d-flex justify-content-start mb-3">
    <div className="cloud-bubble cloud-assistant" style={{ maxWidth: "72%" }}>
      <div className="cloud-body">
        <div className="d-flex align-items-center gap-2 text-muted">
          <div className="spinner-border spinner-border-sm"></div>
          Thinking…
        </div>
      </div>
    </div>
  </div>
));

/* Bubble */
function CloudBubble({ role = "assistant", children, onSpeak }) {
  const isAssistant = role === "assistant";
  return (
    <div className={`cloud-bubble ${isAssistant ? "cloud-assistant" : "cloud-user"}`}>
      {isAssistant && onSpeak && (
        <span className="cloud-action" title="Speak" role="button" onClick={onSpeak}>
          <i className="bi bi-volume-up"></i>
        </span>
      )}
      <div className="cloud-body">{children}</div>
    </div>
  );
}

/* Messages */
const Messages = memo(
  ({
    messages,
    isThinking,
    isTyping,
    typingMessage,
    typingAvatarUrl,
    handleTypingComplete,
    handleSpeak,
    chatRef,
  }) => {
    return (
      <div
        ref={chatRef}
        className="flex-grow-1 overflow-auto p-3 d-flex flex-column position-relative vaani-messages"
        style={{
          background:
            "radial-gradient(1200px 400px at 10% 0%, var(--vaani-bg-burst) 0%, transparent 60%), linear-gradient(180deg,var(--vaani-bg) 0%, var(--vaani-bg-2) 100%)",
          minHeight: 0,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-3 d-flex ${
              m.role === "assistant" ? "justify-content-start" : "justify-content-end"
            }`}
          >
            {m.role === "assistant" && m.avatarUrl && (
              <img
                src={m.avatarUrl}
                alt="persona"
                className="me-2 shadow-sm"
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "cover",
                  border: "1px solid var(--vaani-border)",
                  borderRadius: "50%",
                }}
              />
            )}

            <CloudBubble
              role={m.role}
              onSpeak={m.role === "assistant" ? () => handleSpeak(m.text) : undefined}
            >
              {m.text}
            </CloudBubble>
          </div>
        ))}

        {isThinking && <ThinkingMessage />}

        {isTyping && typingMessage && (
          <div className="d-flex justify-content-start mb-3">
            {typingAvatarUrl && (
              <img
                src={typingAvatarUrl}
                alt="persona"
                className="me-2 shadow-sm"
                style={{
                  width: 40,
                  height: 40,
                  objectFit: "cover",
                  border: "1px solid var(--vaani-border)",
                  borderRadius: "50%",
                }}
              />
            )}
            <TypingMessage text={typingMessage} onComplete={handleTypingComplete} />
          </div>
        )}

        {messages.length === 0 && !isThinking && !isTyping && (
          <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted">
            <div
              className="p-4 text-center"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
                backdropFilter: "blur(8px)",
                border: "1px dashed var(--vaani-border)",
                borderRadius: 10,
              }}
            >
              <i className="bi bi-chat-square-text display-4 mb-2 d-block"></i>
              <p className="lead mb-0">Write a message to start…</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

/* Cards */
const CategoryCard = memo(function CategoryCard({
  cat,
  label,
  img,
  active,
  onClick,
}) {
  return (
    <button
      onClick={() => onClick(cat, label)}
      className={`btn d-block text-start p-2 border-0 position-relative overflow-hidden w-100 ${
        active ? "bg-success text-white" : "bg-white"
      }`}
      style={{
        transition: "transform .15s ease, box-shadow .15s ease",
        boxShadow: "0 10px 24px rgba(0,0,0,.06), 0 2px 6px rgba(0,0,0,.04)",
        borderRadius: 12,
      }}
      title={label}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div className="d-flex align-items-center gap-3">
        <ProgressiveRoundImage src={img} alt={label} size={54} ring={!active} />
        <div className="flex-grow-1">
          <div className={`fw-semibold ${active ? "text-white" : "text-dark"}`}>
            {label}
          </div>
          {!active && <small className="text-muted">Browse personas</small>}
        </div>
        {active && <i className="bi bi-check-circle-fill opacity-75"></i>}
      </div>
    </button>
  );
});

const PersonaCard = memo(function PersonaCard({ p, active, onClick }) {
  const label = p.displayName || p.name || p.code;
  const img = p.image || p.imageUrl;
  const g = normalizeGender(p.gender || p.genderCode || p.sex);
  return (
    <button
      onClick={() => onClick(p)}
      className={`btn d-block text-center p-2 border-0 shadow-sm ${
        active ? "border-success bg-success-subtle" : "bg-white"
      }`}
      style={{
        width: "100%",
        marginTop: 8,
        transition: "transform .15s ease, box-shadow .15s ease",
        borderRadius: 12,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      title={label}
    >
      <ProgressiveRoundImage src={img} alt={label} size={100} ring={!active} />
      <div className="pt-2">
        <div className={`fw-bold ${active ? "text-success" : "text-dark"}`}>
          {label}
        </div>
        {g ? (
          <div
            className={`small mt-1 ${
              active ? "text-success-emphasis" : "text-muted"
            }`}
          >
            {g}
          </div>
        ) : null}
      </div>
    </button>
  );
});

/* Persona Carousel */
function HCarousel({ personas = [], selectedPersona, onSelectPersona }) {
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!viewportRef.current || !selectedPersona) return;
    const cards = viewportRef.current.querySelectorAll("[data-pcard='1']");
    const idx = personas.findIndex((p) => p.code === selectedPersona.code);
    if (idx < 0) return;
    const el = cards[idx];
    if (!el) return;
    const container = viewportRef.current;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const offset = el.offsetLeft - (cRect.width - elRect.width) / 2;
    container.scrollTo({ left: offset, behavior: "smooth" });
  }, [selectedPersona, personas]);

  return (
    <div
      ref={viewportRef}
      className="d-flex overflow-auto flex-nowrap pb-3 px-2"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        borderTop: "1px solid var(--vaani-border)",
        borderBottom: "1px solid var(--vaani-border)",
        background: "var(--vaani-surface)",
        minHeight: 180,
      }}
    >
      <style>{`.d-flex.overflow-auto::-webkit-scrollbar{display:none}`}</style>

      {Array.isArray(personas) && personas.length > 0 ? (
        personas.map((p, i) => {
          const active = selectedPersona && selectedPersona.code === p.code;
          return (
            <div
              key={p.code || i}
              className="flex-shrink-0 mx-2"
              style={{ width: "clamp(180px, 22vw, 220px)" }}
              data-pcard="1"
            >
              <PersonaCard
                p={p}
                active={!!active}
                onClick={(pp) => onSelectPersona?.(pp)}
              />
            </div>
          );
        })
      ) : (
        <div className="w-100 text-center text-muted py-4">
          <small>No personas in this category.</small>
        </div>
      )}
    </div>
  );
}

/* -------------------- Main App -------------------- */
export default function App() {
  // core state
  const [sessionId, setSessionId] = useState(uid());
  const prevSessionRef = useRef(sessionId);
  const [categories, setCategories] = useState([]);
  const [personasGrouped, setPersonasGrouped] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userMsg, setUserMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ui
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [dark, setDark] = useState(false);

  // TTS states
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1);

  // typing/thinking
  const [typingMessage, setTypingMessage] = useState(null);
  const [typingAvatarUrl, setTypingAvatarUrl] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Reader panel + avatar animation
  const [showReader, setShowReader] = useState(false);
  const [avatarMouth, setAvatarMouth] = useState(0.35);
  const [avatarBlink, setAvatarBlink] = useState(true);

  // timers/raf for viseme engine
  const rafRef = useRef(null);
  const timeoutsRef = useRef([]);

  // refs
  const chatRef = useRef(null);
  const categoriesContainerRef = useRef(null);

  // left sidebar style
  const categoriesStyle = {
    position: isMobile ? "static" : "sticky",
    top: isMobile ? "auto" : 88,
    height: isMobile ? "auto" : "calc(100vh - 100px)",
    display: "flex",
    flexDirection: "column",
    background: "var(--vaani-surface)",
    border: "1px solid var(--vaani-border)",
    borderRadius: 12,
  };

  /* Responsive */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 992);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* No horizontal scroll */
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;
    const p1 = el.style.overflowX;
    const p2 = body.style.overflowX;
    el.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    return () => {
      el.style.overflowX = p1;
      body.style.overflowX = p2;
    };
  }, []);

  /* Load data */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [cRes, gRes] = await Promise.all([
          fetch(`${BASE_URL}/categories`),
          fetch(`${BASE_URL}/personas/grouped`),
        ]);
        if (!cRes.ok) throw new Error("Failed to load categories");
        if (!gRes.ok) throw new Error("Failed to load personas");
        const cats = await cRes.json();
        const grouped = await gRes.json();
        setCategories(Array.isArray(cats) ? cats : cats?.data || []);
        setPersonasGrouped(grouped || {});
      } catch (e) {
        setErr(e.message || "Loading error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadByCategory(cat, label) {
    stopAll();
    setSelectedCategory(cat);
    setSelectedCategoryName(label);
    setSelectedPersona(null);
    try {
      const res = await fetch(
        `${BASE_URL}/personas/by-category/${encodeURIComponent(cat)}`
      );
      if (res.ok) {
        const list = await res.json();
        const arr = Array.isArray(list) ? list : list?.data || [];
        setPersonasGrouped((prev) => ({ ...prev, [cat]: arr }));
      }
    } catch {}
  }

  /* Voices load + re-pick */
  useEffect(() => {
    const loadVoices = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      if (selectedPersona) {
        const best = pickVoiceByGender(
          list,
          selectedPersona.gender ||
            selectedPersona.genderCode ||
            selectedPersona.sex
        );
        if (best && best.voiceURI !== voiceURI) setVoiceURI(best.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona]);

  /* Persona change → reset session & messages */
  useEffect(() => {
    if (!selectedPersona) return;
    stopAll();
    const prev = prevSessionRef.current;
    if (prev) {
      try {
        fetch(`${BASE_URL}/reset/${encodeURIComponent(prev)}`, {
          method: "POST",
        });
      } catch {}
    }
    const nid = uid();
    prevSessionRef.current = nid;
    setSessionId(nid);
    setMessages([]);
    setText("");
  }, [selectedPersona]);

  /* ===== Keyboard navigation ===== */
  const personaList = selectedCategory
    ? personasGrouped[selectedCategory] || []
    : [];
  const currentPersonaIndex = useMemo(
    () =>
      selectedPersona
        ? personaList.findIndex((p) => p.code === selectedPersona.code)
        : -1,
    [personaList, selectedPersona]
  );
  const currentCategoryIndex = useMemo(
    () => categories.findIndex((c) => catCode(c) === selectedCategory),
    [categories, selectedCategory]
  );

  const stepPersona = useCallback(
    (dir) => {
      if (!personaList.length) return;
      let idx = currentPersonaIndex;
      if (idx === -1) idx = 0;
      const newIdx = idx + dir;
      if (newIdx >= 0 && newIdx < personaList.length) {
        setSelectedPersona(personaList[newIdx]);
      }
    },
    [personaList, currentPersonaIndex]
  );

  const stepCategory = useCallback(
    (dir) => {
      if (!categories.length) return;
      const idx = currentCategoryIndex;
      const newIdx = idx + dir;
      if (newIdx >= 0 && newIdx < categories.length) {
        const target = categories[newIdx];
        const code = catCode(target);
        const label = catLabel(target, newIdx);
        loadByCategory(code, label);
      }
    },
    [categories, currentCategoryIndex]
  );

  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isEditable) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPersona(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPersona(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        stepCategory(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        stepCategory(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stepPersona, stepCategory]);

  /* ===== TTS base ===== */
  function normalizeTextForSpeech(t) {
    return t
      .replace(/!/g, "।")
      .replace(/\?/g, "।")
      .replace(/\.{2,}/g, "…")
      .replace(/\.\s+/g, "। ");
  }

  function stopAll() {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
    setAvatarMouth(0.35);
    // clear scheduled timeouts
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    // cancel raf
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  const handleSpeak = useCallback(
    (forcedText) => {
      if (!window.speechSynthesis) return alert("Speech Synthesis not supported");
      const toSpeak = (forcedText ?? text ?? "").trim();
      if (!toSpeak) return;
      const chosen =
        pickVoiceByGender(
          voices,
          normalizeGender(
            selectedPersona?.gender ||
              selectedPersona?.genderCode ||
              selectedPersona?.sex
          )
        ) || voices.find((v) => v.voiceURI === voiceURI);
      if (!chosen) return alert("Enable Hindi voices (Microsoft Rishi/Lekha).");
      if (voiceURI !== chosen.voiceURI) setVoiceURI(chosen.voiceURI);

      stopAll();
      const utter = new SpeechSynthesisUtterance(normalizeTextForSpeech(toSpeak));
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = volume;
      utter.voice = chosen;
      utter.lang = chosen.lang || "hi-IN";
      window.speechSynthesis.speak(utter);
      setSpeaking(true);
      utter.onend = () => setSpeaking(false);
    },
    [voices, selectedPersona, voiceURI, rate, pitch, volume, text]
  );

  /* ====== Viseme Engine (letter/punctuation aware) ====== */
  function charToMouthTarget(ch) {
    const c = (ch || "").toLowerCase();

    const devVowels = /[अआइईउऊएऐओऔािीुूेैोौंः]/;
    const vowels = /[aeiou]/i;
    const plosives = /[pbtdkgqकखगघचछजझटठडढतथदधपफबभक़क़ग़]/i;
    const sibilants = /[fvszशषसझछ]/i;

    const punctuationSoft = /[,:;–—-]/;
    const punctuationHard = /[.?!…।]/;

    if (punctuationHard.test(c)) return { t: 0.30, hold: 140 };
    if (punctuationSoft.test(c)) return { t: 0.34, hold: 90 };

    if (devVowels.test(c) || vowels.test(c)) return { t: 0.87, hold: 75 };
    if (plosives.test(c)) return { t: 0.26, hold: 30 };
    if (sibilants.test(c)) return { t: 0.60, hold: 60 };

    return { t: 0.48, hold: 55 };
  }

  function buildVisemeTimeline(text, rate = 1) {
    const cpsBase = 13.5; // characters per second (heuristic)
    const cps = cpsBase * rate;
    const msPerChar = 1000 / cps;

    const tl = [];
    let t = 0;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (/\s/.test(ch)) {
        t += msPerChar * 0.7;
        continue;
      }

      const { t: target, hold } = charToMouthTarget(ch);
      tl.push({ atMs: t, target });

      if (/[aeiou]/i.test(ch)) {
        t += msPerChar * 1.2 + (hold || 0) * 0.2;
      } else if (/[.?!…।]/.test(ch)) {
        t += msPerChar * 1.4 + (hold || 0);
      } else if (/[,:;–—-]/.test(ch)) {
        t += msPerChar * 1.0 + (hold || 0) * 0.6;
      } else {
        t += msPerChar * 0.9 + (hold || 0) * 0.25;
      }
    }

    tl.push({ atMs: t + 160, target: 0.35 });
    return tl;
  }

  const speakWithAvatar = useCallback(
    (forcedText) => {
      if (!window.speechSynthesis) return alert("Speech Synthesis not supported");

      const raw = (forcedText ?? text ?? "").trim();
      if (!raw) return;

      const chosen =
        pickVoiceByGender(
          voices,
          normalizeGender(
            selectedPersona?.gender ||
              selectedPersona?.genderCode ||
              selectedPersona?.sex
          )
        ) || voices.find((v) => v.voiceURI === voiceURI);

      if (!chosen) return alert("Enable Hindi voices (Microsoft Rishi/Lekha).");
      if (voiceURI !== chosen.voiceURI) setVoiceURI(chosen.voiceURI);

      stopAll();

      const speakText = normalizeTextForSpeech(raw);
      const utter = new SpeechSynthesisUtterance(speakText);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = volume;
      utter.voice = chosen;
      utter.lang = chosen.lang || "hi-IN";

      const timeline = buildVisemeTimeline(raw, rate);
      const startAt = performance.now();
      let idx = 0;
      let mouthTarget = 0.35;
      const ease = 0.35;

      const rafTick = () => {
        setAvatarMouth((prev) => {
          const next = prev + (mouthTarget - prev) * ease;
          return Math.max(0.2, Math.min(1.0, next));
        });

        const now = performance.now();
        const elapsed = now - startAt;

        while (idx < timeline.length && elapsed >= timeline[idx].atMs) {
          mouthTarget = timeline[idx].target;
          idx += 1;
        }

        rafRef.current = requestAnimationFrame(rafTick);
      };
      rafRef.current = requestAnimationFrame(rafTick);

      utter.onboundary = (e) => {
        if (e.name !== "word") return;
        const ci = Math.max(0, Math.min(raw.length - 1, e.charIndex || 0));
        const ch = raw[ci];
        if (!ch) return;

        const { t: quickTarget } = charToMouthTarget(ch);
        mouthTarget = quickTarget;

        if (ci % 22 === 0) setAvatarBlink((b) => !b);
      };

      const cleanup = () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        timeoutsRef.current.forEach((id) => clearTimeout(id));
        timeoutsRef.current = [];
        setAvatarMouth(0.35);
        setSpeaking(false);
      };

      utter.onend = cleanup;
      utter.onerror = cleanup;

      window.speechSynthesis.speak(utter);
      setSpeaking(true);
    },
    [voices, selectedPersona, voiceURI, rate, pitch, volume, text]
  );

  /* -------------------- Auto scroll -------------------- */
  const scrollToBottom = useCallback((smooth = true) => {
    const el = chatRef.current;
    if (!el) return;
    try { el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" }); }
    catch { el.scrollTop = el.scrollHeight; }
  }, []);

  /* -------------------- Chat send -------------------- */
  const sendMessage = useCallback(
    async (e) => {
      if (e?.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
      } else if (e) {
        return;
      }
      if (!selectedPersona) return alert("Please select a persona first.");
      const msg = userMsg.trim();
      if (!msg) return;

      setMessages((m) => [...m, { role: "user", text: msg }]);
      setTimeout(() => scrollToBottom(true), 0);

      const tempUserMsg = userMsg;
      setUserMsg("");
      setIsThinking(true);
      setIsTyping(false);
      setTypingMessage(null);
      setTypingAvatarUrl(null);

      try {
        const res = await fetch(`${BASE_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            persona:
              selectedPersona.code ||
              selectedPersona.id ||
              selectedPersona.persona ||
              selectedPersona.name,
            message: msg,
          }),
        });
        if (!res.ok) throw new Error(`Chat error (${res.status})`);
        const reply = await readChatReply(res);

        setIsThinking(false);
        setTypingMessage(reply);
        setTypingAvatarUrl(
          selectedPersona
            ? selectedPersona.image || selectedPersona.imageUrl || null
            : null
        );
        setText(reply || "");
        setIsTyping(true);
        setTimeout(() => scrollToBottom(true), 0);
      } catch (error) {
        console.error("Chat error:", error);
        setErr(error.message || "Chat failed");
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "⚠️ An error occurred." },
        ]);
        setTimeout(() => scrollToBottom(true), 0);
        setIsThinking(false);
        setIsTyping(false);
        setUserMsg(tempUserMsg);
      }
    },
    [userMsg, selectedPersona, sessionId, scrollToBottom, voices, voiceURI, rate, pitch, volume, text]
  );

  const handleTypingComplete = useCallback(() => {
    if (typingMessage) {
      const avatarUrl =
        typingAvatarUrl ??
        (selectedPersona
          ? selectedPersona.image || selectedPersona.imageUrl || null
          : null);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: typingMessage, avatarUrl },
      ]);
      setTimeout(() => scrollToBottom(true), 0);
    }
    setIsTyping(false);
    setTypingMessage(null);
    setTypingAvatarUrl(null);
  }, [typingMessage, typingAvatarUrl, selectedPersona, scrollToBottom]);

  const personaDisplayName = selectedPersona
    ? selectedPersona.displayName || selectedPersona.name || selectedPersona.code
    : "a persona";

  /* Theme vars */
  useEffect(() => {
    const root = document.documentElement;
    const setVars = (vars) =>
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    if (!dark) {
      setVars({
        "--vaani-bg": "#f7fafc",
        "--vaani-bg-2": "#eef2f7",
        "--vaani-bg-burst": "rgba(88,101,242,.08)",
        "--vaani-surface": "#ffffff",
        "--vaani-border": "#e9eef5",
        "--vaani-ring": "#E5E7EB",
        "--vaani-muted": "#6b7280",
        "--vaani-text": "#0f172a",
        "--vaani-soft-1": "#f8fafc",
        "--vaani-soft-2": "#eef2f7",
        "--vaani-primary": "#5865f2",
      });
    } else {
      setVars({
        "--vaani-bg": "#0b1020",
        "--vaani-bg-2": "#0f162a",
        "--vaani-bg-burst": "rgba(88,101,242,.12)",
        "--vaani-surface": "#121a2e",
        "--vaani-border": "#26324d",
        "--vaani-ring": "#334155",
        "--vaani-muted": "#9aa4b2",
        "--vaani-text": "#e5e7eb",
        "--vaani-soft-1": "#17203a",
        "--vaani-soft-2": "#0f162a",
        "--vaani-primary": "#5865f2",
      });
    }
  }, [dark]);

  /* ======= UI ======= */
  return (
    <div
      className="d-flex flex-column min-vh-100"
      style={{ height: `${viewportHeight}px`, background: "var(--vaani-bg)" }}
    >
      {/* ======= HEADER ======= */}
      <header
        className="sticky-top z-3 border-bottom"
        style={{
          background:
            "linear-gradient(90deg, rgba(88,101,242,.12), rgba(0,0,0,0)), var(--vaani-surface)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="container-fluid px-3">
          <div className="d-flex align-items-center justify-content-between py-2">
            {/* Brand */}
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-inline-flex align-items-center justify-content-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--vaani-primary)",
                  color: "white",
                  boxShadow: "0 6px 18px rgba(88,101,242,.35)",
                }}
              >
                <i className="bi bi-soundwave"></i>
              </div>
              <div className="ms-1">
                <div className="fw-bold" style={{ letterSpacing: ".2px" }}>
                  {APP_NAME}
                </div>
                <small className="text-muted">Conversational Personas Suite</small>
              </div>
            </div>

            {/* Center info */}
            <div className="d-none d-lg-flex align-items-center gap-2">
              {selectedPersona ? (
                <>
                  <span className="text-muted small">Talking to</span>
                  <span className="badge text-bg-light border">
                    {personaDisplayName}
                  </span>
                </>
              ) : (
                <small className="text-muted">Select a category & persona</small>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                title={dark ? "Switch to Light" : "Switch to Dark"}
                onClick={() => setDark((v) => !v)}
              >
                <i className={`bi ${dark ? "bi-sun" : "bi-moon"}`}></i>
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                title="Reset Session"
                onClick={() => {
                  setMessages([]);
                  setUserMsg("");
                  setText("");
                  setSessionId(uid());
                }}
              >
                <i className="bi bi-arrow-repeat"></i>
              </button>
              <button
                className="btn btn-primary btn-sm"
                title={speaking ? "Stop Speaking" : "Speak Last Message"}
                onClick={() =>
                  speaking ? window.speechSynthesis.cancel() : handleSpeak(text)
                }
                disabled={!text}
              >
                <i className="bi bi-megaphone"></i>
              </button>
            </div>
          </div>
        </div>
        {err ? (
          <div className="alert alert-danger rounded-0 mb-0 py-2 small d-flex align-items-center">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {err}
          </div>
        ) : null}
      </header>

      {/* ======= MAIN ======= */}
      <div
        className="flex-grow-1 d-flex overflow-hidden position-relative"
        style={{ height: `calc(${viewportHeight}px - 80px)` }}
      >
        <div className="container-fluid px-3 py-3 h-100 d-flex flex-column" style={{ minHeight: 0 }}>
          <div className="row g-3 h-100" style={{ minHeight: 0 }}>
            {/* LEFT: Categories */}
            <div className="col-lg-2 d-none d-lg-block">
              <Card style={categoriesStyle}>
                <div className="card-header bg-transparent border-0 pb-2 pt-3 flex-shrink-0">
                  <h6 className="card-title mb-0 d-flex align-items-center">
                    <i className="bi bi-grid me-2 text-primary"></i> Categories
                  </h6>
                  {loading ? (
                    <small className="text-muted d-block mt-1">Loading…</small>
                  ) : null}
                </div>
                <div
                  ref={categoriesContainerRef}
                  className="card-body p-0 flex-grow-1 d-flex flex-column overflow-auto"
                >
                  <div className="d-grid gap-3 p-3">
                    {(categories || []).map((c, i) => {
                      const label = catLabel(c, i);
                      const img =
                        typeof c === "object" ? c.image || c.imageUrl : null;
                      const code = catCode(c);
                      const active = selectedCategory === code;
                      return (
                        <CategoryCard
                          key={i}
                          cat={code}
                          label={label}
                          img={img}
                          active={active}
                          onClick={(code, label) => {
                            setSelectedCategory(code);
                            setSelectedCategoryName(label);
                            loadByCategory(code, label);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT: content */}
            <div className="col-12 col-lg-10 h-100">
              <div className="d-flex flex-column h-100" style={{ minHeight: 0, gap: 12 }}>
                {/* Personas strip */}
                {selectedCategory && (
                  <Card className="flex-shrink-0">
                    <div className="card-header d-flex justify-content-between align-items-center bg-transparent border-0 pb-2 pt-3">
                      <div className="d-flex align-items-center">
                        <h6 className="card-title mb-0 me-2 d-flex align-items-center">
                          <i className="bi bi-people text-success me-2"></i>
                          Personas
                        </h6>
                        <small className="text-muted">
                          (Category: {selectedCategoryName})
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small d-none d-md-inline">TTS</span>
                        <input
                          type="range"
                          min="0.6"
                          max="1.4"
                          step="0.1"
                          value={rate}
                          onChange={(e) => setRate(parseFloat(e.target.value))}
                          title={`Rate: ${rate.toFixed(1)}`}
                        />
                        <input
                          type="range"
                          min="0.6"
                          max="1.4"
                          step="0.1"
                          value={pitch}
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          title={`Pitch: ${pitch.toFixed(1)}`}
                        />
                        <input
                          type="range"
                          min="0.2"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          title={`Volume: ${volume.toFixed(1)}`}
                        />
                      </div>
                    </div>
                    <div className="card-body p-0" style={{ borderTop: "1px solid var(--vaani-border)" }}>
                      <HCarousel
                        personas={personasGrouped[selectedCategory] || []}
                        selectedPersona={selectedPersona}
                        onSelectPersona={setSelectedPersona}
                      />
                    </div>
                  </Card>
                )}

                {/* Chat messages */}
                <Card className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  <Messages
                    messages={messages}
                    isThinking={isThinking}
                    isTyping={isTyping}
                    typingMessage={typingMessage}
                    typingAvatarUrl={typingAvatarUrl}
                    handleTypingComplete={handleTypingComplete}
                    handleSpeak={handleSpeak}
                    chatRef={chatRef}
                  />
                </Card>

                {/* Input area */}
                <Card className="flex-shrink-0">
                  <div className="card-body">
                    <div className="input-group">
                      <textarea
                        className="form-control shadow-sm"
                        rows={2}
                        placeholder={
                          selectedPersona
                            ? `Ask ${personaDisplayName}...`
                            : selectedCategory
                            ? "Select a persona..."
                            : "Select a category..."
                        }
                        value={userMsg}
                        onChange={(e) => setUserMsg(e.target.value)}
                        onKeyDown={sendMessage}
                        disabled={!selectedPersona || isThinking || isTyping}
                        style={{
                          lineHeight: 1.5,
                          borderRadius: 0,
                          border: "1px solid var(--vaani-border)",
                          background: "var(--vaani-surface)",
                          color: "var(--vaani-text)",
                        }}
                      />
                      <Button
                        onClick={() => sendMessage(null)}
                        disabled={
                          !selectedPersona || !userMsg.trim() || isThinking || isTyping
                        }
                        className="px-4"
                        style={{
                          borderRadius: 0,
                          border: "1px solid var(--vaani-border)",
                        }}
                      >
                        <i className="bi bi-send"></i>
                      </Button>

                      {/* Reader toggle button */}
                      <Button
                        kind="outline"
                        onClick={() => setShowReader((v) => !v)}
                        className="px-3"
                        title={showReader ? "Hide Reader" : "Show Reader"}
                        style={{
                          borderRadius: 0,
                          border: "1px solid var(--vaani-border)",
                        }}
                      >
                        <i className="bi bi-person-video3"></i>
                      </Button>
                    </div>
                    <div className="d-flex justify-content-between mt-2">
                      <small className="text-muted">
                        ↵ Enter to send • Shift+Enter for new line • ←/→ personas, ↑/↓ categories
                      </small>
                      <small className="text-muted">
                        Session: <code>{sessionId.slice(0, 10)}…</code>
                      </small>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Mobile categories */}
            <div className="col-12 d-lg-none">
              <Card>
                <div className="card-header bg-transparent border-0 pb-2 pt-3 flex-shrink-0">
                  <h6 className="card-title mb-0 d-flex align-items-center">
                    <i className="bi bi-grid me-2 text-primary"></i> Categories
                  </h6>
                  {loading ? (
                    <small className="text-muted d-block mt-1">Loading…</small>
                  ) : null}
                </div>
                <div className="card-body p-0">
                  <div className="d-grid gap-3 p-3">
                    {(categories || []).map((c, i) => {
                      const label = catLabel(c, i);
                      const img =
                        typeof c === "object" ? c.image || c.imageUrl : null;
                      const code = catCode(c);
                      const active = selectedCategory === code;
                      return (
                        <CategoryCard
                          key={i}
                          cat={code}
                          label={label}
                          img={img}
                          active={active}
                          onClick={(code, label) => {
                            setSelectedCategory(code);
                            setSelectedCategoryName(label);
                            loadByCategory(code, label);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* RIGHT SLIDE-IN READER PANEL */}
        <aside
          className={`reader-panel ${showReader ? "show" : ""}`}
          aria-hidden={!showReader}
        >
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style={{background:"var(--vaani-surface)"}}>
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-person-video3"></i>
              <strong>Reader</strong>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                title={speaking ? "Stop" : "Read last reply"}
                onClick={() =>
                  speaking ? window.speechSynthesis.cancel() : speakWithAvatar(text)
                }
                disabled={!text}
              >
                {speaking ? <i className="bi bi-stop-fill"></i> : <i className="bi bi-play-fill"></i>}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Close"
                onClick={() => setShowReader(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          <div className="p-2 d-flex align-items-center justify-content-center h-100">
            <div className="text-center">
              <CommonAvatar
                className={avatarBlink ? "blink" : ""}
                width={260}
                height={330}
                mouth={avatarMouth}
                headTilt={speaking ? 2 : 0}
                eyeX={0}
                eyeY={0}
                browY={speaking ? -1 : 0}
              />
              <div className="mt-3 small text-muted px-3">
                {text ? "Reading the latest assistant reply." : "No reply yet — ask something!"}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .typing-cursor { animation: blink 1s infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

        .overflow-auto::-webkit-scrollbar { width: 8px; height: 8px; }
        .overflow-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-auto::-webkit-scrollbar-thumb { background: rgba(0,0,0,.18); border-radius: 8px; }
        .overflow-auto::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.28); }

        .vaani-messages .shadow-sm { transition: box-shadow .15s ease; }
        .vaani-messages .shadow-sm:hover { box-shadow: 0 8px 20px rgba(0,0,0,.08); }

        /* ================= CLOUD BUBBLES ================= */
        .cloud-bubble{ position:relative; max-width:78%; filter: drop-shadow(0 8px 18px rgba(0,0,0,.08)); isolation:isolate; }
        .cloud-body{ position:relative; z-index:2; padding:14px 40px 14px 16px; line-height:1.6; white-space:pre-wrap; font-variant-ligatures: contextual; }
        .cloud-action{ position:absolute; top:6px; right:6px; z-index:3; font-size:14px; color:var(--vaani-muted); opacity:.85; cursor:pointer; }
        .cloud-action:hover{ opacity:1; }

        .cloud-assistant{ --bg: var(--vaani-surface); --stroke: var(--vaani-border); --shine: rgba(255,255,255,.65); color: var(--vaani-text); }
        .cloud-user{
          --bg: linear-gradient(180deg,
            color-mix(in oklab, var(--vaani-primary) 96%, #fff 0%) 0%,
            color-mix(in oklab, var(--vaani-primary) 85%, #000 0%) 100%);
          --stroke: color-mix(in oklab, var(--vaani-primary) 45%, #000 0%);
          --shine: rgba(255,255,255,.25);
          color: #fff;
        }

        .cloud-bubble::before{
          content:""; position:absolute; inset:0; z-index:0; background: var(--bg);
          border:1px solid var(--stroke); border-radius:22px;
        }
        /* removed the glossy round 'sphere' shine */
        .cloud-bubble::after{ content:none !important; }

        .cloud-bubble .cloud-body::before{
          content:""; position:absolute; left:0; right:0; top:0; height:18px; border-radius:22px 22px 0 0;
          background: linear-gradient(180deg, var(--shine), transparent);
          opacity:.25; pointer-events:none;
        }
     
     
        /* Slide-in Reader Panel */
        .reader-panel{
          position: fixed;
          top: 64px;
          right: 0;
          width: min(360px, 92vw);
          height: calc(100vh - 64px);
          background: var(--vaani-surface);
          border-left: 1px solid var(--vaani-border);
          box-shadow: -10px 0 24px rgba(0,0,0,.08);
          transform: translateX(100%);
          transition: transform .25s ease;
          z-index: 1040;
          display:flex; flex-direction:column;
        }
        .reader-panel.show{ transform: translateX(0%); }
      `}</style>
    </div>
  );
}
