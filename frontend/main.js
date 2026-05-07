// ── Parser ANSI → HTML ────────────────────────────────────────
// Convertit les séquences d'échappement ANSI (couleurs, gras, etc.)
// en spans HTML stylisés pour l'affichage dans le div output.
(function() {
  const ANSI_COLORS_FG = [
    '#21222C','#FF5555','#50FA7B','#F1FA8C',
    '#BD93F9','#FF79C6','#8BE9FD','#F8F8F2',
    // bright
    '#6272A4','#FF6E6E','#69FF94','#FFFFA5',
    '#D6ACFF','#FF92DF','#A4FFFF','#FFFFFF',
  ];
  const ANSI_COLORS_BG = ANSI_COLORS_FG;

  window.ansiToHtml = function(raw) {
    let out = '';
    let i   = 0;
    let fg  = null, bg = null, bold = false, italic = false, underline = false;
    const openSpan = () => {
      let style = '';
      if (fg) style += `color:${fg};`;
      if (bg) style += `background:${bg};`;
      if (bold)      style += 'font-weight:700;';
      if (italic)    style += 'font-style:italic;';
      if (underline) style += 'text-decoration:underline;';
      return style ? `<span style="${style}">` : '<span>';
    };
    let inSpan = false;

    const flush = (text) => {
      if (!text) return;
      const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if (fg || bg || bold || italic || underline) {
        out += openSpan() + escaped + '</span>';
      } else {
        out += escaped;
      }
    };

    while (i < raw.length) {
      if (raw[i] === '\x1b' && raw[i+1] === '[') {
        // Lit le code SGR
        let j = i + 2;
        while (j < raw.length && raw[j] !== 'm' && raw[j] !== 'A' &&
               raw[j] !== 'B' && raw[j] !== 'C' && raw[j] !== 'D' &&
               raw[j] !== 'H' && raw[j] !== 'J' && raw[j] !== 'K') j++;

        if (raw[j] === 'm') {
          const params = raw.slice(i+2, j).split(';').map(Number);
          let p = 0;
          while (p < params.length) {
            const n = params[p];
            if (n === 0)        { fg = null; bg = null; bold = false; italic = false; underline = false; }
            else if (n === 1)   bold = true;
            else if (n === 3)   italic = true;
            else if (n === 4)   underline = true;
            else if (n === 22)  bold = false;
            else if (n === 23)  italic = false;
            else if (n === 24)  underline = false;
            else if (n >= 30 && n <= 37)  fg = ANSI_COLORS_FG[n-30];
            else if (n === 39)  fg = null;
            else if (n >= 40 && n <= 47)  bg = ANSI_COLORS_BG[n-40];
            else if (n === 49)  bg = null;
            else if (n >= 90 && n <= 97)  fg = ANSI_COLORS_FG[n-90+8];
            else if (n >= 100 && n <= 107) bg = ANSI_COLORS_BG[n-100+8];
            else if (n === 38 && params[p+1] === 5) { fg = `var(--c${params[p+2]})`; p+=2; }
            else if (n === 48 && params[p+1] === 5) { bg = `var(--c${params[p+2]})`; p+=2; }
            else if (n === 38 && params[p+1] === 2) { fg = `rgb(${params[p+2]},${params[p+3]},${params[p+4]})`; p+=4; }
            else if (n === 48 && params[p+1] === 2) { bg = `rgb(${params[p+2]},${params[p+3]},${params[p+4]})`; p+=4; }
            p++;
          }
        }
        i = j + 1;
      } else if (raw[i] === '\r') {
        i++;
      } else if (raw[i] === '\n') {
        flush('\n');
        i++;
      } else {
        let j = i;
        while (j < raw.length && raw[j] !== '\x1b' && raw[j] !== '\r' && raw[j] !== '\n') j++;
        flush(raw.slice(i, j));
        i = j;
      }
    }
    return out;
  };
})();

// ── État global ───────────────────────────────────────────────
let history = [];
let splitActive = false;
let activePaneId = 1;

const paneState = {
  1: { historyIndex: 0, ghostSuggestion: '', tabCompletions: [], tabCompletionIdx: 0 },
  2: { historyIndex: 0, ghostSuggestion: '', tabCompletions: [], tabCompletionIdx: 0 }
};

// ── Thèmes ────────────────────────────────────────────────────
const LEYO_THEMES = {
  velvet: {
    key: 'velvet', name: 'Velvet Night',
    bg: '#0d0d14', bgDeep: '#08080d',
    panel: 'rgba(255,255,255,0.025)', panelStrong: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)',
    text: '#e8e8f0', textDim: '#8a8a9a', textMuted: '#5a5a6a',
    c1: '#9ad8ff', c2: '#a6b3ff', c3: '#cba8ff', c4: '#f0a8d8',
    accent: '#cba8ff', success: '#a8e0c0', error: '#f0a8b8',
    folder: '#9ad8ff', file: '#c8c8d8', code: '#a6b3ff', exec: '#f0a8d8', md: '#a8e0c0',
  },
  dusk: {
    key: 'dusk', name: 'Dusk',
    bg: '#16101a', bgDeep: '#0c0810',
    panel: 'rgba(255,255,255,0.028)', panelStrong: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,200,180,0.07)', borderStrong: 'rgba(255,200,180,0.12)',
    text: '#f0e6e0', textDim: '#a89890', textMuted: '#6a5a60',
    c1: '#ffc9a8', c2: '#ffaab0', c3: '#d4a8e0', c4: '#a8aae0',
    accent: '#ffaab0', success: '#c8e0a8', error: '#ffaab0',
    folder: '#ffc9a8', file: '#e0d4cc', code: '#d4a8e0', exec: '#ffaab0', md: '#c8e0a8',
  },
  amber: {
    key: 'amber', name: 'Amber',
    bg: '#161108', bgDeep: '#0c0905',
    panel: 'rgba(255,220,170,0.025)', panelStrong: 'rgba(255,220,170,0.04)',
    border: 'rgba(255,200,140,0.07)', borderStrong: 'rgba(255,200,140,0.12)',
    text: '#f0e4cc', textDim: '#a89878', textMuted: '#6a5e44',
    c1: '#f0c878', c2: '#e8a868', c3: '#d49858', c4: '#c0e0b8',
    accent: '#f0c878', success: '#c0e0b8', error: '#e8a890',
    folder: '#f0c878', file: '#e0d0a8', code: '#e8a868', exec: '#d49858', md: '#c0e0b8',
  },
};

let currentThemeName = 'Velvet Night';

function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--bg',            t.bg);
  r.setProperty('--bg-deep',       t.bgDeep);
  r.setProperty('--panel',         t.panel);
  r.setProperty('--panel-strong',  t.panelStrong);
  r.setProperty('--border',        t.border);
  r.setProperty('--border-strong', t.borderStrong);
  r.setProperty('--text',          t.text);
  r.setProperty('--text-dim',      t.textDim);
  r.setProperty('--text-muted',    t.textMuted);
  r.setProperty('--c1',            t.c1);
  r.setProperty('--c2',            t.c2);
  r.setProperty('--c3',            t.c3);
  r.setProperty('--c4',            t.c4);
  r.setProperty('--accent',        t.accent);
  r.setProperty('--success',       t.success);
  r.setProperty('--error',         t.error);
  r.setProperty('--folder',        t.folder);
  r.setProperty('--file-color',    t.file);
  r.setProperty('--code-color',    t.code);
  r.setProperty('--exec-color',    t.exec);
  r.setProperty('--md-color',      t.md);
  // compat aliases
  r.setProperty('--cyan',    t.c1);
  r.setProperty('--blue',    t.c2);
  r.setProperty('--violet',  t.accent);
  r.setProperty('--magenta', t.c4);
  r.setProperty('--bg2',     t.bgDeep);
  r.setProperty('--bg3',     t.bg);
  r.setProperty('--text-mute', t.textMuted);
  r.setProperty('--seg-user', hexAlpha(t.c1, 0.08));
  r.setProperty('--seg-path', hexAlpha(t.c2, 0.07));
  r.setProperty('--seg-git',  hexAlpha(t.c3, 0.08));
  r.setProperty('--seg-ok',   hexAlpha(t.success, 0.07));
  r.setProperty('--seg-fail', hexAlpha(t.error, 0.12));
  currentThemeName = t.name;
  localStorage.setItem('leyo-theme', t.key);
  const el = document.getElementById('statusTheme');
  if (el) el.textContent = t.name;
  renderThemeCards();
  window.LeyoEditor?.reloadTheme();
  updateXtermTheme(t);
}

function updateXtermTheme(t) {
  const xtermTheme = {
    background:   t.bg,
    foreground:   t.text,
    cursor:       t.accent,
    cursorAccent: t.bg,
    black: '#21222C', red: t.error,    green: t.success, yellow: t.c4,
    blue:  t.c2,      magenta: t.c3,   cyan: t.c1,       white: t.text,
    brightBlack: t.textMuted, brightRed: t.error, brightGreen: t.success,
    brightYellow: t.c4, brightBlue: t.c2, brightMagenta: t.c3,
    brightCyan: t.c1,   brightWhite: '#ffffff',
  };
  for (const inst of Object.values(ptyInstances)) {
    if (inst?.term) inst.term.options.theme = xtermTheme;
  }
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function loadThemes() {
  const key = localStorage.getItem('leyo-theme') || 'velvet';
  if (key === 'custom') {
    const custom = loadCustomTheme();
    if (custom) { applyTheme(custom); renderThemeGrid(); return; }
  }
  applyTheme(LEYO_THEMES[key] || LEYO_THEMES.velvet);
  renderThemeGrid();
}

// ── Thème custom ──────────────────────────────────────────────
const CUSTOM_THEME_DEFAULTS = {
  key: 'custom', name: 'Custom',
  bg: '#0d0d14', bgDeep: '#08080d',
  panel: 'rgba(255,255,255,0.025)', panelStrong: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.06)', borderStrong: 'rgba(255,255,255,0.10)',
  text: '#e8e8f0', textDim: '#8a8a9a', textMuted: '#5a5a6a',
  c1: '#9ad8ff', c2: '#a6b3ff', c3: '#cba8ff', c4: '#f0a8d8',
  accent: '#cba8ff', success: '#a8e0c0', error: '#f0a8b8',
  folder: '#9ad8ff', file: '#c8c8d8', code: '#a6b3ff', exec: '#f0a8d8', md: '#a8e0c0',
};

