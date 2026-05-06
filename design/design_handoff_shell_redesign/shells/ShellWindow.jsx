/* global React */
const { useState, useEffect, useRef } = React;

// ============================================================
// ShellWindow — a single Leyo shell mock, themeable
// ============================================================

const THEMES = {
  velvet: {
    name: "Velvet Night",
    sub: "Leyo officiel — adouci",
    bg: "#0d0d14",
    bgDeep: "#08080d",
    panel: "rgba(255,255,255,0.025)",
    panelStrong: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.10)",
    text: "#e8e8f0",
    textDim: "#8a8a9a",
    textMuted: "#5a5a6a",
    // pastel-ised brand
    c1: "#9ad8ff", // cyan glacé
    c2: "#a6b3ff", // bleu lavande
    c3: "#cba8ff", // mauve doux
    c4: "#f0a8d8", // rose poudré
    accent: "#cba8ff",
    promptUser: "#9ad8ff",
    promptPath: "#cba8ff",
    promptArrow: "#f0a8d8",
    success: "#a8e0c0",
    error: "#f0a8b8",
    folder: "#9ad8ff",
    file: "#c8c8d8",
    code: "#a6b3ff",
    exec: "#f0a8d8",
    md: "#a8e0c0",
    polyOpacity: 0.02,
  },
  dusk: {
    name: "Dusk",
    sub: "Sunset orange × violet",
    bg: "#16101a",
    bgDeep: "#0c0810",
    panel: "rgba(255,255,255,0.028)",
    panelStrong: "rgba(255,255,255,0.045)",
    border: "rgba(255,200,180,0.07)",
    borderStrong: "rgba(255,200,180,0.12)",
    text: "#f0e6e0",
    textDim: "#a89890",
    textMuted: "#6a5a60",
    c1: "#ffc9a8", // pêche
    c2: "#ffaab0", // corail doux
    c3: "#d4a8e0", // lilas
    c4: "#a8aae0", // bleu nuit doux
    accent: "#ffaab0",
    promptUser: "#ffc9a8",
    promptPath: "#d4a8e0",
    promptArrow: "#ffaab0",
    success: "#c8e0a8",
    error: "#ffaab0",
    folder: "#ffc9a8",
    file: "#e0d4cc",
    code: "#d4a8e0",
    exec: "#ffaab0",
    md: "#c8e0a8",
    polyOpacity: 0.02,
  },
  amber: {
    name: "Amber",
    sub: "Solarisé chaud",
    bg: "#161108",
    bgDeep: "#0c0905",
    panel: "rgba(255,220,170,0.025)",
    panelStrong: "rgba(255,220,170,0.04)",
    border: "rgba(255,200,140,0.07)",
    borderStrong: "rgba(255,200,140,0.12)",
    text: "#f0e4cc",
    textDim: "#a89878",
    textMuted: "#6a5e44",
    c1: "#f0c878", // ambre
    c2: "#e8a868", // ambre profond
    c3: "#d49858", // caramel
    c4: "#c0e0b8", // sauge pâle (contrepoint)
    accent: "#f0c878",
    promptUser: "#f0c878",
    promptPath: "#e8a868",
    promptArrow: "#d49858",
    success: "#c0e0b8",
    error: "#e8a890",
    folder: "#f0c878",
    file: "#e0d0a8",
    code: "#e8a868",
    exec: "#d49858",
    md: "#c0e0b8",
    polyOpacity: 0.02,
  },
};

// ============================================================
// Decorative low-poly background (subtle, distant)
// ============================================================
function PolyBackground({ theme, themeKey }) {
  const gid = `pg-${themeKey}`;
  const mid = `pm-${themeKey}`;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className="leyo-poly-bg"
      style={{ position: "absolute", inset: 0, opacity: theme.polyOpacity, pointerEvents: "none" }}
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.c1} />
          <stop offset="50%" stopColor={theme.c3} />
          <stop offset="100%" stopColor={theme.c2} />
        </linearGradient>
        <radialGradient id={`${mid}-tl`} cx="0%" cy="0%" r="38%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${mid}-br`} cx="100%" cy="100%" r="38%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${mid}-bl`} cx="0%" cy="100%" r="32%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={mid}>
          <rect width="1200" height="800" fill="#000" />
          <rect width="1200" height="800" fill={`url(#${mid}-tl)`} />
          <rect width="1200" height="800" fill={`url(#${mid}-br)`} />
          <rect width="1200" height="800" fill={`url(#${mid}-bl)`} />
        </mask>
      </defs>
      <g mask={`url(#${mid})`}>
        <g fill="none" stroke={`url(#${gid})`} strokeWidth="0.4">
          <polygon points="100,80 240,40 200,180 80,200" />
          <polygon points="240,40 380,90 200,180" />
          <polygon points="900,500 1080,460 1140,640 980,680" />
          <polygon points="1080,460 1180,540 1140,640" />
          <polygon points="40,500 160,460 180,600 60,640" />
        </g>
        <g fill={`url(#${gid})`} fillOpacity="0.15">
          <polygon points="240,40 380,90 200,180" />
          <polygon points="1080,460 1180,540 1140,640" />
        </g>
      </g>
    </svg>
  );
}

