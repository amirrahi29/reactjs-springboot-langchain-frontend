import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import 'bootstrap/dist/css/bootstrap.min.css'; // Include Bootstrap CSS
import 'bootstrap-icons/font/bootstrap-icons.css'; // Include Bootstrap Icons
import CommonAvatar from "./assets/img/CommonAvatar.jsx";

/** ====== API CONFIG ====== */
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

/* ---- Voice helpers ---- */
function normalizeGender(g) {
  const s = norm(g);
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return s;
}
function isRishi(v) {
  const n = norm(v.name),
    u = norm(v.voiceURI || "");
  return n.includes("rishi") || u.includes("rishi");
}
function isLekha(v) {
  const n = norm(v.name),
    u = norm(v.voiceURI || "");
  return n.includes("lekha") || u.includes("lekha");
}
function isHindi(v) {
  const n = norm(v.name),
    l = norm(v.lang || ""),
    u = norm(v.voiceURI || "");
  return l.startsWith("hi") || n.includes("hindi") || u.includes("hindi");
}
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
function Chip({ children }) {
  return (
    <span className="badge bg-light text-dark border border-secondary-subtle px-2 py-1 fs-6 fw-semibold rounded-pill">
      {children}
    </span>
  );
}
function Button({ children, kind = "solid", ...p }) {
  const variant = kind === "solid" ? "primary" : kind === "gray" ? "secondary" : "outline-primary";
  return (
    <button {...p} className={`btn btn-${variant} ${p.className || ''}`}>
      {children}
    </button>
  );
}
function Card({ children, style }) {
  return (
    <div className="card shadow-sm border-0" style={style}>
      {children}
    </div>
  );
}