function loadCustomTheme() {
  try {
    const raw = localStorage.getItem('leyo-custom-theme');
    return raw ? { ...CUSTOM_THEME_DEFAULTS, ...JSON.parse(raw) } : null;
  } catch { return null; }
}

function saveCustomTheme(t) {
  localStorage.setItem('leyo-custom-theme', JSON.stringify(t));
}

const CUSTOM_FIELDS = [
  { id: 'ct-bg',      key: 'bg' },
  { id: 'ct-bgDeep',  key: 'bgDeep' },
  { id: 'ct-text',    key: 'text' },
  { id: 'ct-accent',  key: 'accent' },
  { id: 'ct-c1',      key: 'c1' },
  { id: 'ct-c2',      key: 'c2' },
  { id: 'ct-c3',      key: 'c3' },
  { id: 'ct-success', key: 'success' },
  { id: 'ct-error',   key: 'error' },
];

function initCustomTheme() {
  const current = loadCustomTheme() || CUSTOM_THEME_DEFAULTS;

  // Populate color pickers
  CUSTOM_FIELDS.forEach(({ id, key }) => {
    const inp = document.getElementById(id);
    const lbl = document.getElementById(id + '-lbl');
    if (!inp) return;
    inp.value = current[key] || '#000000';
    if (lbl) lbl.textContent = current[key] || '';
    inp.addEventListener('input', () => { if (lbl) lbl.textContent = inp.value; });
  });

  document.getElementById('ctApplyBtn')?.addEventListener('click', () => {
    const overrides = {};
    CUSTOM_FIELDS.forEach(({ id, key }) => {
      const v = document.getElementById(id)?.value;
      if (v) overrides[key] = v;
    });
    // Derive dependent colors from the picked ones
    const t = {
      ...CUSTOM_THEME_DEFAULTS,
      ...overrides,
      // keep visual consistency
      c4: overrides.c3 || CUSTOM_THEME_DEFAULTS.c4,
      folder: overrides.c1 || CUSTOM_THEME_DEFAULTS.folder,
      file: overrides.text || CUSTOM_THEME_DEFAULTS.file,
      code: overrides.c2 || CUSTOM_THEME_DEFAULTS.code,
      exec: overrides.error || CUSTOM_THEME_DEFAULTS.exec,
      md: overrides.success || CUSTOM_THEME_DEFAULTS.md,
      textDim: overrides.text ? overrides.text + 'aa' : CUSTOM_THEME_DEFAULTS.textDim,
      textMuted: overrides.text ? overrides.text + '66' : CUSTOM_THEME_DEFAULTS.textMuted,
    };
    saveCustomTheme(t);
    applyTheme(t);
    // Close settings
    document.getElementById('settingsModal').style.display = 'none';
  });

  document.getElementById('ctResetBtn')?.addEventListener('click', () => {
    localStorage.removeItem('leyo-custom-theme');
    CUSTOM_FIELDS.forEach(({ id, key }) => {
      const inp = document.getElementById(id);
      const lbl = document.getElementById(id + '-lbl');
      if (inp) inp.value = CUSTOM_THEME_DEFAULTS[key];
      if (lbl) lbl.textContent = CUSTOM_THEME_DEFAULTS[key];
    });
  });
}

function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const allThemes = Object.values(LEYO_THEMES);
  // Add Custom slot
  const custom = loadCustomTheme() || CUSTOM_THEME_DEFAULTS;
  allThemes.push(custom);

  allThemes.forEach(t => {
    const card = document.createElement('div');
    const isCustom = t.key === 'custom';
    card.className = 'theme-card' + (t.name === currentThemeName ? ' active' : '') + (isCustom ? ' theme-card-custom' : '');
    card.dataset.name = t.name;
    card.innerHTML = `
      <div class="theme-card-preview">
        <div class="theme-swatch" style="background:${t.c1}"></div>
        <div class="theme-swatch" style="background:${t.c3}"></div>
        <div class="theme-swatch" style="background:${t.c2}"></div>
      </div>
      <div class="theme-card-name">${t.name}${isCustom ? ' <span class="theme-edit-hint">⚙ éditer dans Settings</span>' : ''}</div>
    `;
    card.addEventListener('click', () => applyTheme(t));
    grid.appendChild(card);
  });
}

function renderThemeCards() {
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.name === currentThemeName);
  });
}

// ── Status bar ────────────────────────────────────────────────
function updateStatusPath(path) {
  const sp = document.getElementById('statusPath');
  if (sp) sp.textContent = path;
  const tp = document.getElementById('titlebarPath');
  if (tp) tp.textContent = path;
}

function updateStatusCount(n) {
  const el = document.getElementById('statusCount');
  if (el) el.textContent = `${n} items`;
  const sc = document.getElementById('sidebarCount');
  if (sc) sc.textContent = n;
}

document.getElementById('themeBtn').addEventListener('click', () => {
  document.getElementById('themeModal').style.display = 'flex';
});

document.getElementById('themeModalClose').addEventListener('click', () => {
  document.getElementById('themeModal').style.display = 'none';
});

document.getElementById('themeModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('themeModal')) {
    document.getElementById('themeModal').style.display = 'none';
  }
});

// ── Resize sidebar ────────────────────────────────────────────
function initSidebarResize() {
  const handle  = document.getElementById('sidebarResizeHandle');
  const sidebar = document.getElementById('sidebar');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.min(400, Math.max(120, startWidth + e.clientX - startX));
    sidebar.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// ── Système d'onglets ─────────────────────────────────────────
// Tab shell :   { id, label, type:'shell',  output, path }
// Tab éditeur : { id, label, type:'editor', filename, sourcePaneId, savedContent, hasUnsavedChanges }

let tabs = [];
let activeTab = null;
let tabCounter = 0;

function createTab() {
  const id = ++tabCounter;
  // Each new shell tab inherits the current tab's path so it starts in the same dir
  const inheritPath = activeTab?.type === 'shell' ? activeTab.path : 'C:\\';
  const tab = { id, label: `Shell ${id}`, type: 'shell', output: '', path: inheritPath };
  tabs.push(tab);
  renderTabs();
  switchTab(id);
  return tab;
}

function renderTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = '';
  tabs.forEach(t => {
    const div = document.createElement('div');
    const isEditor = t.type === 'editor';
    const isActive = t.id === activeTab?.id;
    div.className = 'tab' + (isActive ? ' active' : '') + (isEditor ? ' tab-editor' : '');

    const label = isEditor ? `✎ ${t.label}` : t.label;
    const isModified = isEditor
      ? (isActive ? window.LeyoEditor?.isModified() : t.hasUnsavedChanges)
      : false;
    const modifiedDot = isModified ? '<span class="tab-modified">●</span>' : '';

    div.innerHTML = `
      <span class="tab-indicator"></span>
      <span class="tab-label" onclick="switchTab(${t.id})">${label}${modifiedDot}</span>
      ${tabs.length > 1 ? `<span class="tab-close" onclick="closeTab(event,${t.id})">✕</span>` : ''}
    `;
    container.appendChild(div);
  });
}

async function switchTab(id) {
  // Sauvegarde de l'état de l'onglet courant
  if (activeTab?.type === 'shell') {
    activeTab.output = document.getElementById('output1').innerHTML;
    activeTab.path   = document.getElementById('segPath1').textContent;
  } else if (activeTab?.type === 'editor' && window.LeyoEditor) {
    activeTab.savedContent      = window.LeyoEditor.getContent();
    activeTab.hasUnsavedChanges = window.LeyoEditor.isModified();
    window.LeyoEditor.destroyView();
  }

  activeTab = tabs.find(t => t.id === id);
  if (!activeTab) return;
  renderTabs();

  if (activeTab.type === 'shell') {
    document.getElementById('terminalsArea').style.display = '';
    document.getElementById('editorArea').style.display   = 'none';

    document.getElementById('output1').innerHTML          = activeTab.output;
    document.getElementById('segPath1').textContent       = activeTab.path;
    document.getElementById('sidebarPath').textContent    = activeTab.path;
    updateStatusPath(activeTab.path);
    document.getElementById('commandInput1').value        = '';
    await updateGhost(1, '');
    // Sync Go process working dir to this tab's path (isolated per-tab)
    await window.go.main.App.RunCommandAt(activeTab.path, '');
    await refreshFiles();
    await updateGitBranch(1);
    document.getElementById('commandInput1').focus();

  } else if (activeTab.type === 'editor') {
    document.getElementById('terminalsArea').style.display = 'none';
    document.getElementById('editorArea').style.display   = 'flex';

    if (window.LeyoEditor) {
      if (activeTab.savedContent !== null) {
        window.LeyoEditor.setContent(
          activeTab.sourcePaneId,
          activeTab.filename,
          activeTab.savedContent,
          activeTab.hasUnsavedChanges
        );
      } else {
        await window.LeyoEditor.loadFile(activeTab.sourcePaneId, activeTab.filename);
      }
    }
  }
  saveSession();
}