// ============================================================
// Window chrome (titlebar + traffic-light-ish icons, Windows-y)
// ============================================================
function TitleBar({ theme }) {
  return (
    <div
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bgDeep,
        position: "relative",
        zIndex: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="assets/logo.png" alt="" style={{ width: 18, height: 18, opacity: 0.95 }} />
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          color: theme.textDim,
          letterSpacing: 0.3,
        }}>
          Leyo Shell <span style={{ color: theme.textMuted, marginLeft: 6 }}>v1.7</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {["−", "▢", "✕"].map((s, i) => (
          <div key={i} style={{
            width: 36, height: 36, display: "grid", placeItems: "center",
            color: theme.textDim, fontSize: 11, fontFamily: "Inter, sans-serif",
          }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Tabs (Windows Terminal style — slim, with accent underline)
// ============================================================
function Tabs({ theme, tabs, activeIdx }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        height: 36,
        background: theme.bgDeep,
        borderBottom: `1px solid ${theme.border}`,
        padding: "0 8px",
        gap: 2,
        position: "relative",
        zIndex: 2,
      }}
    >
      {tabs.map((t, i) => {
        const active = i === activeIdx;
        return (
          <div
            key={i}
            style={{
              height: 30,
              padding: "0 14px 0 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: active ? theme.bg : "transparent",
              borderTop: active ? `1px solid ${theme.borderStrong}` : "1px solid transparent",
              borderLeft: active ? `1px solid ${theme.borderStrong}` : "1px solid transparent",
              borderRight: active ? `1px solid ${theme.borderStrong}` : "1px solid transparent",
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              position: "relative",
              top: 1,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: active ? theme.text : theme.textDim,
              minWidth: 140,
            }}
          >
            {active && (
              <div style={{
                position: "absolute",
                top: 0, left: 8, right: 8, height: 2,
                background: `linear-gradient(90deg, ${theme.c1}, ${theme.c3})`,
                borderRadius: 2,
              }} />
            )}
            <span style={{
              width: 6, height: 6, borderRadius: 1,
              background: active ? theme.accent : theme.textMuted,
              transform: "rotate(45deg)",
            }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t}
            </span>
            <span style={{ color: theme.textMuted, fontSize: 12, opacity: active ? 1 : 0.4 }}>×</span>
          </div>
        );
      })}
      <div style={{
        height: 30, width: 30, display: "grid", placeItems: "center",
        color: theme.textDim, fontSize: 14, marginLeft: 4,
      }}>+</div>
    </div>
  );
}

// ============================================================
// Sidebar — file list with type colors
// ============================================================
const FILES = [
  { name: "..", type: "up" },
  { name: "src", type: "folder" },
  { name: "frontend", type: "folder" },
  { name: "build", type: "folder" },
  { name: "main.go", type: "code" },
  { name: "parser.go", type: "code" },
  { name: "executor.go", type: "code" },
  { name: "history.go", type: "code" },
  { name: "wails.json", type: "json" },
  { name: "go.mod", type: "config" },
  { name: "go.sum", type: "config" },
  { name: "Leyo.exe", type: "exec" },
  { name: "LeyoSetup.exe", type: "exec" },
  { name: "README.md", type: "md" },
  { name: "LICENSE", type: "file" },
  { name: ".gitignore", type: "file" },
];

function fileColor(type, t) {
  switch (type) {
    case "folder": return t.folder;
    case "up": return t.textDim;
    case "code": return t.code;
    case "exec": return t.exec;
    case "md": return t.md;
    case "json": return t.c4;
    case "config": return t.textDim;
    default: return t.file;
  }
}

function Sidebar({ theme, themeKey }) {
  const [hoverIdx, setHoverIdx] = useState(4); // main.go hovered
  return (
    <div
      style={{
        width: 240,
        background: theme.panel,
        borderRight: `1px solid ${theme.border}`,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* gradient liseré along left edge */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 0, width: 1,
        background: `linear-gradient(180deg, ${theme.c1}, ${theme.c3} 50%, ${theme.c2})`,
        opacity: 0.5,
      }} />

      {/* discreet decorative low-poly polygon — signature visuelle */}
      <svg
        width="110" height="110"
        viewBox="0 0 110 110"
        style={{ position: "absolute", right: -22, bottom: 38, opacity: 0.02, pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id={`sb-poly-${themeKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.c1} />
            <stop offset="100%" stopColor={theme.c3} />
          </linearGradient>
        </defs>
        <g stroke={`url(#sb-poly-${themeKey})`} strokeWidth="0.5" fill="none">
          <polygon points="30,20 78,10 92,52 60,72 22,58" />
          <polygon points="30,20 60,72 22,58" />
        </g>
        <polygon points="30,20 60,72 22,58" fill={`url(#sb-poly-${themeKey})`} fillOpacity="0.10" />
      </svg>

      <div style={{
        padding: "14px 16px 10px",
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: theme.textMuted,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>Files</span>
        <span style={{ color: theme.textDim }}>{FILES.length - 1}</span>
      </div>

      <div style={{
        padding: "0 10px 10px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        flex: 1,
        overflow: "hidden",
      }}>
        {FILES.map((f, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoverIdx(i)}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: fileColor(f.type, theme),
              background: hoverIdx === i ? theme.panelStrong : "transparent",
              position: "relative",
              cursor: "default",
            }}
          >
            {hoverIdx === i && (
              <div style={{
                position: "absolute", left: 0, top: 4, bottom: 4, width: 2,
                background: theme.accent, borderRadius: 2,
              }} />
            )}
            <span style={{
              width: 10, height: 10, flexShrink: 0,
              background: f.type === "folder" || f.type === "up"
                ? "transparent"
                : fileColor(f.type, theme),
              border: f.type === "folder" || f.type === "up"
                ? `1px solid ${fileColor(f.type, theme)}`
                : "none",
              opacity: f.type === "up" ? 0.4 : 0.85,
              clipPath: f.type === "folder" || f.type === "up"
                ? "polygon(0 30%, 35% 30%, 45% 0, 100% 0, 100% 100%, 0 100%)"
                : "none",
              borderRadius: f.type === "folder" || f.type === "up" ? 1 : 1,
            }} />
            <span style={{
              opacity: f.type === "up" ? 0.5 : 1,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>{f.name}</span>
          </div>
        ))}
      </div>

      {/* status footer removed — merged into bottom status bar */}
    </div>
  );
}

// ============================================================
// Terminal — the main attraction
// ============================================================
function Prompt({ theme, path = "C:\\dev\\leyo", inline }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
      <span style={{ color: theme.promptUser }}>[VinX]</span>{" "}
      <span style={{ color: theme.promptPath }}>{path}</span>{" "}
      <span style={{ color: theme.promptArrow }}>{">"}</span>
      {inline ? " " : ""}
    </span>
  );
}

function Line({ children, style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.7,
      whiteSpace: "pre-wrap",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Vertical gradient bar separating prompt input from output
function PromptSeparator({ theme }) {
  return (
    <div style={{
      width: 2,
      alignSelf: "stretch",
      marginLeft: 6,
      marginRight: 12,
      borderRadius: 2,
      background: `linear-gradient(180deg, ${theme.c1}, ${theme.c3} 50%, ${theme.c2})`,
      opacity: 0.5,
      flexShrink: 0,
    }} />
  );
}

function Terminal({ theme }) {
  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursorOn((v) => !v), 550);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      flex: 1,
      background: "transparent",
      padding: "16px 22px 0",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Subtle gradient halo behind the active prompt area (bottom of terminal) */}
      <div style={{
        position: "absolute",
        left: "-30%",
        right: "-10%",
        bottom: "-60%",
        height: "140%",
        background: `radial-gradient(ellipse at 30% 75%, ${theme.c3}1c 0%, ${theme.c1}10 25%, ${theme.c2}06 50%, transparent 75%)`,
        pointerEvents: "none",
        filter: "blur(40px)",
      }} />
      {/* welcome */}
      <div className="leyo-line leyo-line-0" style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: 1.75,
        color: theme.textMuted,
        marginBottom: 10,
        paddingLeft: 14,
        position: "relative",
        zIndex: 2,
      }}>
        Leyo Shell v1.7 · type 'help' for commands · {new Date().toLocaleDateString("fr-FR")}
      </div>

      {/* command 1: ls */}
      <div className="leyo-line leyo-line-1" style={{ display: "flex", marginBottom: 12, position: "relative", zIndex: 2 }}>
        <PromptSeparator theme={theme} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75 }}>
            <Prompt theme={theme} inline /><span style={{ color: theme.text }}>ls</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", marginTop: 2, color: theme.text }}>
            <span style={{ color: theme.folder }}>src/        frontend/   build/</span>{"\n"}
            <span style={{ color: theme.code }}>main.go     parser.go   executor.go   history.go</span>{"\n"}
            <span style={{ color: theme.c4 }}>wails.json</span><span style={{ color: theme.textDim }}>  go.mod      go.sum</span>{"\n"}
            <span style={{ color: theme.exec }}>Leyo.exe    LeyoSetup.exe</span>{"\n"}
            <span style={{ color: theme.md }}>README.md</span><span style={{ color: theme.file }}>   LICENSE     .gitignore</span>
          </div>
        </div>
      </div>

      {/* command 2: typo + Levenshtein suggestion */}
      <div className="leyo-line leyo-line-2" style={{ display: "flex", marginBottom: 12, position: "relative", zIndex: 2 }}>
        <PromptSeparator theme={theme} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75 }}>
            <Prompt theme={theme} inline /><span style={{ color: theme.text }}>mkdor test</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75, color: theme.error, marginTop: 2 }}>
            ✕ <span style={{ color: theme.error }}>'mkdor'</span> n'est pas reconnu comme commande.
          </div>
          <div style={{
            margin: "8px 0 0",
            padding: "10px 14px",
            background: theme.panel,
            border: `1px solid ${theme.borderStrong}`,
            borderLeft: `2px solid ${theme.accent}`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            maxWidth: 560,
          }}>
            <span style={{ color: theme.textDim, fontSize: 12 }}>Vouliez-vous dire</span>
            <span style={{ color: theme.accent, fontWeight: 500 }}>mkdir</span>
            <span style={{ color: theme.textMuted }}>?</span>
            <div style={{ flex: 1 }} />
            <button style={{ background: "transparent", border: `1px solid ${theme.borderStrong}`, color: theme.text, padding: "4px 12px", borderRadius: 3, fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: 0.4, cursor: "pointer" }}>Exécuter ↵</button>
            <button style={{ background: "transparent", border: "none", color: theme.textDim, padding: "4px 6px", fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: 0.4, cursor: "pointer" }}>Ignorer</button>
          </div>
        </div>
      </div>

      {/* command 3: cat (preview v1.6) */}
      <div className="leyo-line leyo-line-3" style={{ display: "flex", marginBottom: 12, position: "relative", zIndex: 2 }}>
        <PromptSeparator theme={theme} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75 }}>
            <Prompt theme={theme} inline /><span style={{ color: theme.text }}>cat go.mod</span>
          </div>
          <div style={{
            margin: "6px 0 0",
            padding: "10px 14px",
            background: theme.panelStrong,
            border: `1px solid ${theme.border}`,
            borderRadius: 3,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12.5,
            lineHeight: 1.7,
            maxWidth: 560,
          }}>
            <div style={{ color: theme.textMuted, fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>
              ── go.mod · 8 lignes ───────────
            </div>
            <div><span style={{ color: theme.code }}>module</span> <span style={{ color: theme.text }}>github.com/vinx/leyo</span></div>
            <div style={{ height: 6 }} />
            <div><span style={{ color: theme.code }}>go</span> <span style={{ color: theme.accent }}>1.22</span></div>
            <div style={{ height: 6 }} />
            <div><span style={{ color: theme.code }}>require</span> <span style={{ color: theme.textDim }}>(</span></div>
            <div style={{ paddingLeft: 16, color: theme.text }}>
              github.com/wailsapp/wails/v2 <span style={{ color: theme.accent }}>v2.8.0</span>
            </div>
            <div style={{ paddingLeft: 16, color: theme.text }}>
              github.com/charmbracelet/bubbletea <span style={{ color: theme.accent }}>v0.25.0</span>
            </div>
            <div><span style={{ color: theme.textDim }}>)</span></div>
          </div>
        </div>
      </div>

      {/* current line: ghost text */}
      <div className="leyo-line leyo-line-4" style={{ display: "flex", position: "relative", zIndex: 2 }}>
        <PromptSeparator theme={theme} />
        <div style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.75 }}>
          <Prompt theme={theme} inline />
          <span style={{ color: theme.text }}>mkd</span>
          <span style={{ color: theme.textMuted, fontStyle: "italic" }}>ir new-feature</span>
          <span style={{
            display: "inline-block",
            width: 8,
            height: 16,
            background: theme.text,
            marginLeft: 1,
            verticalAlign: "text-bottom",
            opacity: cursorOn ? 0.85 : 0,
          }} />
          <span style={{
            marginLeft: 14,
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            color: theme.textMuted,
            letterSpacing: 0.6,
          }}>
            → ou TAB pour accepter
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }} />
    </div>
  );
}