/* Progressive image with loader/placeholder (round support) - Memoized */
const ProgressiveRoundImage = memo(function ProgressiveRoundImage({
  src,
  alt,
  size = 120,
  ring = true,
  ringColor = "#E5E7EB",
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
        background: "#F8FAFC",
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
            color: "#64748B",
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
          className={`img-fluid rounded-circle ${loaded ? 'd-block' : 'd-none'}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
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

/* Typing Effect Component */
const TypingMessage = memo(({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, 20); // Adjust speed as needed
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <div className="p-3 rounded-3 bg-white shadow-sm message-bubble" style={{ maxWidth: '70%', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {isTyping ? (
        <>
          {displayedText}
          <span className="typing-cursor">|</span>
        </>
      ) : (
        displayedText
      )}
    </div>
  );
});

/* Thinking Indicator */
const ThinkingMessage = memo(() => (
  <div className="d-flex justify-content-start mb-3">
    <div className="p-3 rounded-3 bg-white shadow-sm message-bubble" style={{ maxWidth: '70%', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div className="d-flex align-items-center">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status" style={{ width: '1rem', height: '1rem' }}></div>
        <span className="text-muted">Thinking...</span>
      </div>
    </div>
  </div>
));

/* Messages Component - Separated */
const Messages = memo(({ messages, personaImg, personaDisplayName, isThinking, isTyping, typingMessage, handleTypingComplete, handleSpeak, chatRef, composerHeight }) => {
  const isEmpty = messages.length === 0 && !isThinking && !isTyping;
  const commonStyle = { 
    background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
    minHeight: '200px',
    WebkitOverflowScrolling: 'touch',
    overscrollBehaviorY: 'contain'
  };
  const messagesStyle = {
    ...commonStyle,
    paddingBottom: `${composerHeight + 20}px` // Extra padding for safety
  };
  const emptyStyle = {
    ...commonStyle,
    paddingBottom: `${composerHeight}px`,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '3rem'
  };

  if (isEmpty) {
    return (
      <div 
        className="flex-grow-1 d-flex align-items-end justify-content-center p-3 bg-light text-center text-muted"
        style={emptyStyle}
      >
        <div className="w-100">
          <i className="bi bi-chat-square-text display-4 text-muted mb-3 d-block"></i>
          <p className="lead mb-0">Write a message to start...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={chatRef}
      className="flex-grow-1 overflow-auto p-3 bg-light d-flex flex-column position-relative"
      style={messagesStyle}
    >
      {messages.map((m, i) => (
        <div
          key={i}
          className={`mb-3 d-flex ${m.role === "user" ? 'justify-content-end' : 'justify-content-start'}`}
        >
          {m.role === "assistant" && personaImg && (
            <img
              src={personaImg}
              alt={personaDisplayName}
              className="rounded-circle me-2"
              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
            />
          )}
          <div
            className={`p-3 rounded-3 shadow-sm message-bubble ${m.role === "user" ? 'bg-primary text-white' : 'bg-white'}`}
            style={{ maxWidth: '70%', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {m.text}
          </div>
          {m.role === "assistant" && (
            <div className="d-flex gap-2 mt-2">
              <Button kind="outline" onClick={() => handleSpeak(m.text)} size="sm" title="Speak">
                <i className="bi bi-volume-up"></i>
              </Button>
            </div>
          )}
        </div>
      ))}
      {isThinking && <ThinkingMessage />}
      {isTyping && typingMessage && (
        <div className="d-flex justify-content-start mb-3">
          {personaImg && (
            <img
              src={personaImg}
              alt={personaDisplayName}
              className="rounded-circle me-2"
              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
            />
          )}
          <TypingMessage text={typingMessage} onComplete={handleTypingComplete} />
        </div>
      )}
    </div>
  );
});

/* -------------------- Carousels (Responsive horizontal scroll) -------------------- */
function HCarousel({ personas = [], selectedPersona, onSelectPersona }) {
  const viewportRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const containerRef = useRef(null);

  const currentIndex = useMemo(() => {
    return personas.findIndex((p) => p.code === selectedPersona?.code);
  }, [personas, selectedPersona]);

  const handleSelect = useCallback((dir) => {
    const idx = currentIndex;
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < personas.length) {
      onSelectPersona(personas[newIdx]);
    }
  }, [currentIndex, personas, onSelectPersona]);

  // Auto-scroll to selected persona
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = viewportRef.current?.querySelector('.border-success');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedPersona]);

  // drag-to-scroll (mouse)
  const onMouseDown = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollRef.current = el.scrollLeft;
    document.body.style.cursor = 'grabbing';
  };
  const onMouseLeave = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'default';
  };
  const onMouseUp = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = 'default';
  };
  const onMouseMove = (e) => {
    const el = viewportRef.current;
    if (!el || !isDraggingRef.current) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    el.scrollLeft = startScrollRef.current - walk;
  };

  // Touch events for mobile
  const onTouchStart = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    startXRef.current = e.touches[0].pageX - el.offsetLeft;
    startScrollRef.current = el.scrollLeft;
  };
  const onTouchMove = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.touches[0].pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    el.scrollLeft = startScrollRef.current - walk;
  };
  const onTouchEnd = () => {
    // No need for isDragging for touch
  };

  return (
    <div ref={containerRef} className="position-relative">
      <div
        ref={viewportRef}
        className="d-flex overflow-auto flex-nowrap pb-3 scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          cursor: 'grab',
        }}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <style>{`
          .d-flex.overflow-auto::-webkit-scrollbar {
            display: none;
          }
          @media (max-width: 576px) {
            .d-flex.overflow-auto {
              flex-direction: column !important;
              align-items: center;
            }
            .flex-shrink-0 {
              width: 100% !important;
              max-width: 250px;
            }
          }
        `}</style>
        {personas.map((p, i) => {
          const active = selectedPersona && selectedPersona.code === p.code;
          return (
            <div
              key={p.code || i}
              className="flex-shrink-0 mx-2"
              style={{
                width: 'clamp(180px, 22vw, 220px)',
              }}
            >
              <PersonaCard p={p} active={active} onClick={() => onSelectPersona(p)} />
            </div>
          );
        })}
      </div>
      <button
        onClick={() => handleSelect(-1)}
        className="btn btn-dark rounded-circle position-absolute top-50 translate-middle-y start-0 ms-2 z-3 shadow-lg"
        style={{ 
          width: '40px', 
          height: '40px', 
          transform: 'translateY(-50%) translateX(-50%)',
          opacity: 0.8,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.8'}
        aria-label="Previous"
      >
        <i className="bi bi-chevron-left"></i>
      </button>
      <button
        onClick={() => handleSelect(1)}
        className="btn btn-dark rounded-circle position-absolute top-50 translate-middle-y end-0 me-2 z-3 shadow-lg"
        style={{ 
          width: '40px', 
          height: '40px', 
          transform: 'translateY(-50%) translateX(50%)',
          opacity: 0.8,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.8'}
        aria-label="Next"
      >
        <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  );
}

/* Vertical Scroll for Categories */
function VScroll({ children, containerRef, categories = [], selectedCategory = "", onSelectCategory }) {
  const viewportRef = useRef(null);

  const currentIndex = useMemo(() => {
    return categories.findIndex((c) => {
      const cat = typeof c === "string" ? c : (c.code || c.name || c);
      return cat === selectedCategory;
    });
  }, [categories, selectedCategory]);

  const handleNav = useCallback((dir) => {
    const idx = currentIndex;
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < categories.length) {
      const target = categories[newIdx];
      const cat = typeof target === "string" ? target : (target.code || target.name || target);
      const label = typeof target === "string"
        ? target
        : target.displayName || target.name || target.code || `Category ${newIdx}`;
      onSelectCategory(cat, label);
    }
  }, [currentIndex, categories, onSelectCategory]);

  // Auto-scroll to selected category
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = viewportRef.current?.querySelector('.border-primary');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  useEffect(() => {
    // Ensure viewport has proper height
    if (viewportRef.current && containerRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      viewportRef.current.style.height = `${containerHeight}px`;
    }
  }, [containerRef, children]);

  return (
    <div className="position-relative w-100 h-100">
      <div
        ref={viewportRef}
        className="overflow-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          height: '100%',
        }}
      >
        <style>{`
          .overflow-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="d-flex flex-column">
          {children}
        </div>
      </div>
      <button
        onClick={() => handleNav(-1)}
        className="btn btn-dark rounded-circle position-absolute top-0 start-50 translate-middle-x z-5 shadow"
        style={{ 
          width: '28px', 
          height: '28px', 
          opacity: 0.7,
          transition: 'opacity 0.2s ease',
          transform: 'translateX(-50%)',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        aria-label="Scroll Up"
      >
        <i className="bi bi-chevron-up fs-7 d-flex justify-content-center align-items-center w-100 h-100 text-white"></i>
      </button>
      <button
        onClick={() => handleNav(1)}
        className="btn btn-dark rounded-circle position-absolute bottom-0 start-50 translate-middle-x z-5 shadow"
        style={{ 
          width: '28px', 
          height: '28px', 
          opacity: 0.7,
          transition: 'opacity 0.2s ease',
          transform: 'translateX(-50%)',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        aria-label="Scroll Down"
      >
        <i className="bi bi-chevron-down fs-7 d-flex justify-content-center align-items-center w-100 h-100 text-white"></i>
      </button>
    </div>
  );
}

/* Memoized Cards */
const CategoryCard = memo(function CategoryCard({ cat, label, img, active, onClick }) {
  return (
    <button
      onClick={() => onClick(cat, label)}
      className={`btn d-block text-center rounded-3 p-2 border-0 shadow-sm position-relative overflow-hidden ${active ? 'border-primary bg-primary shadow' : ''}`}
      style={{ width: "100%", transition: 'all 0.2s ease' }}
      title={label}
    >
      {active && <div className="position-absolute top-0 start-0 w-100 h-100 bg-primary opacity-10"></div>}
      <ProgressiveRoundImage src={img} alt={label} size={64} ring={!active} />
      <div className="pt-2 position-relative">
        <div className={`fw-bold small ${active ? 'text-white' : 'text-dark'}`}>
          {label}
        </div>
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
      className={`btn d-block text-center rounded-3 p-2 border-0 shadow-sm ${active ? 'border-success bg-success-subtle shadow' : ''}`}
      style={{ width: "100%", transition: 'all 0.2s ease' }}
      title={label}
    >
      <ProgressiveRoundImage src={img} alt={label} size={100} ring={!active} />
      <div className="pt-2">
        <div className={`fw-bold ${active ? 'text-success' : 'text-dark'}`}>
          {label}
        </div>
        {g ? (
          <div className={`small mt-1 ${active ? 'text-success-emphasis' : 'text-muted'}`}>
            {g === "male" ? "Male" : g === "female" ? "Female" : g}
          </div>
        ) : null}
      </div>
    </button>
  );
});

/* Composer Component */
const Composer = memo(({ userMsg, onUserMsgChange, onSendMessage, selectedPersona, personaDisplayName, isThinking, isTyping, showAvatar, onToggleAvatar, composerRef }) => (
  <div 
    ref={composerRef}
    className="position-fixed bottom-0 bg-white border-top border-secondary-subtle p-3 shadow-lg z-1050 composer"
    style={{ 
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem',
      left: 0,
      right: 0
    }}
  >
    <div className="input-group">
      <textarea
        className="form-control border-0 shadow-sm"
        rows={2}
        placeholder={
          selectedPersona
            ? `Ask ${personaDisplayName}...`
            : "Select a persona first..."
        }
        value={userMsg}
        onChange={(e) => onUserMsgChange(e.target.value)}
        onKeyDown={onSendMessage}
        disabled={!selectedPersona || isThinking || isTyping}
      />
      <Button
        onClick={() => onSendMessage(null)}
        disabled={!selectedPersona || !userMsg.trim() || isThinking || isTyping}
        className="btn-primary px-4"
      >
        <i className="bi bi-send"></i>
      </Button>
      <Button
        kind="gray"
        onClick={() => onToggleAvatar()}
        className="btn-outline-secondary px-3"
        title="Toggle Avatar"
        disabled={isThinking || isTyping}
      >
        <i className={`bi ${showAvatar ? 'bi-eye-slash' : 'bi-eye'}`}></i>
      </Button>
    </div>
  </div>
));

/* -------------------- Main App -------------------- */
export default function App() {
  // App state (unchanged)
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

  // New states
  const [showAvatar, setShowAvatar] = useState(false);
  const [typingMessage, setTypingMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Dynamic viewport height for keyboard handling
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // Chat scroll ref
  const chatRef = useRef(null);

  // Composer ref for height calculation
  const composerRef = useRef(null);

  // TTS (unchanged)
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1.0),
    [pitch, setPitch] = useState(1.0),
    [volume, setVolume] = useState(1);
  const [blink, setBlink] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Lip sync (unchanged)
  const [mouthScale, setMouthScale] = useState(0.25);
  const [articulation, setArticulation] = useState(1.35);
  const utterRef = useRef(null);
  const idxRef = useRef(0);
  const boundarySeen = useRef(false);
  const fallbackTimer = useRef(null);
  const rafRef = useRef(0);
  const lastBoundaryAt = useRef(0);
  const spokenTextRef = useRef("");
  const originalTextRef = useRef("");

  // Categories scroll container ref
  const categoriesContainerRef = useRef(null);

  // Dynamic padding for messages based on composer height
  const [composerHeight, setComposerHeight] = useState(80); // Default height

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 992);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Dynamic viewport height for keyboard
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      // Scroll to bottom on resize (keyboard open/close)
      setTimeout(scrollToBottom, 300);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, [scrollToBottom]);

  // Update composer height
  useEffect(() => {
    if (composerRef.current) {
      setComposerHeight(composerRef.current.offsetHeight);
    }
  }, [userMsg, isTyping, isThinking, viewportHeight]);

  // Auto-scroll chat to bottom with delay
  useEffect(() => {
    setTimeout(scrollToBottom, 150);
  }, [messages, typingMessage, isThinking, isTyping, composerHeight, scrollToBottom]);

  // No-horizontal-scroll for page
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

  // Load data (unchanged)
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
    stopAll(true);
    setSelectedCategory(cat);
    setSelectedCategoryName(label);
    setSelectedPersona(null);
    try {
      const res = await fetch(
        `${BASE_URL}/personas/by-category/${encodeURIComponent(cat)}`
      );
      if (res.ok) {
        const list = await res.json();
        setPersonasGrouped((prev) => ({ ...prev, [cat]: list || [] }));
      }
    } catch {}
  }

  // Voices list & pick by gender (unchanged)
  useEffect(() => {
    const loadVoices = () => {
      const list = window.speechSynthesis?.getVoices() || [];
      setVoices(list);
      if (selectedPersona) {
        const best = pickVoiceByGender(
          list,
          selectedPersona.gender || selectedPersona.genderCode || selectedPersona.sex
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

  // On persona change: stop, reset session, repick voice (unchanged)
  useEffect(() => {
    if (!selectedPersona) return;
    stopAll(true);
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

    if (voices.length) {
      const best = pickVoiceByGender(
        voices,
        selectedPersona.gender || selectedPersona.genderCode || selectedPersona.sex
      );
      if (best && best.voiceURI !== voiceURI) setVoiceURI(best.voiceURI);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona]);

  // ========== TTS / Lip-sync ==========
  const durScale = useMemo(() => {
    const r = Math.min(1.5, Math.max(0.6, rate));
    return 0.25 + 1 / r;
  }, [rate]);

  const classify = useMemo(() => {
    const vowels = /[aāâáàeēéèiīíoōóòuūúùoअआइईउऊएऐओऔ]/i;
    const softs = /[महनलरयवसफमं]/i;
    const digits = /[0-9०-९]/;
    const bracket = /[(){}[\]]/;
    return (chSp, nextSp, chO) => {
      const c = (chSp || " ").toLowerCase();
      if (chO === "!")
        return { open: 1.35, dur: 140 * durScale, pause: 180 * durScale };
      if (chO === "?")
        return { open: 0.85, dur: 160 * durScale, pause: 260 * durScale };
      if (c === "…" || (c === "." && nextSp === "."))
        return { open: 0.18, dur: 220 * durScale, pause: 420 * durScale };
      if (c === ".")
        return { open: 0.12, dur: 240 * durScale, pause: 340 * durScale };
      if (c === "।")
        return { open: 0.14, dur: 260 * durScale, pause: 360 * durScale };
      if (/[,;:]/.test(c))
        return { open: 0.22, dur: 160 * durScale, pause: 160 * durScale };
      if (/[—-]/.test(c))
        return { open: 0.2, dur: 140 * durScale, pause: 120 * durScale };
      if (/["“”'’‘]/.test(c))
        return { open: 0.24, dur: 110 * durScale, pause: 100 * durScale };
      if (bracket.test(c))
        return { open: 0.22, dur: 120 * durScale, pause: 110 * bracket };
      if (/\s/.test(c))
        return { open: 0.3, dur: 110 * durScale, pause: 40 * durScale };
      if (vowels.test(c)) return { open: 1.2, dur: 180 * durScale };
      if (softs.test(c)) return { open: 0.9, dur: 130 * durScale };
      if (digits.test(c)) return { open: 0.75, dur: 120 * durScale };
      return { open: 0.7, dur: 110 * durScale };
    };
  }, [durScale]);

  function normalizeTextForSpeech(t) {
    return t
      .replace(/!/g, "।")
      .replace(/\?/g, "।")
      .replace(/\.{2,}/g, "…")
      .replace(/\.\s+/g, "। ");
  }

  function tweenMouth(to, ms = 90) {
    const start = performance.now();
    const from = mouthScale;
    const target = Math.max(0.22, Math.min(1.6, to));
    cancelAnimationFrame(rafRef.current);
    const anim = (t) => {
      const k = Math.min(1, (t - start) / Math.max(90, ms));
      const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setMouthScale(from + (target - from) * ease);
      if (k < 1) rafRef.current = requestAnimationFrame(anim);
    };
    rafRef.current = requestAnimationFrame(anim);
  }

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
      const tgt = Math.max(
        0.25,
        Math.min(1.6, mouthScale * 0.25 + boosted * 0.75)
      );
      const openDur = Math.min(200, dur * (0.6 + 0.3 * Math.min(1, boosted)));
      tweenMouth(tgt, openDur);
      setTimeout(
        () => tweenMouth(0.3, Math.min(220, 70 + dur * 0.6)),
        dur * 0.8
      );
      idxRef.current++;
      if (idxRef.current < s.length) {
        fallbackTimer.current = setTimeout(loop, dur + pause + 40);
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
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setSpeaking(false);
    setPaused(false);
    if (!silent) tweenMouth(0.24, 200);
  }

  function handleSpeak(forcedText) {
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

    if (!chosen)
      return alert(
        "Enable Hindi voices (Microsoft Rishi/Lekha)."
      );

    if (voiceURI !== chosen.voiceURI) setVoiceURI(chosen.voiceURI);

    stopAll(true);
    idxRef.current = 0;
    boundarySeen.current = false;
    lastBoundaryAt.current = 0;

    const original = toSpeak;
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

    utter.onboundary = (e) => {
      boundarySeen.current = true;
      const now = performance.now();
      if (now - lastBoundaryAt.current < 90) return;
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
      const tgt = Math.max(
        0.25,
        Math.min(1.6, mouthScale * 0.25 + boosted * 0.75)
      );
      const openDur = Math.min(200, dur * (0.6 + 0.3 * Math.min(1, boosted)));
      tweenMouth(tgt, openDur);
      setTimeout(
        () => tweenMouth(0.3, Math.min(220, 70 + dur * 0.6)),
        dur * 0.8 + pause * 0.5
      );
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  /* -------------------- Chat -------------------- */
  const sendMessage = useCallback(async (e) => {
    if (e?.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    } else if (e) {
      return;
    }
    if (!selectedPersona) {
      alert("Please select a persona first.");
      return;
    }
    const msg = userMsg.trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setTimeout(scrollToBottom, 0);
    const tempUserMsg = userMsg;
    setUserMsg("");
    setIsThinking(true);
    setIsTyping(false);
    setTypingMessage(null);
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
      setText(reply || "");
      setIsTyping(true);
    } catch (error) {
      console.error("Chat error:", error);
      setErr(error.message || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", text: "⚠️ An error occurred." }]);
      setTimeout(scrollToBottom, 0);
      setIsThinking(false);
      setIsTyping(false);
      setUserMsg(tempUserMsg); // Restore message on error
    }
  }, [userMsg, selectedPersona, sessionId, scrollToBottom]);

  const handleTypingComplete = useCallback(() => {
    if (typingMessage) {
      setMessages((m) => [...m, { role: "assistant", text: typingMessage }]);
      setTimeout(scrollToBottom, 0);
    }
    setIsTyping(false);
    setTypingMessage(null);
  }, [typingMessage, scrollToBottom]);

  const personaList = selectedCategory
    ? personasGrouped[selectedCategory] || []
    : [];

  const personaDisplayName = selectedPersona ? (selectedPersona.displayName || selectedPersona.name || selectedPersona.code) : "a persona";

  const categoriesStyle = {
    position: isMobile ? "static" : "sticky",
    top: isMobile ? "auto" : 80,
    height: isMobile ? "auto" : 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column'
  };

  const personaImg = selectedPersona ? (selectedPersona.image || selectedPersona.imageUrl) : null;

  const toggleAvatar = () => setShowAvatar(!showAvatar);

  const avatarContent = (
    <>
      <div
        className={`d-grid place-items-center ${blink ? "blink" : ""} flex-grow-1`}
        style={{ "--mouthScale": mouthScale }}
      >
        <CommonAvatar width={280} height={380} />
      </div>
      <div className="mt-3 d-flex align-items-center justify-content-between flex-wrap gap-2 flex-shrink-0">
        <div className="fw-bold h6 mb-0">
          {personaDisplayName}
        </div>
        {selectedPersona?.gender ? (
          <Chip>{normalizeGender(selectedPersona.gender)}</Chip>
        ) : null}
        <Button
          kind={showAdvanced ? "outline" : "gray"}
          onClick={() => setShowAdvanced((v) => !v)}
          size="sm"
          disabled={isThinking || isTyping}
        >
          {showAdvanced ? "Hide" : "Advanced"}
        </Button>
      </div>

      {showAdvanced && (
        <div className="mt-3 pt-3 border-top border-secondary-subtle flex-shrink-0">
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label small fw-medium">Speed: {rate.toFixed(2)}</label>
              <input
                type="range"
                className="form-range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                disabled={isThinking || isTyping}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-medium">Pitch: {pitch.toFixed(2)}</label>
              <input
                type="range"
                className="form-range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                disabled={isThinking || isTyping}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-medium">Volume: {volume.toFixed(2)}</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                disabled={isThinking || isTyping}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-medium">Articulation: {articulation.toFixed(2)}</label>
              <input
                type="range"
                className="form-range"
                min="0.8"
                max="1.8"
                step="0.05"
                value={articulation}
                onChange={(e) => setArticulation(Number(e.target.value))}
                disabled={isThinking || isTyping}
              />
            </div>
            <div className="col-12">
              <label className="form-label small fw-medium">Voice:</label>
              <select
                className="form-select form-select-sm"
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                disabled={isThinking || isTyping}
              >
                {(voices.length ? voices : [])
                  .filter(
                    (v, i, self) =>
                      self.findIndex((x) => x.voiceURI === v.voiceURI) === i
                  )
                  .map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={blink}
                  onChange={(e) => setBlink(e.target.checked)}
                  disabled={isThinking || isTyping}
                />
                <label className="form-check-label small fw-medium">Blink</label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex gap-2 flex-wrap mt-3 justify-content-center flex-shrink-0">
        <Button onClick={() => handleSpeak()} disabled={speaking || !text || isThinking || isTyping} size="sm">
          <i className="bi bi-mic me-1"></i>Speak
        </Button>
        <Button kind="gray" onClick={() => stopAll()} disabled={!speaking || isThinking || isTyping} size="sm">
          <i className="bi bi-stop me-1"></i>Stop
        </Button>
      </div>
    </>
  );

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ height: `${viewportHeight}px` }}>
      {/* HEADER */}
      <header className="bg-white border-bottom sticky-top z-3 py-3 px-3 shadow-sm flex-shrink-0">
        <div className="d-flex align-items-center justify-content-center flex-wrap gap-2">
          <h1 className="h4 mb-0 fw-bold text-center flex-grow-1">
            <i className="bi bi-chat-dots text-primary me-2"></i>Talking Personas
          </h1>
          <div className="d-flex align-items-center gap-2">
            <Chip>Hindi TTS</Chip>
            <Chip>Gender-aware</Chip>
            <Chip>Session: {sessionId}</Chip>
          </div>
        </div>
        {err ? (
          <div className="alert alert-danger mt-2 mb-0 small d-flex align-items-center">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {err}
          </div>
        ) : null}
      </header>

      {/* MAIN CONTENT - Flex grow to fill remaining height */}
      <div className="flex-grow-1 d-flex overflow-hidden" style={{ height: `calc(${viewportHeight}px - 80px)` }}>
        <div className="container-fluid px-3 py-3 h-100 d-flex flex-column">
          <div className="row g-3 h-100">
            {!isMobile ? (
              <>
                {/* LEFT: Categories - Sidebar on desktop */}
                <div className="col-lg-1 d-none d-lg-block">
                  <Card style={categoriesStyle}>
                    <div className="card-header bg-transparent border-0 pb-2 pt-3 flex-shrink-0">
                      <h5 className="card-title mb-0 d-flex align-items-center">
                        Categories
                      </h5>
                      {loading ? <small className="text-muted d-block mt-1">Loading…</small> : null}
                    </div>
                    <div ref={categoriesContainerRef} className="card-body p-0 flex-grow-1 d-flex flex-column overflow-hidden">
                      <VScroll 
                        containerRef={categoriesContainerRef}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={loadByCategory}
                      >
                        <div className="d-grid gap-3 p-3">
                          {(categories || []).map((c, i) => {
                            const label =
                              typeof c === "string"
                                ? c
                                : c.displayName || c.name || c.code || `Category ${i + 1}`;
                            const img = typeof c === "object" ? c.image || c.imageUrl : null;
                            const cat = typeof c === "string" ? c : (c.code || c.name || c);
                            const active = selectedCategory === cat;
                            return (
                              <CategoryCard
                                key={i}
                                cat={cat}
                                label={label}
                                img={img}
                                active={active}
                                onClick={loadByCategory}
                              />
                            );
                          })}
                        </div>
                      </VScroll>
                    </div>
                  </Card>
                </div>

                {/* RIGHT: Personas (Top Block) + Chat (Bottom Block) on desktop */}
                <div className="col-lg-11 h-100">
                  <div className="d-flex flex-column h-100">
                    {/* TOP BLOCK: Personas - Separate flex-shrink-0 */}
                    {selectedCategory && (
                      <div className="flex-shrink-0 border-bottom border-secondary-subtle py-2">
                        <Card>
                          <div className="card-header d-flex justify-content-center align-items-baseline bg-transparent border-0 pb-2 pt-3">
                            <h5 className="card-title mb-0 me-2 d-flex align-items-center">
                              <i className="bi bi-people text-success me-2"></i>Personas
                            </h5>
                            <small className="text-muted">(Category: {selectedCategoryName})</small>
                          </div>
                          <div className="card-body p-2">
                            <HCarousel
                              personas={personaList}
                              selectedPersona={selectedPersona}
                              onSelectPersona={setSelectedPersona}
                            />
                          </div>
                        </Card>
                      </div>
                    )}
                    {!selectedCategory && (
                      <div className="flex-shrink-0 text-center py-3 text-muted border-bottom border-secondary-subtle">
                        <i className="bi bi-inbox fs-1 text-muted mb-2 d-block"></i>
                        <p className="mb-0">Select a category from the left to load personas.</p>
                      </div>
                    )}

                    {/* BOTTOM BLOCK: Chat Area - Full remaining height */}
                    <div className="flex-grow-1 d-flex">
                      <div className="row g-3 h-100 w-100">
                        {/* Chat Messages */}
                        <div className={`col-12 ${showAvatar ? 'col-lg-8' : 'col-lg-12'} h-100`}>
                          <Card className="h-100 shadow-lg border-0 d-flex flex-column position-relative">
                            <Messages
                              messages={messages}
                              personaImg={personaImg}
                              personaDisplayName={personaDisplayName}
                              isThinking={isThinking}
                              isTyping={isTyping}
                              typingMessage={typingMessage}
                              handleTypingComplete={handleTypingComplete}
                              handleSpeak={handleSpeak}
                              chatRef={chatRef}
                              composerHeight={composerHeight}
                            />
                          </Card>
                        </div>

                        {/* Avatar - Conditional, on right */}
                        {showAvatar && selectedPersona && (
                          <div className="col-12 col-lg-4 h-100">
                            <Card className="h-100">
                              <div className="card-body p-3 text-center d-flex flex-column h-100">
                                {avatarContent}
                              </div>
                            </Card>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mobile: Stack categories on top, then personas, then chat */}
                <div className="col-12 flex-shrink-0">
                  <Card style={categoriesStyle}>
                    <div className="card-header bg-transparent border-0 pb-2 pt-3 flex-shrink-0">
                      <h5 className="card-title mb-0 d-flex align-items-center">
                        Categories
                      </h5>
                      {loading ? <small className="text-muted d-block mt-1">Loading…</small> : null}
                    </div>
                    <div ref={categoriesContainerRef} className="card-body p-0 flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: '150px', height: 'auto' }}>
                      <VScroll 
                        containerRef={categoriesContainerRef}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={loadByCategory}
                      >
                        <div className="d-grid gap-3 p-3">
                          {(categories || []).map((c, i) => {
                            const label =
                              typeof c === "string"
                                ? c
                                : c.displayName || c.name || c.code || `Category ${i + 1}`;
                            const img = typeof c === "object" ? c.image || c.imageUrl : null;
                            const cat = typeof c === "string" ? c : (c.code || c.name || c);
                            const active = selectedCategory === cat;
                            return (
                              <CategoryCard
                                key={i}
                                cat={cat}
                                label={label}
                                img={img}
                                active={active}
                                onClick={loadByCategory}
                              />
                            );
                          })}
                        </div>
                      </VScroll>
                    </div>
                  </Card>
                </div>

                {/* Mobile: Personas Top Block */}
                <div className="col-12 flex-shrink-0">
                  {selectedCategory && (
                    <div className="border-bottom border-secondary-subtle py-2">
                      <Card>
                        <div className="card-header d-flex justify-content-center align-items-baseline bg-transparent border-0 pb-2 pt-3">
                          <h5 className="card-title mb-0 me-2 d-flex align-items-center">
                            <i className="bi bi-people text-success me-2"></i>Personas
                          </h5>
                          <small className="text-muted">(Category: {selectedCategoryName})</small>
                        </div>
                        <div className="card-body p-2">
                          <HCarousel
                            personas={personaList}
                            selectedPersona={selectedPersona}
                            onSelectPersona={setSelectedPersona}
                          />
                        </div>
                      </Card>
                    </div>
                  )}
                  {!selectedCategory && (
                    <div className="text-center py-3 text-muted border-bottom border-secondary-subtle">
                      <i className="bi bi-inbox fs-1 text-muted mb-2 d-block"></i>
                      <p className="mb-0">Select a category above to load personas.</p>
                    </div>
                  )}
                </div>

                {/* Mobile: Chat Bottom Block */}
                <div className="col-12 flex-grow-1 d-flex">
                  <div className="d-flex flex-column h-100 w-100 g-3">
                    {/* Chat Messages - flex-grow-1 */}
                    <div className="flex-grow-1 d-flex align-items-stretch">
                      <Card className="h-100 shadow-lg border-0 d-flex flex-column position-relative">
                        <Messages
                          messages={messages}
                          personaImg={personaImg}
                          personaDisplayName={personaDisplayName}
                          isThinking={isThinking}
                          isTyping={isTyping}
                          typingMessage={typingMessage}
                          handleTypingComplete={handleTypingComplete}
                          handleSpeak={handleSpeak}
                          chatRef={chatRef}
                          composerHeight={composerHeight}
                        />
                      </Card>
                    </div>

                    {/* Avatar - Conditional, fixed height below chat */}
                    {showAvatar && selectedPersona && (
                      <div className="flex-shrink-0" style={{ height: '450px' }}>
                        <Card className="h-100">
                          <div className="card-body p-3 text-center d-flex flex-column h-100">
                            {avatarContent}
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Composer - Fixed at bottom */}
      <Composer
        userMsg={userMsg}
        onUserMsgChange={setUserMsg}
        onSendMessage={sendMessage}
        selectedPersona={selectedPersona}
        personaDisplayName={personaDisplayName}
        isThinking={isThinking}
        isTyping={isTyping}
        showAvatar={showAvatar}
        onToggleAvatar={toggleAvatar}
        composerRef={composerRef}
      />

      <style>{`
        .typing-cursor {
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        /* Custom scrollbar for categories */
        .overflow-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .overflow-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        /* Composer alignment on desktop: after categories sidebar */
        @media (min-width: 992px) {
          .composer {
            left: calc( (100% / 12) + 1.5rem ) !important;
            width: calc( 100% - (100% / 12) - 3rem ) !important;
          }
        }
        /* Custom scrollbar for message bubbles */
        .message-bubble::-webkit-scrollbar {
          width: 4px;
        }
        .message-bubble::-webkit-scrollbar-track {
          background: transparent;
        }
        .message-bubble::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 2px;
        }
        .message-bubble::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
}