function closeTab(e, id) {
  e.stopPropagation();
  if (tabs.length <= 1) return;
  const tab = tabs.find(t => t.id === id);
  if (tab?.type === 'editor') {
    const isModified = tab.id === activeTab?.id
      ? window.LeyoEditor?.isModified()
      : tab.hasUnsavedChanges;
    if (isModified) {
      const ok = window.confirm(`"${tab.filename}" a des modifications non sauvegardées.\nFermer quand même ?`);
      if (!ok) return;
    }
    // Détruire la vue si c'est l'onglet actif
    if (tab.id === activeTab?.id) window.LeyoEditor?.destroyView();
  }
  tabs = tabs.filter(t => t.id !== id);
  if (activeTab?.id === id) switchTab(tabs[tabs.length - 1].id);
  else renderTabs();
  saveSession();
}

// Fermeture de l'onglet éditeur actif sans re-confirmer (Ctrl+Q a déjà confirmé)
function forceCloseEditorTab() {
  const tab = activeTab;
  if (!tab || tab.type !== 'editor') return;
  tabs = tabs.filter(t => t.id !== tab.id);
  if (tabs.length === 0) {
    // Crée un onglet shell si plus rien
    const id = ++tabCounter;
    tabs.push({ id, label: `Shell ${id}`, type: 'shell', output: '', path: 'C:\\' });
  }
  switchTab(tabs[tabs.length - 1].id);
}

document.getElementById('tabAdd').addEventListener('click', () => createTab());

// ── Split view ────────────────────────────────────────────────
async function toggleSplit() {
  splitActive = !splitActive;
  const pane2   = document.getElementById('pane2');
  const divider = document.getElementById('splitDivider');
  const btn     = document.getElementById('splitBtn');

  if (splitActive) {
    pane2.style.display   = 'flex';
    divider.style.display = 'block';
    btn.classList.add('active');
    setActivePane(2);
    const path = await window.go.main.App.GetCurrentPath();
    document.getElementById('segPath2').textContent = path;
    addLine(2, 'Leyo Shell  1.10', 'out-welcome');
    addLine(2, 'Ctrl+D pour fermer le split', 'out-muted');
    addLine(2, '', 'out-normal');
    await updateGitBranch(2);
    updateStatus(2, true);
    document.getElementById('commandInput2').focus();
  } else {
    pane2.style.display   = 'none';
    divider.style.display = 'none';
    btn.classList.remove('active');
    setActivePane(1);
    document.getElementById('commandInput1').focus();
  }
}

function setActivePane(id) {
  activePaneId = id;
  document.getElementById('pane1').classList.toggle('active-pane', id === 1);
  document.getElementById('pane2').classList.toggle('active-pane', id === 2 && splitActive);
}

document.getElementById('pane1').addEventListener('mousedown', () => setActivePane(1));
document.getElementById('pane2').addEventListener('mousedown', () => setActivePane(2));
document.getElementById('splitBtn').addEventListener('click', toggleSplit);

// ── Éditeur — ouverture en onglet ─────────────────────────────
async function openEditorTab(paneId, filename) {
  let attempts = 0;
  while (!window.LeyoEditor && attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    attempts++;
  }
  if (!window.LeyoEditor) {
    addLine(paneId, '❌ Éditeur indisponible — vérifiez votre connexion internet (CodeMirror CDN)', 'out-error');
    return;
  }

  // Configure le callback de fermeture
  window.LeyoEditor.onClose = forceCloseEditorTab;

  // Si un onglet pour ce fichier est déjà ouvert, y basculer
  const fn = filename.trim();
  const existing = tabs.find(t => t.type === 'editor' && t.filename === fn);
  if (existing) { await switchTab(existing.id); return; }

  const id = ++tabCounter;
  const shortName = fn.split(/[/\\]/).pop();
  const tab = {
    id,
    label: shortName,
    type: 'editor',
    filename: fn,
    sourcePaneId: paneId,
    savedContent: null,
    hasUnsavedChanges: false,
  };
  tabs.push(tab);
  renderTabs();
  await switchTab(id);
}

async function openEditor(paneId, filename) {
  await openEditorTab(paneId, filename);
}

function closeEditor() {
  window.LeyoEditor?.close();
}

document.getElementById('editorCloseBtn')?.addEventListener('click', closeEditor);

// ── Système PTY réel (xterm.js + ConPTY) ─────────────────────
const ptyInstances = { 1: null, 2: null };

const PTY_META = {
  'python':     { icon: '🐍', label: 'Python'     },
  'python3':    { icon: '🐍', label: 'Python'     },
  'py':         { icon: '🐍', label: 'Python'     },
  'node':       { icon: '⬡',  label: 'Node.js'   },
  'ssh':        { icon: '🔒', label: 'SSH'        },
  'powershell': { icon: '⚡', label: 'PowerShell' },
  'pwsh':       { icon: '⚡', label: 'PowerShell' },
  'mysql':      { icon: '🐬', label: 'MySQL'      },
  'psql':       { icon: '🐘', label: 'PostgreSQL' },
  'ipython':    { icon: '🔬', label: 'IPython'    },
  'wsl':        { icon: '🐧', label: 'WSL'        },
  'bash':       { icon: '$',  label: 'Bash'       },
  'vim':        { icon: '◆',  label: 'Vim'        },
  'nvim':       { icon: '◆',  label: 'Neovim'     },
  'htop':       { icon: '▪',  label: 'htop'       },
};

function getPTYMeta(command) {
  const lower = command.toLowerCase().split(' ')[0];
  return PTY_META[lower] || { icon: '❯', label: command };
}

// Attend que LeyoXterm soit chargé (bundle defer)
async function waitXterm() {
  for (let i = 0; i < 20; i++) {
    if (window.LeyoXterm?.Terminal) return true;
    await new Promise(r => setTimeout(r, 150));
  }
  return false;
}

