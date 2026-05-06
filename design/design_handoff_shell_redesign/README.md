# Handoff — Leyo Shell Redesign (v1.7+)

## Vue d'ensemble

Refonte visuelle du shell Leyo : interface principale (titlebar, onglets, sidebar fichiers, terminal, status bar) déclinée en **3 thèmes pastel sobres** avec un fond low-poly très discret en signature. L'objectif : un shell épuré, lisible, où le code reste roi, avec une identité visuelle reconnaissable mais jamais bruyante.

## À propos des fichiers de design

Les fichiers livrés (`Leyo Shell.html`, `shells/ShellWindow.jsx`, `design-canvas.jsx`) sont des **références de design réalisées en HTML/React** — des prototypes qui montrent l'apparence et le comportement souhaités, **pas du code de production à recopier tel quel**.

Le repo Leyo est en **Go + Wails (frontend Web)**. La tâche est de **recréer ces designs dans le frontend Wails existant** en suivant les patterns établis du projet (Vite + React/Vue/JS vanilla selon ce qui est en place dans `frontend/`). Si une ambiguïté existe sur la stack, regarder `frontend/package.json` et `wails.json` avant de coder.

## Fidélité

**Hi-fi** — Les couleurs (hex), tailles, typographies, espacements sont définitifs et doivent être respectés au pixel près. Les sources de vérité sont :
- Les variables `THEMES` dans `shells/ShellWindow.jsx` (lignes 8–110) pour tous les tokens couleur
- Les tailles inline dans le même fichier pour la métrique

## Écrans / Vues

