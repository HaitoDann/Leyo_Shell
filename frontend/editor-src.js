import { EditorView, basicSetup } from 'codemirror';
import { keymap }                 from '@codemirror/view';
import { EditorState }            from '@codemirror/state';
import { javascript }             from '@codemirror/lang-javascript';
import { python }                 from '@codemirror/lang-python';
import { json }                   from '@codemirror/lang-json';
import { markdown }               from '@codemirror/lang-markdown';
import { html }                   from '@codemirror/lang-html';
import { css }                    from '@codemirror/lang-css';
import { StreamLanguage }         from '@codemirror/language';
import { go }                     from '@codemirror/legacy-modes/mode/go';
import { defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';

// ── Détecte le langage ────────────────────────────────────────
function getLanguage(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    'js':   javascript(),
    'ts':   javascript({ typescript: true }),
    'jsx':  javascript({ jsx: true }),
    'tsx':  javascript({ jsx: true, typescript: true }),
    'py':   python(),
    'pyw':  python(),
    'json': json(),
    'md':   markdown(),
    'mdx':  markdown(),
    'html': html(),
    'htm':  html(),
    'css':  css(),
    'scss': css(),
    'go':   StreamLanguage.define(go),
  };
  return map[ext] || null;
}

// ── Nom lisible du langage ────────────────────────────────────
function getLanguageName(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    'js': 'JavaScript', 'ts': 'TypeScript',
    'jsx': 'JSX', 'tsx': 'TSX',
    'py': 'Python', 'pyw': 'Python',
    'json': 'JSON',
    'md': 'Markdown', 'mdx': 'Markdown',
    'html': 'HTML', 'htm': 'HTML',
    'css': 'CSS', 'scss': 'SCSS',
    'go': 'Go',
    'txt': 'Texte brut',
  };
  return map[ext] || (ext ? ext.toUpperCase() : 'Texte brut');
}