async function openPTY(paneId, command) {
  const sessionId = `pty-${paneId}-${Date.now()}`;
  const meta      = getPTYMeta(command);

  // Affiche le conteneur PTY, cache l'output normal
  const outputEl    = document.getElementById(`output${paneId}`);
  const ptyEl       = document.getElementById(`ptyContainer${paneId}`);
  const ptyTermEl   = document.getElementById(`ptyTerm${paneId}`);
  const ptyTitleEl  = document.getElementById(`ptyTitle${paneId}`);

  outputEl.style.display  = 'none';
  ptyEl.style.display     = 'flex';
  ptyTitleEl.textContent  = `${meta.icon}  ${meta.label}`;

  // Vérifie que xterm.js est dispo
  const xtermOk = await waitXterm();
  if (!xtermOk) {
    addLine(paneId, `❌ xterm.js non disponible`, 'out-error');
    outputEl.style.display = '';
    ptyEl.style.display    = 'none';
    return;
  }

  const { Terminal, FitAddon, WebLinksAddon } = window.LeyoXterm;

  // Crée le terminal xterm.js
  const activeThemeKey = localStorage.getItem('leyo-theme') || 'velvet';
  const at = LEYO_THEMES[activeThemeKey] || LEYO_THEMES.velvet;
  const s  = loadSettings();
  const term = new Terminal({
    fontFamily: s.fontFamily + ", 'Cascadia Code', Consolas, monospace",
    fontSize:   s.fontSize,
    theme: {
      background:   at.bg,     foreground:   at.text,
      cursor:       at.accent, cursorAccent: at.bg,
      black: '#21222C', red: at.error,   green: at.success, yellow: at.c4,
      blue:  at.c2,     magenta: at.c3,  cyan:  at.c1,      white: at.text,
      brightBlack: at.textMuted, brightRed: at.error, brightGreen: at.success,
      brightYellow: at.c4, brightBlue: at.c2, brightMagenta: at.c3,
      brightCyan: at.c1,   brightWhite: '#ffffff',
    },
    allowTransparency: true,
    cursorBlink: true,
    scrollback: s.scrollback,
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  // Monte dans le DOM
  ptyTermEl.innerHTML = '';
  term.open(ptyTermEl);
  fitAddon.fit();

  // Stocke l'instance
  ptyInstances[paneId] = { term, fitAddon, sessionId };

  // Obtient les dimensions après fit
  const cols = term.cols || 120;
  const rows = term.rows || 30;

  // Démarre la session ConPTY côté Go
  const errMsg = await window.go.main.App.StartPTYSession(sessionId, command, cols, rows);
  if (errMsg) {
    addLine(paneId, `❌ PTY: ${errMsg}`, 'out-error');
    outputEl.style.display = '';
    ptyEl.style.display    = 'none';
    return;
  }

  // Reçoit les données du PTY → affiche dans xterm.js
  window.runtime.EventsOn(`pty:data:${sessionId}`, (data) => {
    term.write(data);
  });

  // Quand le process se termine
  window.runtime.EventsOn(`pty:exit:${sessionId}`, () => {
    window.runtime.EventsOff(`pty:data:${sessionId}`);
    window.runtime.EventsOff(`pty:exit:${sessionId}`);
    closePTY(paneId);
  });

  // Input clavier → envoyé au PTY
  term.onData(async (data) => {
    await window.go.main.App.WriteShell(sessionId, data);
  });

  // Resize quand le conteneur change de taille
  const resizeObs = new ResizeObserver(() => {
    fitAddon.fit();
    window.go.main.App.ResizeShell(sessionId, term.cols, term.rows);
  });
  resizeObs.observe(ptyTermEl);
  ptyInstances[paneId].resizeObs = resizeObs;

  // Focus immédiat
  term.focus();
}

async function closePTY(paneId) {
  const instance = ptyInstances[paneId];
  if (instance) {
    window.runtime.EventsOff(`pty:data:${instance.sessionId}`);
    window.runtime.EventsOff(`pty:exit:${instance.sessionId}`);
    instance.resizeObs?.disconnect();
    instance.term.dispose();
    await window.go.main.App.StopShell(instance.sessionId);
    ptyInstances[paneId] = null;
  }
  document.getElementById(`output${paneId}`).style.display       = '';
  document.getElementById(`ptyContainer${paneId}`).style.display = 'none';
  document.getElementById(`commandInput${paneId}`).focus();
  await refreshFiles();
  const newPath = await window.go.main.App.GetCurrentPath();
  document.getElementById(`segPath${paneId}`).textContent = newPath;
  await updateGitBranch(paneId);
  updateStatus(paneId, true);
}

// ── Prévisualisation ──────────────────────────────────────────
let currentPreviewFile = null;

function langClass(ext) {
  const map = {
    '.go':'lang-go', '.json':'lang-json', '.md':'lang-md',
    '.yml':'lang-yml', '.yaml':'lang-yml', '.html':'lang-html',
    '.css':'lang-css', '.js':'lang-js', '.ts':'lang-js'
  };
  return map[ext.toLowerCase()] || '';
}

async function previewFile(name, ext) {
  const panel = document.getElementById('previewPanel');
  const body  = document.getElementById('previewBody');
  if (currentPreviewFile === name) { closePreview(); return; }

  currentPreviewFile = name;
  document.getElementById('previewFilename').textContent = name;
  body.textContent = '…';
  body.className   = 'preview-body';
  panel.style.display = 'flex';

  document.querySelectorAll('.file-item').forEach(el =>
    el.classList.toggle('preview-active', el.dataset.name === name)
  );

  const result = await window.go.main.App.ReadFilePreview(name);
  document.getElementById('previewSize').textContent = result.size;

  if (result.error) {
    body.textContent = result.error;
    document.getElementById('previewLines').textContent = '';
    return;
  }

  if (result.binary === 'true') {
    document.getElementById('previewLines').textContent = '';
    body.innerHTML = `
      <div class="preview-binary">
        <span class="binary-icon">⚙</span>
        <span>Fichier binaire</span>
        <span style="font-size:10px;color:var(--text-mute)">${result.size}</span>
      </div>`;
  } else {
    document.getElementById('previewLines').textContent = `${result.lines} lignes`;
    body.className  = 'preview-body ' + langClass(ext);
    body.textContent = result.content;
  }
}

function closePreview() {
  document.getElementById('previewPanel').style.display = 'none';
  currentPreviewFile = null;
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('preview-active'));
}

document.getElementById('previewClose').addEventListener('click', closePreview);

// ── Recherche ─────────────────────────────────────────────────
const searchState = {
  1: { matches: [], current: 0, originalHTML: '' },
  2: { matches: [], current: 0, originalHTML: '' }
};

function openSearch(paneId) {
  const bar = document.getElementById(`searchBar${paneId}`);
  const inp = document.getElementById(`searchInput${paneId}`);
  bar.style.display = 'flex'; inp.focus(); inp.select();
}

function closeSearch(paneId) {
  const bar    = document.getElementById(`searchBar${paneId}`);
  const output = document.getElementById(`output${paneId}`);
  bar.style.display = 'none';
  if (searchState[paneId].originalHTML) {
    output.innerHTML = searchState[paneId].originalHTML;
    searchState[paneId].originalHTML = '';
    searchState[paneId].matches = [];
  }
  document.getElementById(`commandInput${paneId}`).focus();
}

function doSearch(paneId) {
  const query  = document.getElementById(`searchInput${paneId}`).value.trim();
  const output = document.getElementById(`output${paneId}`);
  const count  = document.getElementById(`searchCount${paneId}`);

  if (searchState[paneId].originalHTML) output.innerHTML = searchState[paneId].originalHTML;
  else searchState[paneId].originalHTML = output.innerHTML;

  if (!query) { count.textContent = ''; searchState[paneId].matches = []; return; }

  output.innerHTML = output.innerHTML.replace(
    new RegExp(`(${escapeRegex(query)})`, 'gi'),
    '<mark class="search-highlight">$1</mark>'
  );

  const marks = Array.from(output.querySelectorAll('.search-highlight'));
  searchState[paneId].matches = marks;
  searchState[paneId].current = 0;
  count.textContent = marks.length ? `1 / ${marks.length}` : '0 résultat';
  if (marks.length) highlightCurrent(paneId);
}

function highlightCurrent(paneId) {
  const s = searchState[paneId];
  s.matches.forEach((m, i) => m.classList.toggle('current', i === s.current));
  if (s.matches[s.current]) s.matches[s.current].scrollIntoView({ block: 'center' });
  document.getElementById(`searchCount${paneId}`).textContent =
    `${s.current + 1} / ${s.matches.length}`;
}

function searchNext(paneId) {
  const s = searchState[paneId];
  if (!s.matches.length) return;
  s.current = (s.current + 1) % s.matches.length;
  highlightCurrent(paneId);
}

function searchPrev(paneId) {
  const s = searchState[paneId];
  if (!s.matches.length) return;
  s.current = (s.current - 1 + s.matches.length) % s.matches.length;
  highlightCurrent(paneId);
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

[1, 2].forEach(id => {
  document.getElementById(`searchInput${id}`).addEventListener('input', () => doSearch(id));
  document.getElementById(`searchInput${id}`).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.shiftKey ? searchPrev(id) : searchNext(id); }
    if (e.key === 'Escape') closeSearch(id);
  });
  document.getElementById(`searchNext${id}`).addEventListener('click', () => searchNext(id));
  document.getElementById(`searchPrev${id}`).addEventListener('click', () => searchPrev(id));
  document.getElementById(`searchClose${id}`).addEventListener('click', () => closeSearch(id));
});

// ── Horloge ───────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('headerTime').textContent =
    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── Git branch ────────────────────────────────────────────────
async function updateGitBranch(paneId) {
  const branch = await window.go.main.App.GetGitBranch();
  const block  = document.getElementById(`segGitBlock${paneId}`);
  const arrow  = document.getElementById(`segGitArrow${paneId}`);
  const label  = document.getElementById(`segGit${paneId}`);
  if (branch) {
    label.textContent      = branch;
    block.style.display    = 'flex';
    arrow.style.display    = 'block';
  } else {
    block.style.display    = 'none';
    arrow.style.display    = 'none';
  }
}

// ── Statut ────────────────────────────────────────────────────
function updateStatus(paneId, ok) {
  const seg   = document.getElementById(`segStatusBlock${paneId}`);
  const dot   = document.getElementById(`segStatus${paneId}`);
  const arrow = seg.parentElement.querySelector('.seg-arrow-status');
  if (ok) {
    seg.className  = 'seg seg-status';
    dot.textContent = '●';
    if (arrow) arrow.className = 'seg-arrow seg-arrow-status';
  } else {
    seg.className  = 'seg seg-status fail';
    dot.textContent = '✕';
    if (arrow) arrow.className = 'seg-arrow seg-arrow-status fail';
  }
}

// ── Ghost text ────────────────────────────────────────────────
const knownCommands = [
  'ls','rm','cp','mv','cat','clear','pwd','mkdir','touch','cd',
  'dir','del','copy','move','type','cls','echo','find','help',
  'git','git add','git commit','git push','git pull','git status',
  'git clone','git checkout','git branch','git log','git diff',
  'go build','go run','go mod','go test','go get',
  'history','exit','alias','unalias','theme','nano','edit'
];

// Returns all completion candidates for the last token of `input`
async function getCompletions(input) {
  if (!input) return [];
  const spaceIdx = input.lastIndexOf(' ');
  const cmdPrefix = spaceIdx >= 0 ? input.slice(0, spaceIdx + 1) : '';
  const partial   = spaceIdx >= 0 ? input.slice(spaceIdx + 1)    : input;

  // For the first token with no space, also suggest known commands
  if (spaceIdx < 0) {
    const lower = partial.toLowerCase();
    const cmdMatches = knownCommands
      .filter(c => c.toLowerCase().startsWith(lower) && c.toLowerCase() !== lower)
      .map(c => c);
    if (cmdMatches.length) return cmdMatches;
  }

  // File/dir completion for last token
  const lastSep = Math.max(partial.lastIndexOf('\\'), partial.lastIndexOf('/'));
  let dirPart = '', filePart = partial;
  if (lastSep >= 0) { dirPart = partial.slice(0, lastSep + 1); filePart = partial.slice(lastSep + 1); }

  const isCd = /^cd\s/i.test(input);
  const files = await window.go.main.App.ListFilesAt(dirPart || '.');
  const candidates = files
    .filter(f => isCd ? f.IsDir : true)
    .filter(f => f.Name.toLowerCase().startsWith(filePart.toLowerCase()) && f.Name.toLowerCase() !== filePart.toLowerCase())
    .map(f => cmdPrefix + dirPart + f.Name + (f.IsDir ? '\\' : ''));

  return candidates;
}