// ============================================================
// Main shell window
// ============================================================
function ShellWindow({ themeKey = "velvet", width = 1100, height = 700 }) {
  const theme = THEMES[themeKey];
  return (
    <div style={{
      width,
      height,
      position: "relative",
      borderRadius: 8,
      filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
    }}>
      {/* Animated gradient border + entrance animations */}
      <style>{`
        @keyframes leyoBorderSpin-${themeKey} {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes leyoFadeUp-${themeKey} {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes leyoPolyIn-${themeKey} {
          0%   { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        .leyo-shell-${themeKey} { animation: leyoFadeUp-${themeKey} 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .leyo-shell-${themeKey} .leyo-poly-bg { animation: leyoPolyIn-${themeKey} 1200ms cubic-bezier(0.2, 0.8, 0.2, 1) 200ms both; transform-origin: center; }
        .leyo-shell-${themeKey} .leyo-line { animation: leyoFadeUp-${themeKey} 500ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .leyo-shell-${themeKey} .leyo-line-0 { animation-delay: 380ms; }
        .leyo-shell-${themeKey} .leyo-line-1 { animation-delay: 520ms; }
        .leyo-shell-${themeKey} .leyo-line-2 { animation-delay: 640ms; }
        .leyo-shell-${themeKey} .leyo-line-3 { animation-delay: 760ms; }
        .leyo-shell-${themeKey} .leyo-line-4 { animation-delay: 880ms; }
        .leyo-shell-${themeKey} .leyo-line-5 { animation-delay: 1000ms; }
        .leyo-shell-${themeKey} .leyo-line-6 { animation-delay: 1120ms; }
      `}</style>
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: 8,
        background: `linear-gradient(110deg, ${theme.c1}55, ${theme.c2}33, ${theme.c3}55, ${theme.c4}33, ${theme.c1}55)`,
        backgroundSize: "200% 100%",
        animation: `leyoBorderSpin-${themeKey} 14s linear infinite`,
        opacity: 0.7,
      }} />
      {/* inner shell, inset 1px to reveal animated border */}
      <div className={`leyo-shell-${themeKey}`} style={{
        position: "absolute",
        inset: 1,
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
        borderRadius: 7,
      }}>
      <PolyBackground theme={theme} themeKey={themeKey} />

      <TitleBar theme={theme} />
      <Tabs theme={theme} tabs={["leyo · main", "frontend", "tests"]} activeIdx={0} />

      {/* gradient strip under tabs */}
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, transparent, ${theme.c1} 20%, ${theme.c3} 50%, ${theme.c2} 80%, transparent)`,
        opacity: 0.5,
        position: "relative",
        zIndex: 2,
      }} />

      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1, minHeight: 0 }}>
        <Sidebar theme={theme} themeKey={themeKey} />
        <Terminal theme={theme} />
      </div>

      {/* status bar */}
      <div style={{
        height: 24,
        background: theme.bgDeep,
        borderTop: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 18,
        fontFamily: "Inter, sans-serif",
        fontSize: 10,
        color: theme.textMuted,
        letterSpacing: 0.6,
        position: "relative",
        zIndex: 2,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 5, height: 5, background: theme.success, borderRadius: "50%",
          }} />
          ready
        </span>
        <span style={{ color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5 }}>C:\dev\leyo</span>
        <div style={{ flex: 1 }} />
        <span>UTF-8</span>
        <span>{theme.name}</span>
        <span>16 items</span>
        <span style={{ color: theme.textDim }}>VinX · v1.7</span>
      </div>
      </div>
    </div>
  );
}

window.ShellWindow = ShellWindow;
window.LEYO_THEMES = THEMES;