// ── Thème Tokyo Night ─────────────────────────────────────────
function buildTheme() {
  const s       = getComputedStyle(document.documentElement);
  const violet  = s.getPropertyValue('--violet').trim()   || '#8855EE';
  const magenta = s.getPropertyValue('--magenta').trim()  || '#CC44AA';

  const syn = {
    keyword:     '#BB9AF7',
    fn:          '#7DCFFF',
    string:      '#9ECE6A',
    number:      '#FF9E64',
    comment:     '#565F89',
    operator:    '#89DDFF',
    tag:         '#F7768E',
    attr:        '#FF9E64',
    property:    '#73DACA',
    type:        '#2AC3DE',
    builtin:     '#FF9E64',
    punctuation: '#C0CAF5',
    variable:    '#C0CAF5',
    def:         '#7DCFFF',
    link:        '#7DCFFF',
  };

  const bgEditor = '#1E1E2E';
  const bgGutter = '#181825';
  const bgActive = '#2A2A3D';
  const textMain = '#C0CAF5';

  return EditorView.theme({

    '&': {
      height: '100%',
      backgroundColor: bgEditor,
      color: textMain,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
      fontSize: '13px',
      fontVariantLigatures: 'common-ligatures',
    },

    '.cm-content': {
      padding: '14px 0',
      caretColor: '#7DCFFF',
      lineHeight: '1.75',
    },

    '.cm-cursor': {
      borderLeftColor: '#7DCFFF',
      borderLeftWidth: '2px',
    },

    '.cm-selectionBackground': {
      backgroundColor: 'rgba(187,154,247,0.2) !important',
    },
    '.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(187,154,247,0.25) !important',
    },
    '::selection': {
      backgroundColor: 'rgba(187,154,247,0.2)',
    },

    '.cm-gutters': {
      backgroundColor: bgGutter,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '2px 0 8px rgba(0,0,0,0.35)',
      color: '#3B4261',
      minWidth: '52px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: '#3B4261',
      fontSize: '11.5px',
      paddingRight: '16px',
      paddingLeft: '8px',
      lineHeight: '1.75',
      opacity: '0.6',
    },

    '.cm-activeLineGutter': {
      color: '#7DCFFF',
      fontWeight: '600',
      backgroundColor: bgActive,
      opacity: '1',
    },

    '.cm-activeLine': {
      backgroundColor: bgActive,
      boxShadow: 'inset 2px 0 0 rgba(125,207,255,0.35)',
    },

    '.cm-matchingBracket': {
      backgroundColor: 'rgba(187,154,247,0.2)',
      outline: '1px solid rgba(187,154,247,0.5)',
      borderRadius: '2px',
    },

    '.cm-scroller': { overflow: 'auto' },
    '.cm-panels':   { backgroundColor: '#16161E', color: textMain },
    '.cm-tooltip':  {
      backgroundColor: '#1A1A2E',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(255,158,100,0.25)',
      outline: '1px solid rgba(255,158,100,0.4)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'rgba(255,158,100,0.5)',
    },

    '.cm-keyword':     { color: syn.keyword,     fontWeight: '500' },
    '.cm-operator':    { color: syn.operator },
    '.cm-variable':    { color: syn.variable },
    '.cm-variable-2':  { color: syn.fn },
    '.cm-variable-3':  { color: syn.fn },
    '.cm-function':    { color: syn.fn,          fontWeight: '500' },
    '.cm-string':      { color: syn.string },
    '.cm-string-2':    { color: syn.string },
    '.cm-number':      { color: syn.number },
    '.cm-atom':        { color: syn.number },
    '.cm-boolean':     { color: syn.keyword },
    '.cm-comment':     { color: syn.comment,     fontStyle: 'italic' },
    '.cm-meta':        { color: syn.comment },
    '.cm-tag':         { color: syn.tag },
    '.cm-attribute':   { color: syn.attr },
    '.cm-property':    { color: syn.property },
    '.cm-qualifier':   { color: syn.keyword },
    '.cm-type':        { color: syn.type,        fontWeight: '500' },
    '.cm-builtin':     { color: syn.builtin },
    '.cm-def':         { color: syn.def },
    '.cm-punctuation': { color: syn.punctuation },
    '.cm-link':        { color: syn.link,        textDecoration: 'underline' },
    '.cm-header':      { color: syn.fn,          fontWeight: '700' },
    '.cm-hr':          { color: syn.comment },
    '.cm-em':          { fontStyle: 'italic',    color: syn.string },
    '.cm-strong':      { fontWeight: '700',      color: syn.keyword },
    '.cm-code':        { color: syn.property,    fontFamily: 'inherit' },
    '.cm-invalid':     { color: '#F7768E',       textDecoration: 'underline wavy' },

  }, { dark: true });
}

// ── État de l'éditeur ─────────────────────────────────────────
let editorView     = null;
let editorFilename = '';
let editorModified = false;
let editorOriginal = '';
let editorPaneId   = 1;

// ── Sauvegarde ────────────────────────────────────────────────
async function doSave() {
  if (!editorView) return;
  const content = editorView.state.doc.toString();
  const err     = await window.go.main.App.WriteFile(editorFilename, content);
  if (err) { setStatus(`❌ ${err}`); return; }
  editorOriginal = content;
  setModified(false);
  setStatus('✓ Sauvegardé');
  setTimeout(() => setStatus(''), 2000);
  if (typeof refreshFiles === 'function') await refreshFiles();
}

// ── Fermeture — notifie le système d'onglets ──────────────────
function doClose() {
  if (editorModified) {
    const ok = window.confirm(`"${editorFilename}" a des modifications non sauvegardées.\nFermer quand même ?`);
    if (!ok) return;
  }
  editorModified = false;
  if (editorView) { editorView.destroy(); editorView = null; }
  if (typeof window.LeyoEditor?.onClose === 'function') {
    window.LeyoEditor.onClose();
  }
}

// ── Helpers UI ────────────────────────────────────────────────
function setStatus(msg) {
  const el = document.getElementById('editorStatus');
  if (el) el.textContent = msg;
}