async function completePathSuggestion(input) {
  if (!input) return '';
  const m = input.match(/^(cd\s+)(.*)$/i);
  if (!m) return '';
  const prefix = m[1], partial = m[2];
  const lastSep = Math.max(partial.lastIndexOf('\\'), partial.lastIndexOf('/'));
  let dirPrefix = '', toComplete = partial;
  if (lastSep !== -1) { dirPrefix = partial.slice(0, lastSep + 1); toComplete = partial.slice(lastSep + 1); }
  if (!toComplete) return '';
  const files = await window.go.main.App.ListFilesAt(dirPrefix || '.');
  const match = files.filter(f => f.IsDir).find(d =>
    d.Name.toLowerCase().startsWith(toComplete.toLowerCase()) &&
    d.Name.toLowerCase() !== toComplete.toLowerCase()
  );
  return match ? prefix + dirPrefix + match.Name : '';
}

function findGhostSuggestion(input) {
  if (!input) return '';
  const lower = input.toLowerCase();
  for (const cmd of knownCommands) {
    if (cmd.toLowerCase().startsWith(lower) && cmd.toLowerCase() !== lower) return cmd;
  }
  if (input.includes(' ')) {
    for (const cmd of history) {
      if (cmd.toLowerCase().startsWith(lower) && cmd.toLowerCase() !== lower) return cmd;
    }
  }
  return '';
}

async function updateGhost(paneId, input) {
  const ghost = document.getElementById(`ghostText${paneId}`);
  let suggestion = await completePathSuggestion(input);
  if (!suggestion) suggestion = findGhostSuggestion(input);
  paneState[paneId].ghostSuggestion = suggestion;
  if (suggestion && input) {
    ghost.setAttribute('data-ghost', suggestion.slice(input.length));
    ghost.style.paddingLeft = measureTextWidth(input) + 'px';
  } else {
    ghost.setAttribute('data-ghost', '');
  }
}

function measureTextWidth(text) {
  const canvas = measureTextWidth._canvas ||
    (measureTextWidth._canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  ctx.font = "13px 'Fira Code', 'JetBrains Mono', Consolas, monospace";
  return ctx.measureText(text).width;
}

// ── Paramètres ────────────────────────────────────────────────
const DEFAULT_SETTINGS = { fontSize: 13, lineHeight: 1.85, fontFamily: "'JetBrains Mono'", scrollback: 5000 };

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('leyo-settings') || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
  localStorage.setItem('leyo-settings', JSON.stringify(s));
}

function applySettings(s) {
  document.documentElement.style.setProperty('--font-size', s.fontSize + 'px');
  document.documentElement.style.setProperty('--line-height', s.lineHeight);
  document.documentElement.style.setProperty('--mono-font', s.fontFamily);
}

function initSettings() {
  const s = loadSettings();
  applySettings(s);

  const fsSlider  = document.getElementById('fontSizeSlider');
  const fsVal     = document.getElementById('fontSizeValue');
  const lhSlider  = document.getElementById('lineHeightSlider');
  const lhVal     = document.getElementById('lineHeightValue');
  const ffSelect  = document.getElementById('fontFamilySelect');
  const sbSlider  = document.getElementById('scrollbackSlider');
  const sbVal     = document.getElementById('scrollbackValue');

  fsSlider.value  = s.fontSize;    fsVal.textContent  = s.fontSize + 'px';
  lhSlider.value  = s.lineHeight;  lhVal.textContent  = s.lineHeight;
  ffSelect.value  = s.fontFamily;
  sbSlider.value  = s.scrollback;  sbVal.textContent  = s.scrollback;

  const update = () => {
    const ns = {
      fontSize:   Number(fsSlider.value),
      lineHeight: Number(lhSlider.value),
      fontFamily: ffSelect.value,
      scrollback: Number(sbSlider.value),
    };
    fsVal.textContent = ns.fontSize + 'px';
    lhVal.textContent = ns.lineHeight;
    sbVal.textContent = ns.scrollback;
    applySettings(ns);
    saveSettings(ns);
  };

  fsSlider.addEventListener('input', update);
  lhSlider.addEventListener('input', update);
  ffSelect.addEventListener('change', update);
  sbSlider.addEventListener('input', update);

  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'flex';
  });
  document.getElementById('settingsClose').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'none';
  });
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settingsModal'))
      document.getElementById('settingsModal').style.display = 'none';
  });
}

// ── Menu contextuel fichiers ──────────────────────────────────
let ctxTarget = null;   // { name, isDir }
let fileClipboard = null; // { name, mode: 'copy'|'cut' }

function showCtxMenu(e, name, isDir) {
  e.preventDefault();
  ctxTarget = { name, isDir };
  const menu = document.getElementById('ctxMenu');
  document.getElementById('ctxOpen').textContent = isDir ? 'Naviguer ici' : 'Ouvrir';
  document.getElementById('ctxPaste').dataset.empty = fileClipboard ? 'false' : 'true';
  menu.style.display = 'block';
  const x = Math.min(e.clientX, window.innerWidth  - menu.offsetWidth  - 8);
  const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
}

function hideCtxMenu() {
  document.getElementById('ctxMenu').style.display = 'none';
  ctxTarget = null;
}

function initCtxMenu() {
  document.addEventListener('click',        hideCtxMenu);
  document.addEventListener('contextmenu',  (e) => { if (!e.target.closest('.file-item')) hideCtxMenu(); });

  document.getElementById('ctxOpen').addEventListener('click', async () => {
    if (!ctxTarget) return;
    if (ctxTarget.isDir) await runCommand(activePaneId, `cd "${ctxTarget.name}"`);
    else                 await openEditor(activePaneId, ctxTarget.name);
  });

  document.getElementById('ctxRename').addEventListener('click', async () => {
    if (!ctxTarget) return;
    const newName = prompt(`Renommer "${ctxTarget.name}" en :`, ctxTarget.name);
    if (!newName || newName === ctxTarget.name) return;
    const err = await window.go.main.App.RenameFile(ctxTarget.name, newName);
    if (err) addLine(activePaneId, '❌ ' + err, 'out-error');
    else     await refreshFiles();
  });

  document.getElementById('ctxCopy').addEventListener('click', () => {
    if (!ctxTarget) return;
    fileClipboard = { name: ctxTarget.name, mode: 'copy' };
    addLine(activePaneId, `📋 Copié : ${ctxTarget.name}`, 'out-muted');
  });

  document.getElementById('ctxCut').addEventListener('click', () => {
    if (!ctxTarget) return;
    fileClipboard = { name: ctxTarget.name, mode: 'cut' };
    addLine(activePaneId, `✂ Coupé : ${ctxTarget.name}`, 'out-muted');
  });

  document.getElementById('ctxPaste').addEventListener('click', async () => {
    if (!fileClipboard) return;
    const { name, mode } = fileClipboard;
    const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const base = ext ? name.slice(0, -ext.length) : name;
    const dst  = mode === 'cut' ? name : `${base}_copie${ext}`;
    if (mode === 'cut') {
      const err = await window.go.main.App.RenameFile(name, dst);
      if (err) { addLine(activePaneId, '❌ ' + err, 'out-error'); return; }
      fileClipboard = null;
    } else {
      const err = await window.go.main.App.CopyFileTo(name, dst);
      if (err) { addLine(activePaneId, '❌ ' + err, 'out-error'); return; }
    }
    await refreshFiles();
    addLine(activePaneId, `✅ ${mode === 'cut' ? 'Déplacé' : 'Copié'} → ${dst}`, 'out-success');
  });

  document.getElementById('ctxDelete').addEventListener('click', async () => {
    if (!ctxTarget) return;
    const ok = confirm(`Supprimer "${ctxTarget.name}" ?`);
    if (!ok) return;
    const err = await window.go.main.App.DeleteFile(ctxTarget.name);
    if (err) addLine(activePaneId, '❌ ' + err, 'out-error');
    else { await refreshFiles(); addLine(activePaneId, `🗑 Supprimé : ${ctxTarget.name}`, 'out-muted'); }
  });

  document.getElementById('ctxNewFile').addEventListener('click', async () => {
    const name = prompt('Nom du nouveau fichier :');
    if (!name) return;
    const err = await window.go.main.App.CreateNewFile(name);
    if (err) addLine(activePaneId, '❌ ' + err, 'out-error');
    else     await refreshFiles();
  });

  document.getElementById('ctxNewFolder').addEventListener('click', async () => {
    const name = prompt('Nom du nouveau dossier :');
    if (!name) return;
    const err = await window.go.main.App.CreateNewDir(name);
    if (err) addLine(activePaneId, '❌ ' + err, 'out-error');
    else     await refreshFiles();
  });
}

// ── Command palette ───────────────────────────────────────────
let cmdPaletteSelectedIdx = 0;
let cmdPaletteItems       = [];

function openCmdPalette() {
  document.getElementById('cmdPalette').style.display = 'flex';
  const inp = document.getElementById('cmdPaletteInput');
  inp.value = '';
  renderCmdPalette('');
  inp.focus();
}

function closeCmdPalette() {
  document.getElementById('cmdPalette').style.display = 'none';
}