Une seule vue principale : **la fenêtre du shell**. Trois variations (thèmes) interchangeables. Dimensions du canvas : **1280 × 780 px** (le shell s'adapte au resize de la fenêtre OS).

### Anatomie verticale (de haut en bas)

```
┌─────────────────────────────────────────────────────────┐
│ TitleBar (32 px)                                        │
├─────────────────────────────────────────────────────────┤
│ Tabs (36 px)                                            │
├─────────┬───────────────────────────────────────────────┤
│ Sidebar │ Terminal                                      │
│ (240px) │                                               │
│         │                                               │
│         │                                               │
├─────────┴───────────────────────────────────────────────┤
│ Status Bar (24 px) — unifiée                            │
└─────────────────────────────────────────────────────────┘
```

### 1. TitleBar (hauteur 32 px)

- **Fond** : `theme.bg` avec une fine ligne dégradée en bas (1 px, gradient `c1 → c3 → c2` à 30% d'opacité)
- **Gauche** : logo Leyo 18×18 px (`assets/logo.png`) + texte "Leyo" en `Inter 12px / weight 500 / letter-spacing 0.4`
- **Centre** : indicateur de chemin courant `C:\dev\leyo` en `JetBrains Mono 11px`, couleur `theme.textDim`
- **Droite** : 3 contrôles fenêtre macOS-style (16×16 ronds, 8 px gap) — minimize, maximize, close — couleurs neutres, pas les jaune/vert/rouge classiques. Sur le shell réel Wails/Windows, **garder les contrôles natifs Windows** mais respecter la hauteur 32 px.

### 2. Tabs (hauteur 36 px)

- **Fond** : `theme.bgDeep`
- **Style** : onglets fins type Windows Terminal — pas de coupe trapézoïdale
- **Onglet actif** : fond `theme.bg`, bordure supérieure 2 px en `theme.accent`, texte `theme.text`
- **Onglet inactif** : transparent, texte `theme.textDim`, hover → `theme.textMuted`
- **Padding interne** : 14 px horizontal
- **Bouton "+"** à droite du dernier onglet, 28×28 px, couleur `theme.textDim`
- **Typo** : `Inter 12px / weight 400`
- **Séparateurs verticaux** entre onglets : 1 px en `theme.border`

### 3. Sidebar (largeur 240 px)

- **Fond** : `theme.panel`
- **Bordure droite** : 1 px en `theme.border`
- **Liseré gauche** : ligne verticale 1 px, gradient `c1 → c3 → c2`, opacité 0.5 — sur toute la hauteur
- **Section "FILES"** : header en `Inter 10px / uppercase / letter-spacing 1.6 / theme.textMuted`, padding `14px 16px 10px`. À droite du header : compte (`{n}` en `theme.textDim`)
- **Liste des fichiers** : `JetBrains Mono 12px`, padding interne `0 10px 10px`
  - Hauteur de ligne : 26 px
  - Padding ligne : `5px 8px`
  - Border-radius : 3 px
  - Icône glyph 12×12 à gauche (gap 8 px) — utiliser des codepoints Lucide ou émojis monochromes (📁 📄 ⚙️ 📦)
  - Hover : fond `theme.panelStrong`
  - Sélection : fond `theme.panelStrong` + bordure gauche 2 px en `theme.accent`
- **Couleurs par type** (dans `theme`) :
  - `folder` → bleu/lavande pastel selon thème
  - `code` → cyan/pêche/ambre
  - `json` / `config` → variantes
  - `exec` → vert/sauge
  - `md` → vert pâle
  - `file` → `theme.textMuted`
- **Polygone décoratif** en bas-droite de la sidebar : SVG 110×110 px, opacité **0.02**, `right: -22, bottom: 38` — gradient `c1 → c3`, stroke 0.5 px
- **Pas de status footer dans la sidebar** — il a été fusionné avec la status bar globale

### 4. Terminal (zone centrale, flex: 1)

- **Fond** : `transparent` (laisse passer `theme.bg`)
- **Padding** : `16px 22px 0`
- **Halo de gradient** très diffus en bas-gauche — radial-gradient de `theme.c3` à `transparent`, blur 40 px, opacités très basses (`1c`, `10`, `06`). Décoratif uniquement.
- **Polygones de fond** : SVG plein viewport, opacité **0.02**, **masqués pour n'apparaître QUE dans les coins** (haut-gauche, bas-gauche, bas-droite). La zone centrale de lecture reste vierge — aucun polygone ne doit jamais traverser le texte du terminal.

#### Format du prompt

```
[VinX] C:\dev\leyo > <commande>
```

- `[VinX]` → couleur `theme.c1`
- chemin → `theme.textMuted`
- `>` → `theme.accent`
- commande → `theme.text`
- Police : `JetBrains Mono 13px / line-height 1.75`

#### PromptSeparator (à gauche de chaque bloc de commande)

Mini-barre verticale 2 px de large × hauteur du bloc, gradient `c1 → c3 → c2` vertical, opacité 0.4, margin-right 12 px. Sépare visuellement chaque commande de sa sortie.

#### Contenu de la démo (à reproduire fidèlement)

1. **Welcome** : `Leyo Shell v1.7 · type 'help' for commands · {date}` en `theme.textMuted`
2. **`ls`** : sortie multi-ligne avec couleurs par type (folders, code, json, exec, md, file)
3. **`mkdor test`** (typo volontaire) → erreur rouge + **carte de suggestion Levenshtein** :
   - Card avec `border-left: 2px solid theme.accent`, fond `theme.panel`, padding `10px 14px`, max-width 560 px
   - Texte : "Vouliez-vous dire **mkdir** ?"
   - Bouton primaire "Exécuter ↵" : bordure `theme.borderStrong`, transparent, `Inter 11px`
   - Bouton secondaire "Ignorer" : sans bordure, `theme.textDim`
4. **`cat go.mod`** → preview v1.6 dans une card `theme.panelStrong` avec syntaxe Go colorée et header `── go.mod · 8 lignes ───────────`
5. **Ligne courante** : `mkd` tapé + **ghost text `ir tests/`** en `theme.textMuted` italique avec opacité animée (0.4 ↔ 0.7, 1.8s ease-in-out infinite alternate) + curseur clignotant `theme.accent` (1 ch large, blink 1s)

### 5. Status Bar unifiée (hauteur 24 px)

Une **seule** barre tout en bas, fusion de l'ancien footer sidebar + status bar.

- **Fond** : `theme.bgDeep`
- **Bordure haut** : 1 px `theme.border`
- **Padding** : `0 14px`
- **Typo** : `Inter 10px / letter-spacing 0.5 / theme.textMuted`
- **Gap entre items** : 16 px
- **Layout** : flex horizontal, `align-items: center`

**Gauche → droite :**
1. `● ready` — point 5×5 px en `theme.success`, suivi du texte "ready"
2. `C:\dev\leyo` — chemin courant, `JetBrains Mono 10.5px`, couleur `theme.textDim`
3. *(spacer flex 1)*
4. `UTF-8`
5. `{theme.name}` (ex: "Velvet Night")
6. `16 items`
7. `VinX · v1.7` — couleur `theme.textDim`

## Les 3 thèmes (design tokens)

Tous les tokens sont définis dans `shells/ShellWindow.jsx` lignes 8–110. Voici les clés essentielles :

### Velvet Night (officiel, adouci)

```js
{
  name: "Velvet Night",
  bg: "#0d0d14",
  bgDeep: "#08080d",
  panel: "rgba(255,255,255,0.025)",
  panelStrong: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.10)",
  text: "#e8e8f0",
  textDim: "#9090a0",
  textMuted: "#5a5a6a",
  c1: "#9ad8ff",   // cyan glacé
  c2: "#a6b3ff",   // bleu lavande
  c3: "#cba8ff",   // mauve doux
  c4: "#f0a8d8",   // rose poudré
  accent: "#cba8ff",
  success: "#a8e0c0",
  error: "#f0a8b8",
  // file-type colors:
  folder: "#a6b3ff",
  code: "#9ad8ff",
  json: "#cba8ff",
  config: "#a89890",
  exec: "#a8e0c0",
  md: "#a8e0c0",
  file: "#7a7a8a",
  polyOpacity: 0.02,
}
```

### Dusk (sunset orange × violet)

```js
{
  name: "Dusk",
  bg: "#16101a",
  bgDeep: "#0c0810",
  panel: "rgba(255,255,255,0.028)",
  panelStrong: "rgba(255,255,255,0.045)",
  border: "rgba(255,200,180,0.07)",
  borderStrong: "rgba(255,200,180,0.12)",
  text: "#f0e0d8",
  textDim: "#a89890",
  textMuted: "#6a5a60",
  c1: "#ffc9a8",   // pêche
  c2: "#ffaab0",   // corail doux
  c3: "#d4a8e0",   // lilas
  c4: "#a8aae0",   // bleu nuit doux
  accent: "#ffaab0",
  // (autres tokens : voir source)
  polyOpacity: 0.02,
}
```

### Amber (solarisé chaud)

```js
{
  name: "Amber",
  bg: "#161108",
  bgDeep: "#0c0905",
  panel: "rgba(255,220,170,0.025)",
  panelStrong: "rgba(255,220,170,0.04)",
  border: "rgba(255,200,140,0.07)",
  borderStrong: "rgba(255,200,140,0.12)",
  text: "#f0e0c8",
  textDim: "#a89878",
  textMuted: "#6a5e44",
  c1: "#f0c878",   // ambre
  c2: "#e8a868",   // ambre profond
  c3: "#d49858",   // caramel
  c4: "#c0e0b8",   // sauge pâle (contrepoint)
  accent: "#f0c878",
  polyOpacity: 0.02,
}
```

> **Récupère les tokens manquants directement depuis `shells/ShellWindow.jsx`** (objet `THEMES` complet en haut du fichier).

## Typographie

- **UI** : `Inter` (sans-serif), poids 400/500
- **Code & terminal** : `JetBrains Mono`, poids 400/500
- Tailles : 10 px (status bar, headers section), 11 px (boutons, contrôles), 12 px (sidebar files), 13 px (terminal), 18 px (logo wordmark)
- **Antialiasing** : `-webkit-font-smoothing: antialiased`

Les deux fonts sont chargées depuis Google Fonts dans `Leyo Shell.html` — utiliser le même CDN ou bundler localement selon les conventions du repo Leyo.

## Interactions & comportements

### Animation d'entrée (au montage du shell)

- Polygones de fond : fade-in 600 ms, `cubic-bezier(0.4, 0, 0.2, 1)`
- Lignes du terminal : staggered fade-up — chaque ligne (`.leyo-line-N`) entre avec `translateY(8px) → 0` + `opacity 0 → 1`, durée 400 ms, délai = `N × 80ms`
- **Ne pas rejouer l'animation** sur le rendu suivant (utiliser un flag `mounted`)

### Curseur

- Élément 1 ch de large × 1.2em de haut, fond `theme.accent`
- Animation `cursor-blink`: opacité 1 → 0 → 1, durée 1s, infinite, steps(2)

### Ghost text (suggestion d'autocomplétion)

- Affiché immédiatement après le curseur, en `theme.textMuted` italique
- Animation de pulse douce : opacité 0.4 ↔ 0.7, 1.8s ease-in-out infinite alternate
- Sur Tab → accepte la suggestion (à implémenter côté logique du shell)
- Sur n'importe quelle autre frappe → la suggestion disparaît / se met à jour

### Suggestion Levenshtein (carte)

- Apparaît après une commande non reconnue dont la distance ≤ 2 avec une commande connue
- "Exécuter ↵" → exécute la commande corrigée, ferme la carte
- "Ignorer" / Esc → ferme la carte
- Animation d'apparition : `opacity 0 → 1` + `translateY(4px) → 0`, 200 ms

### Hover states

- Onglets inactifs : couleur `textDim` → `textMuted`
- Items sidebar : fond transparent → `theme.panelStrong`
- Contrôles fenêtre : fond transparent → `theme.panelStrong`

### Changement de thème

- Géré par un sélecteur (à intégrer dans les settings Leyo existants)
- Clé persistée dans le storage local
- Transition CSS sur les couleurs : `transition: background-color 200ms, color 200ms, border-color 200ms`

## State management

État minimal nécessaire côté frontend Leyo :
- `currentTheme` : "velvet" | "dusk" | "amber" — persistant
- `tabs` : `[{ id, title, cwd, history }]`
- `activeTabId`
- `selectedFileIndex` (sidebar)
- `commandBuffer` (ligne en cours)
- `ghostSuggestion` (string ou null)
- `levenshteinSuggestion` (`{ typo, correction } | null`)
- `commandHistory` (déjà existant côté Go probablement)

Le backend Go (parser, executor, history) n'a **pas besoin de changer** — c'est une refonte visuelle.

## Assets

- **`assets/logo.png`** — logo Leyo low-poly fourni par toi, déjà intégré au repo. À utiliser tel quel dans la titlebar (taille 18×18) et éventuellement en grand sur splash si tu veux.
- **Polices** : JetBrains Mono + Inter via Google Fonts (ou bundler en local selon ce qui est en place).
- **Icônes fichiers** : émojis monochromes ou Lucide-react / lucide (vérifier ce que `frontend/` utilise déjà avant d'ajouter une dépendance).

## Fichiers de référence dans ce bundle

| Fichier | Rôle |
|---|---|
| `Leyo Shell.html` | Page d'entrée qui charge React + le canvas avec les 3 thèmes côte à côte |
| `design-canvas.jsx` | Starter component qui présente les 3 artboards (composant de présentation, **pas à porter dans Leyo**) |
| `shells/ShellWindow.jsx` | **LE composant à porter** — contient `THEMES`, `ShellWindow`, `TitleBar`, `Tabs`, `Sidebar`, `Terminal`, `StatusBar`, `PolyBackground`, etc. |
| `assets/logo.png` | Logo Leyo officiel |

## Plan d'intégration suggéré

1. **Lire** `frontend/package.json` et `wails.json` pour comprendre la stack frontend exacte du repo Leyo.
2. **Créer un fichier `frontend/src/theme/themes.js`** (ou équivalent) qui exporte les 3 objets `THEMES` (Velvet/Dusk/Amber).
3. **Découper `ShellWindow.jsx`** en composants idiomatiques pour la stack du repo (un composant par section : `<TitleBar>`, `<Tabs>`, `<Sidebar>`, `<Terminal>`, `<StatusBar>`, `<PolyBackground>`).
4. **Brancher** chaque composant sur l'état réel du shell (commandes Wails côté Go, sortie streaming, etc.) — la maquette utilise du contenu statique.
5. **Ajouter le sélecteur de thème** dans les settings (3 swatches + nom du thème).
6. **Tester** que le terminal reste lisible avec du contenu réel long, scroll, redimensionnement.
7. **Vérifier l'accessibilité** : contraste texte/fond ≥ AA sur les 3 thèmes (les pastels passent, mais à mesurer sur le texte secondaire `textMuted`).

## Notes finales

- **Pas de gradient agressif, pas d'emoji décoratifs, pas de coins coupés sur la fenêtre.**
- Les polygones sont une **signature**, pas une décoration — opacité 0.02, masqués hors zone de lecture, jamais visibles au premier coup d'œil.
- Si quelque chose semble trop décoré, c'est que c'est trop décoré. Le code est roi.