function setModified(mod) {
  editorModified = mod;
  const el = document.getElementById('editorModified');
  if (!el) return;
  el.textContent = mod ? '●' : '';
  el.title       = mod ? 'Modifications non sauvegardées' : '';
}

function updateFooter() {
  if (!editorView) return;
  const pos  = editorView.state.selection.main.head;
  const line = editorView.state.doc.lineAt(pos);
  const col  = pos - line.from + 1;
  const el1  = document.getElementById('editorCursorPos');
  const el2  = document.getElementById('editorLineCount');
  if (el1) el1.textContent = `Ln ${line.number}  Col ${col}`;
  if (el2) el2.textContent = `${editorView.state.doc.lines} lignes`;
}

function updateLanguageFooter(filename) {
  const el = document.getElementById('editorLang');
  if (el) el.textContent = getLanguageName(filename);
}

// ── Monte l'éditeur ───────────────────────────────────────────
function mountEditor(content, filename) {
  const container = document.getElementById('cmEditor');
  if (!container) return;
  if (editorView) { editorView.destroy(); editorView = null; }

  const lang = getLanguage(filename);

  const customKeymap = keymap.of([
    { key: 'Ctrl-s', run: () => { doSave();  return true; } },
    { key: 'Ctrl-q', run: () => { doClose(); return true; } },
    indentWithTab,
    ...defaultKeymap,
    ...historyKeymap,
  ]);

  const extensions = [
    basicSetup,
    buildTheme(),
    customKeymap,
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setModified(true);
        updateFooter();
      }
      if (update.selectionSet) updateFooter();
    }),
  ];

  if (lang) extensions.push(lang);

  editorView = new EditorView({
    state: EditorState.create({ doc: content, extensions }),
    parent: container,
  });

  updateFooter();
  updateLanguageFooter(filename);
}

// ── Met à jour le header avec le nom du fichier ───────────────
function setFilenameDisplay(filename) {
  const short = filename.split(/[/\\]/).pop();
  const el = document.getElementById('editorFilename');
  if (el) el.textContent = short;
}

// ── API globale exposée à main.js ─────────────────────────────
window.LeyoEditor = {

  // Callback déclenché quand l'utilisateur ferme l'éditeur (Ctrl+Q ou bouton ✕)
  // Défini par main.js pour fermer l'onglet éditeur actif
  onClose: null,

  // Charge un fichier depuis le disque et monte l'éditeur
  async loadFile(paneId, filename) {
    editorPaneId   = paneId;
    editorFilename = filename.trim();
    editorModified = false;

    const result = await window.go.main.App.ReadFile(editorFilename);
    setFilenameDisplay(editorFilename);
    setStatus(result.exists === 'true' ? result.path : '✦ Nouveau fichier');
    setModified(false);
    mountEditor(result.content || '', editorFilename);
    editorOriginal = result.content || '';
    setTimeout(() => editorView?.focus(), 80);
  },

  // Restaure du contenu déjà en mémoire (après retour sur un onglet éditeur)
  setContent(paneId, filename, content, wasModified = false) {
    editorPaneId   = paneId;
    editorFilename = filename;
    editorOriginal = wasModified ? '' : content;
    setFilenameDisplay(filename);
    setStatus('');
    mountEditor(content, filename);
    setModified(wasModified);
    setTimeout(() => editorView?.focus(), 80);
  },

  // Retourne le contenu actuel (pour sauvegarder l'état avant un switch d'onglet)
  getContent() {
    return editorView ? editorView.state.doc.toString() : null;
  },

  // Détruit la vue sans déclencher onClose (utilisé lors d'un switch d'onglet)
  destroyView() {
    if (editorView) { editorView.destroy(); editorView = null; }
  },

  async save()  { await doSave(); },
  close()       { doClose(); },

  reloadTheme() {
    if (editorView && editorFilename) {
      mountEditor(editorView.state.doc.toString(), editorFilename);
    }
  },

  isModified: () => editorModified,
};