function renderCmdPalette(query) {
  const q     = query.toLowerCase();
  const hist  = [...history].reverse();
  const seen  = new Set();

  // Build ordered list: history matches first, then known commands
  cmdPaletteItems = [];
  for (const cmd of hist) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    if (!q || cmd.toLowerCase().includes(q)) cmdPaletteItems.push({ text: cmd, badge: 'hist' });
  }
  for (const cmd of knownCommands) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    if (!q || cmd.toLowerCase().includes(q)) cmdPaletteItems.push({ text: cmd, badge: 'cmd' });
  }
  cmdPaletteItems = cmdPaletteItems.slice(0, 50);
  cmdPaletteSelectedIdx = 0;

  const list = document.getElementById('cmdPaletteList');
  list.innerHTML = '';
  cmdPaletteItems.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'cmd-palette-item' + (i === 0 ? ' selected' : '');
    div.innerHTML = `<span class="cp-badge">${item.badge}</span><span class="cp-text">${item.text}</span>`;
    div.addEventListener('mousedown', (e) => {
      e.preventDefault();
      acceptCmdPaletteItem(item.text);
    });
    div.addEventListener('mouseover', () => {
      cmdPaletteSelectedIdx = i;
      highlightCmdPalette();
    });
    list.appendChild(div);
  });
}

function highlightCmdPalette() {
  document.querySelectorAll('.cmd-palette-item').forEach((el, i) => {
    el.classList.toggle('selected', i === cmdPaletteSelectedIdx);
    if (i === cmdPaletteSelectedIdx) el.scrollIntoView({ block: 'nearest' });
  });
}

function acceptCmdPaletteItem(text) {
  closeCmdPalette();
  const inp = document.getElementById(`commandInput${activePaneId}`);
  inp.value = text;
  inp.focus();
  updateGhost(activePaneId, text);
}

function initCmdPalette() {
  document.getElementById('cmdPaletteBackdrop').addEventListener('click', closeCmdPalette);

  const inp = document.getElementById('cmdPaletteInput');
  inp.addEventListener('input', () => renderCmdPalette(inp.value));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeCmdPalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdPaletteSelectedIdx = Math.min(cmdPaletteSelectedIdx + 1, cmdPaletteItems.length - 1);
      highlightCmdPalette(); return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdPaletteSelectedIdx = Math.max(cmdPaletteSelectedIdx - 1, 0);
      highlightCmdPalette(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = cmdPaletteItems[cmdPaletteSelectedIdx];
      if (item) acceptCmdPaletteItem(item.text);
      return;
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
function initSidebarSearch() {
  const input = document.getElementById('sidebarSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('#fileList .file-item').forEach(item => {
      if (item.classList.contains('file-item-parent')) return;
      const name = (item.dataset.name || '').toLowerCase();
      item.style.display = (!q || name.includes(q)) ? '' : 'none';
    });
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; input.dispatchEvent(new Event('input')); }
  });
}

// ── Sessions persistantes ─────────────────────────────────────
async function saveSession() {
  const sessionTabs = tabs
    .filter(t => t.type === 'shell')
    .map(t => ({ label: t.label, path: t.path }));
  const activeIdx = sessionTabs.findIndex(
    t => t.path === (activeTab?.type === 'shell' ? activeTab.path : null)
  );
  const data = JSON.stringify({ tabs: sessionTabs, activeIdx: Math.max(activeIdx, 0) });
  await window.go.main.App.SaveSession(data).catch(() => {});
}

async function restoreSession() {
  try {
    const raw = await window.go.main.App.LoadSession();
    if (!raw) return false;
    const { tabs: savedTabs, activeIdx } = JSON.parse(raw);
    if (!savedTabs?.length) return false;

    const fallbackPath = await window.go.main.App.GetCurrentPath();

    for (const saved of savedTabs) {
      const id  = ++tabCounter;
      // Validate path; fall back to cwd if it no longer exists
      let path  = saved.path || fallbackPath;
      const ok  = await window.go.main.App.PathExists(path).catch(() => false);
      if (!ok) path = fallbackPath;
      const tab = { id, label: saved.label || `Shell ${id}`, type: 'shell', output: '', path };
      tabs.push(tab);
    }
    renderTabs();
    const targetId = tabs[Math.min(activeIdx || 0, tabs.length - 1)]?.id ?? tabs[0].id;
    await switchTab(targetId);
    return true;
  } catch {
    return false;
  }
}

async function init() {
  history = await window.go.main.App.GetHistory() || [];
  paneState[1].historyIndex = history.length;
  paneState[2].historyIndex = history.length;
  loadThemes();
  initSettings();
  initCustomTheme();
  initCtxMenu();
  initCmdPalette();
  initSidebarResize();
  initSidebarSearch();

  const restored = await restoreSession();
  if (!restored) createTab();

  document.getElementById('commandInput1').focus();

  // Sauvegarde la session à la fermeture de la fenêtre
  window.addEventListener('beforeunload', saveSession);
  // Sauvegarde aussi à chaque changement d'onglet (après switchTab)
}

// ── Output ────────────────────────────────────────────────────
function addLine(paneId, text, cls = 'out-normal') {
  const output = document.getElementById(`output${paneId}`);
  const div    = document.createElement('div');
  div.className = cls;
  // Rendu ANSI pour la sortie des commandes
  if (cls === 'out-normal' && window.ansiToHtml) {
    div.innerHTML = window.ansiToHtml(text);
  } else {
    div.textContent = text;
  }
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  searchState[paneId].originalHTML = '';
}

// Ajoute plusieurs lignes d'output ANSI en préservant les blocs colorés
function addAnsiBlock(paneId, raw) {
  const output = document.getElementById(`output${paneId}`);
  const div    = document.createElement('div');
  div.className = 'out-normal';
  div.innerHTML = window.ansiToHtml ? window.ansiToHtml(raw) : raw.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  searchState[paneId].originalHTML = '';
}

// ── Sidebar ───────────────────────────────────────────────────
const FILE_TYPE_MAP = {
  '.go':    'type-go',    '.mod':   'type-go',    '.sum':   'type-go',
  '.py':    'type-py',    '.pyw':   'type-py',    '.pyi':   'type-py',
  '.js':    'type-js',    '.mjs':   'type-js',    '.cjs':   'type-js',
  '.ts':    'type-ts',
  '.jsx':   'type-jsx',   '.tsx':   'type-jsx',
  '.html':  'type-html',  '.htm':   'type-html',
  '.css':   'type-css',
  '.scss':  'type-scss',  '.sass':  'type-scss',  '.less':  'type-scss',
  '.json':  'type-json',  '.jsonc': 'type-json',
  '.yml':   'type-yaml',  '.yaml':  'type-yaml',
  '.xml':   'type-xml',   '.svg':   'type-xml',   '.xaml':  'type-xml',
  '.md':    'type-md',    '.mdx':   'type-md',    '.rst':   'type-md',    '.txt':   'type-md',
  '.rs':    'type-rs',
  '.java':  'type-java',
  '.kt':    'type-kt',    '.kts':   'type-kt',
  '.c':     'type-c',     '.h':     'type-c',
  '.cpp':   'type-cpp',   '.cc':    'type-cpp',   '.cxx':   'type-cpp',   '.hpp':   'type-cpp',
  '.cs':    'type-cs',
  '.rb':    'type-rb',    '.erb':   'type-rb',
  '.php':   'type-php',
  '.swift': 'type-swift',
  '.lua':   'type-lua',
  '.sh':    'type-sh',    '.bash':  'type-sh',    '.zsh':   'type-sh',    '.fish':  'type-sh',
  '.bat':   'type-sh',    '.cmd':   'type-sh',    '.ps1':   'type-sh',
  '.sql':   'type-sql',
  '.env':   'type-cfg',   '.ini':   'type-cfg',   '.cfg':   'type-cfg',   '.conf':  'type-cfg',
  '.toml':  'type-cfg',   '.editorconfig': 'type-cfg',
  '.lock':  'type-lock',
  '.exe':   'type-exe',   '.msi':   'type-exe',   '.dll':   'type-exe',   '.so':    'type-exe',
  '.bin':   'type-exe',
  '.png':   'type-img',   '.jpg':   'type-img',   '.jpeg':  'type-img',   '.gif':   'type-img',
  '.bmp':   'type-img',   '.ico':   'type-img',   '.webp':  'type-img',   '.tiff':  'type-img',
  '.zip':   'type-arc',   '.rar':   'type-arc',   '.7z':    'type-arc',   '.tar':   'type-arc',
  '.gz':    'type-arc',   '.bz2':   'type-arc',   '.xz':    'type-arc',
  '.ttf':   'type-font',  '.otf':   'type-font',  '.woff':  'type-font',  '.woff2': 'type-font',
  '.mp4':   'type-media', '.mp3':   'type-media', '.avi':   'type-media', '.mov':   'type-media',
  '.mkv':   'type-media', '.wav':   'type-media', '.flac':  'type-media', '.ogg':   'type-media',
};

const FILE_NAME_MAP = {
  'dockerfile':          'type-docker',
  'docker-compose.yml':  'type-docker',
  'docker-compose.yaml': 'type-docker',
  '.gitignore':          'type-git',
  '.gitattributes':      'type-git',
  '.gitmodules':         'type-git',
  'package.json':        'type-json',
  'package-lock.json':   'type-lock',
  'yarn.lock':           'type-lock',
  'pnpm-lock.yaml':      'type-lock',
  'go.sum':              'type-lock',
  'cargo.lock':          'type-lock',
  'makefile':            'type-sh',
  'rakefile':            'type-sh',
  '.env':                'type-cfg',
  '.env.local':          'type-cfg',
  '.env.production':     'type-cfg',
  'tsconfig.json':       'type-ts',
  'jsconfig.json':       'type-js',
};

const DIR_NAME_MAP = {
  '.git':         'type-git',
  'node_modules': 'type-lock',
  '.github':      'type-git',
  'dist':         'type-exe',
  'build':        'type-exe',
  'target':       'type-exe',
  '$recycle.bin': 'type-sys',
  'windows':      'type-sys',
  'system32':     'type-sys',
};

function getFileIcon(f) {
  if (f.IsDir) {
    const lower = f.Name.toLowerCase();
    return { cls: DIR_NAME_MAP[lower] || 'type-dir', shape: 'folder' };
  }
  const lower = f.Name.toLowerCase();
  if (FILE_NAME_MAP[lower]) return { cls: FILE_NAME_MAP[lower], shape: 'file' };
  const ext = (f.Ext || '').toLowerCase();
  return { cls: FILE_TYPE_MAP[ext] || 'type-other', shape: 'file' };
}

function makeFileIcon(cls, shape, opacity) {
  const el = document.createElement('span');
  el.className = `file-sq ${cls} ${shape === 'folder' ? 'sq-folder' : 'sq-file'}`;
  if (opacity !== undefined) el.style.opacity = opacity;
  return el;
}

function gitBadgeTitle(code) {
  return { 'M':'Modifié','A':'Ajouté','D':'Supprimé','R':'Renommé',
           'U':'Conflit','?':'Non suivi','!':'Ignoré' }[code] || code;
}

// Maps git porcelain status codes to CSS class names
const GIT_STATUS_CLASS = {
  'M': 'git-modified', 'A': 'git-added',   'D': 'git-deleted',
  'R': 'git-renamed',  'C': 'git-added',   'U': 'git-conflict',
  '?': 'git-untracked','!': 'git-ignored',
};

async function refreshFiles() {
  const [files, gitStatus] = await Promise.all([
    window.go.main.App.ListFiles(),
    window.go.main.App.GetGitStatus().catch(() => ({})),
  ]);
  const list = document.getElementById('fileList');
  const path = await window.go.main.App.GetCurrentPath();

  document.getElementById('sidebarPath').textContent =
    path.length > 28 ? '...' + path.slice(-25) : path;
  updateStatusPath(path);

  list.innerHTML = '';
  const searchEl = document.getElementById('sidebarSearch');
  if (searchEl) searchEl.value = '';

  // Entrée ".." pour remonter (sauf à la racine d'un lecteur, ex: C:\)
  const isRoot = /^[A-Za-z]:\\?$/.test(path.trim());
  if (!isRoot) {
    const parentItem = document.createElement('div');
    parentItem.className    = 'file-item file-item-parent';
    parentItem.dataset.name = '..';
    parentItem.title        = 'Remonter au dossier parent';
    parentItem.appendChild(makeFileIcon('type-dir', 'folder', 0.4));
    const upLabel = document.createElement('span');
    upLabel.className   = 'fname type-dir';
    upLabel.textContent = '..';
    parentItem.appendChild(upLabel);
    parentItem.addEventListener('click', async () => {
      await runCommand(activePaneId, 'cd ..');
    });
    list.appendChild(parentItem);
  }

  (files || []).forEach(f => {
    const item = document.createElement('div');
    item.className    = 'file-item';
    item.dataset.name = f.Name;

    const { cls, shape } = getFileIcon(f);
    item.appendChild(makeFileIcon(cls, shape));

    const nameEl = document.createElement('span');
    nameEl.className   = `fname ${cls}`;
    nameEl.textContent = f.Name;

    // Git status badge
    const statusCode = gitStatus[f.Name] || gitStatus[f.Name + '/'];
    if (statusCode) {
      const gitCls = GIT_STATUS_CLASS[statusCode] || '';
      if (gitCls) {
        item.classList.add(gitCls);
        const badge = document.createElement('span');
        badge.className   = 'git-badge';
        badge.textContent = statusCode === '?' ? 'U' : statusCode;
        badge.title       = gitBadgeTitle(statusCode);
        item.appendChild(badge);
      }
    }

    item.appendChild(nameEl);

    item.draggable = true;
    item.addEventListener('contextmenu', (e) => showCtxMenu(e, f.Name, f.IsDir));
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', f.Name);
      e.dataTransfer.effectAllowed = 'copy';
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));

    if (f.IsDir) {
      item.title = 'Double-clic pour naviguer · Glisse vers le prompt';
      item.ondblclick = async () => {
        await runCommand(activePaneId, `cd ${f.Name}`);
      };
    } else {
      item.title = 'Clic pour prévisualiser · Glisse vers le prompt';
      item.addEventListener('click', () => previewFile(f.Name, f.Ext || ''));
    }

    list.appendChild(item);
  });

  updateStatusCount((files || []).length);

  if (currentPreviewFile) {
    const active = list.querySelector(`[data-name="${currentPreviewFile}"]`);
    if (active) active.classList.add('preview-active');
    else closePreview();
  }
}

// ── Drag & drop ───────────────────────────────────────────────
function insertIntoPrompt(paneId, text) {
  const input = document.getElementById(`commandInput${paneId}`);
  const pos   = input.selectionStart;
  const quoted = text.includes(' ') ? `"${text}"` : text;
  input.value = input.value.slice(0, pos) + quoted + input.value.slice(input.selectionEnd);
  input.selectionStart = input.selectionEnd = pos + quoted.length;
  updateGhost(paneId, input.value);
  input.focus();
  setActivePane(paneId);
}

function initDragDrop() {
  [1, 2].forEach(id => {
    const pane = document.getElementById(`pane${id}`);
    const bar  = document.getElementById(`promptBar${id}`);

    // Accept OS file drops on the whole pane
    pane.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/plain')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        bar.classList.add('drop-active');
      }
    });
    pane.addEventListener('dragleave', (e) => {
      if (!pane.contains(e.relatedTarget)) bar.classList.remove('drop-active');
    });
    pane.addEventListener('drop', (e) => {
      e.preventDefault();
      bar.classList.remove('drop-active');

      // OS file drop (Windows Explorer → WebView2 exposes file.path)
      if (e.dataTransfer.files?.length) {
        const file = e.dataTransfer.files[0];
        const filePath = file.path || file.name;
        if (filePath) { insertIntoPrompt(id, filePath); return; }
      }

      // Multiple OS files
      if (e.dataTransfer.items) {
        const paths = [];
        for (const item of e.dataTransfer.items) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f?.path) paths.push(f.path.includes(' ') ? `"${f.path}"` : f.path);
          }
        }
        if (paths.length) {
          const input = document.getElementById(`commandInput${id}`);
          const pos   = input.selectionStart;
          const text  = paths.join(' ');
          input.value = input.value.slice(0, pos) + text + input.value.slice(input.selectionEnd);
          input.selectionStart = input.selectionEnd = pos + text.length;
          updateGhost(id, input.value);
          input.focus();
          setActivePane(id);
          return;
        }
      }

      // Sidebar drag (text/plain = filename)
      const name = e.dataTransfer.getData('text/plain');
      if (name) insertIntoPrompt(id, name);
    });
  });
}

// ── Exécution commande ────────────────────────────────────────
async function runCommand(paneId, input) {
  if (!input) return;

  // Éditeur nano — ouvre un onglet éditeur
  const nanoMatch = input.trim().match(/^(?:nano|edit|ledit)\s+(.+)$/i);
  if (nanoMatch) {
    await openEditor(paneId, nanoMatch[1].trim());
    return;
  }
  if (input.trim() === 'nano' || input.trim() === 'edit') {
    const name = prompt('Nom du fichier :');
    if (name) await openEditor(paneId, name.trim());
    return;
  }

  // PTY : commandes interactives
  const isPTY = await window.go.main.App.IsPTYCommand(input);
  if (isPTY) {
    addLine(paneId, `Ouverture de ${input}...`, 'out-muted');
    await openPTY(paneId, input);
    return;
  }

  await updateGhost(paneId, '');
  const path = document.getElementById(`segPath${paneId}`).textContent;
  addLine(paneId, `${path}  ${input}`, 'out-cmd');

  if (input.trim() === 'exit') { window.runtime.Quit(); return; }

  if (input.trim() === 'clear') {
    document.getElementById(`output${paneId}`).innerHTML = '';
    searchState[paneId].originalHTML = '';
    updateStatus(paneId, true);
    return;
  }

  if (input.trim() === 'history') {
    history.forEach((cmd, i) => addLine(paneId, `  ${i + 1}  ${cmd}`, 'out-muted'));
    updateStatus(paneId, true);
    return;
  }

  if (input.trim() === 'theme') {
    document.getElementById('themeModal').style.display = 'flex';
    updateStatus(paneId, true);
    return;
  }

  if (input.trim() === 'help') {
    const lines = [
      '  ┌─ Leyo Shell — aide ──────────────────────────────────────',
      '  │',
      '  │  Commandes intégrées',
      '  │   help            Affiche cette aide',
      '  │   clear           Efface la sortie',
      '  │   history         Liste les commandes récentes',
      '  │   theme           Ouvre le sélecteur de thèmes',
      '  │   alias           Liste les alias définis',
      '  │   alias k="v"     Crée un alias',
      '  │   unalias k       Supprime un alias',
      '  │   exit            Quitte l\'application',
      '  │',
      '  │  Raccourcis clavier',
      '  │   Ctrl+T          Nouvel onglet',
      '  │   Ctrl+W          Fermer l\'onglet courant',
      '  │   Ctrl+Tab        Onglet suivant',
      '  │   Ctrl+D          Activer / désactiver le split',
      '  │   Ctrl+P          Command palette (historique + commandes)',
      '  │   Ctrl+K          Sélecteur de thèmes',
      '  │   Ctrl+L          Effacer l\'output',
      '  │   Ctrl+F          Rechercher dans l\'output',
      '  │   Ctrl+S          Sauvegarder (éditeur)',
      '  │   Ctrl+Q          Fermer l\'éditeur',
      '  │   Ctrl+L          Effacer l\'output (= clear)',
      '  │   ↑ / ↓          Naviguer dans l\'historique',
      '  │   Tab             Compléter le chemin',
      '  │   →               Accepter la suggestion fantôme',
      '  │',
      '  │  Sidebar',
      '  │   Clic simple     Naviguer / ouvrir le fichier',
      '  │   Clic droit      Menu contextuel (renommer, copier…)',
      '  │   Glisser         Coller le nom dans le prompt',
      '  └──────────────────────────────────────────────────────────',
    ];
    lines.forEach(l => addLine(paneId, l, 'out-muted'));
    updateStatus(paneId, true);
    return;
  }

  if (input.trim() === 'alias') {
    const aliases = await window.go.main.App.GetAliases();
    if (!Object.keys(aliases).length) addLine(paneId, '  Aucun alias.', 'out-muted');
    else Object.entries(aliases).forEach(([k, v]) => addLine(paneId, `  ${k}  →  ${v}`, 'out-muted'));
    updateStatus(paneId, true);
    return;
  }

  if (input.trim().startsWith('alias ')) {
    const raw = input.trim().slice(6);
    const eq  = raw.indexOf('=');
    if (eq !== -1) {
      const name = raw.slice(0, eq).trim();
      const cmd  = raw.slice(eq + 1).replace(/"/g, '').trim();
      const err  = await window.go.main.App.SaveAlias(name, cmd);
      if (err) { addLine(paneId, '❌ ' + err, 'out-error'); updateStatus(paneId, false); }
      else     { addLine(paneId, `✅ alias ${name} → ${cmd}`, 'out-success'); updateStatus(paneId, true); }
    } else {
      addLine(paneId, '❌ Syntaxe : alias nom="commande"', 'out-error');
      updateStatus(paneId, false);
    }
    return;
  }

  if (input.trim().startsWith('unalias ')) {
    const name = input.trim().slice(8).trim();
    await window.go.main.App.DeleteAlias(name);
    addLine(paneId, `✅ alias supprimé : ${name}`, 'out-success');
    updateStatus(paneId, true);
    return;
  }

  // cat → ouvre aussi la prévisualisation
  const catMatch = input.trim().match(/^(?:cat|type)\s+(.+)$/i);
  if (catMatch) await previewFile(catMatch[1].trim(), '.' + catMatch[1].trim().split('.').pop());

  await window.go.main.App.SaveHistory(input);
  history = await window.go.main.App.GetHistory() || [];
  paneState[1].historyIndex = history.length;
  paneState[2].historyIndex = history.length;

  // RunCommandAt: cd to this tab's isolated path first, then run
  const tabPath = activeTab?.type === 'shell' ? activeTab.path : '';
  const result  = await window.go.main.App.RunCommandAt(tabPath, input);
  const hasError = !!result.error;
  if (result.error)      addLine(paneId, '❌ ' + result.error, 'out-error');
  if (result.suggestion) addSuggestion(paneId, result.suggestion, input);
  if (result.output)     addAnsiBlock(paneId, result.output);

  // Persist the new path back into the tab's isolated state
  if (result.path && activeTab?.type === 'shell') activeTab.path = result.path;
  const newPath = result.path || await window.go.main.App.GetCurrentPath();
  document.getElementById(`segPath${paneId}`).textContent = newPath;
  updateStatusPath(newPath);
  updateStatus(paneId, !hasError);
  if (paneId === 1) await refreshFiles();
  await updateGitBranch(paneId);
}

// ── Suggestion ────────────────────────────────────────────────
function addSuggestion(paneId, suggestion, originalInput) {
  const output = document.getElementById(`output${paneId}`);
  const div    = document.createElement('div');
  div.className = 'out-suggestion';
  div.innerHTML = `
    💡 <span style="color:var(--text-mute)">Vouliez-vous dire</span>
    <span class="suggestion-word">${suggestion}</span>
    <button class="suggestion-btn" onclick="acceptSuggestion(${paneId},'${suggestion}','${originalInput}')">Exécuter</button>
    <button class="suggestion-btn dismiss" onclick="this.parentElement.remove()">Ignorer</button>
  `;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

async function acceptSuggestion(paneId, suggestion, originalInput) {
  const parts = originalInput.trim().split(' ');
  parts[0] = suggestion;
  document.querySelector('.out-suggestion')?.remove();
  await runCommand(paneId, parts.join(' '));
}

// ── Clavier ───────────────────────────────────────────────────
function setupPane(paneId) {
  const input = document.getElementById(`commandInput${paneId}`);

  input.addEventListener('input', async (e) => {
    paneState[paneId].tabCompletions = [];
    await updateGhost(paneId, e.target.value);
  });

  input.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('themeModal').style.display = 'flex'; return; }
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); openSearch(paneId); return; }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleSplit(); return; }
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); openCmdPalette(); return; }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); document.getElementById(`output${paneId}`).innerHTML = ''; return; }

    if (e.ctrlKey && e.key === 'c') {
      const sel = window.getSelection().toString();
      if (sel) { e.preventDefault(); await navigator.clipboard.writeText(sel); return; }
      input.value = ''; await updateGhost(paneId, ''); return;
    }
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      const text = await navigator.clipboard.readText();
      const pos  = input.selectionStart;
      input.value = input.value.slice(0, pos) + text + input.value.slice(input.selectionEnd);
      input.selectionStart = input.selectionEnd = pos + text.length;
      await updateGhost(paneId, input.value); return;
    }
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); input.select(); return; }
    if (e.ctrlKey && e.key === 't') { e.preventDefault(); createTab(); return; }
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (activeTab) closeTab(new Event('click'), activeTab.id);
      return;
    }

    const ghost = paneState[paneId].ghostSuggestion;
    if (e.key === 'ArrowRight' && ghost && input.selectionStart === input.value.length) {
      e.preventDefault(); input.value = ghost; await updateGhost(paneId, ''); return;
    }

    // Tab: cycle through file/dir completions
    if (e.key === 'Tab') {
      e.preventDefault();
      const state = paneState[paneId];
      if (state.tabCompletions.length === 0) {
        state.tabCompletions = await getCompletions(input.value);
        state.tabCompletionIdx = 0;
      }
      if (state.tabCompletions.length === 1) {
        input.value = state.tabCompletions[0];
        state.tabCompletions = [];
      } else if (state.tabCompletions.length > 1) {
        input.value = state.tabCompletions[state.tabCompletionIdx % state.tabCompletions.length];
        state.tabCompletionIdx++;
      }
      await updateGhost(paneId, input.value);
      return;
    }

    if (e.key === 'Escape') {
      paneState[paneId].tabCompletions = [];
      document.getElementById('themeModal').style.display = 'none';
      closeCmdPalette();
      return;
    }

    // Scrollback clavier
    if (e.key === 'PageUp') {
      e.preventDefault();
      const out = document.getElementById(`output${paneId}`);
      out.scrollBy({ top: -out.clientHeight * 0.8, behavior: 'smooth' }); return;
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      const out = document.getElementById(`output${paneId}`);
      out.scrollBy({ top: out.clientHeight * 0.8, behavior: 'smooth' }); return;
    }
    if (e.ctrlKey && e.key === 'Home') {
      e.preventDefault();
      document.getElementById(`output${paneId}`).scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (e.ctrlKey && e.key === 'End') {
      e.preventDefault();
      const out = document.getElementById(`output${paneId}`);
      out.scrollTo({ top: out.scrollHeight, behavior: 'smooth' }); return;
    }

    if (e.key === 'Enter') {
      const cmd = input.value.trim(); input.value = ''; await updateGhost(paneId, '');
      await runCommand(paneId, cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const state = paneState[paneId];
      if (state.historyIndex > 0) {
        state.historyIndex--;
        input.value = history[state.historyIndex];
        await updateGhost(paneId, input.value);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const state = paneState[paneId];
      if (state.historyIndex < history.length - 1) {
        state.historyIndex++;
        input.value = history[state.historyIndex];
        await updateGhost(paneId, input.value);
      } else {
        state.historyIndex = history.length;
        input.value = '';
        await updateGhost(paneId, '');
      }
    }
  });

  input.addEventListener('focus', () => setActivePane(paneId));
}

// ── Bienvenue ─────────────────────────────────────────────────
async function showWelcome() {
  addLine(1, 'Leyo Shell  v1.12', 'out-welcome');
  addLine(1, 'Ctrl+P palette  ·  Ctrl+K thèmes  ·  Ctrl+D split  ·  Ctrl+F recherche  ·  Tab complétion', 'out-muted');
  addLine(1, '', 'out-normal');

  const path = await window.go.main.App.GetCurrentPath();
  document.getElementById('segPath1').textContent    = path;
  document.getElementById('sidebarPath').textContent = path;
  await refreshFiles();
  await updateGitBranch(1);
  updateStatus(1, true);
  initDragDrop();
}

// ── Start ─────────────────────────────────────────────────────
setupPane(1);
setupPane(2);

document.addEventListener('click', (e) => {
  const p1 = document.getElementById('pane1');
  const p2 = document.getElementById('pane2');
  if (p1.contains(e.target)) setActivePane(1);
  else if (p2.contains(e.target)) setActivePane(2);
});

init().then(() => showWelcome());
