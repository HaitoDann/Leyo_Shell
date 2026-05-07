<div align="center">
  <img src="frontend/assets/logo.png" width="120"/>
  <h1>Leyo Shell</h1>
  <p>Un shell moderne pour Windows — syntaxe Unix, interface élégante</p>

  ![Version](https://img.shields.io/badge/version-1.12-7B2FFF)
  ![Platform](https://img.shields.io/badge/Windows-00C8FF)
  ![Language](https://img.shields.io/badge/Go-Wails-FF00CC)
  ![Author](https://img.shields.io/badge/VinX-FF3399)
</div>

---

### v0.1.0
*Comprendre et exécuter des commandes.*

On pose les fondations. Un parser traduit les commandes Unix vers leurs équivalents Windows (`ls` → `dir`, `rm` → `del`, `mkdir` → `mkdir`...). Un executor les envoie à `cmd.exe` et récupère le résultat. À ce stade, Leyo est un programme en ligne de commande basique mais fonctionnel.

---

### v0.2.0
*Leyo se souvient de ce que tu as tapé.*

Ajout d'un système d'historique persistant. Les commandes sont sauvegardées dans `%APPDATA%\leyo_history.txt` entre les sessions. La commande `history` affiche les entrées précédentes.

---

### v0.3.0
*Leyo devient un vrai shell coloré.*

Intégration de **Bubbletea**, un framework TUI en Go. Le terminal gagne une palette de couleurs (cyan, violet, magenta), un prompt stylé `[VinX] chemin >`, la navigation historique avec les flèches, et une animation sobre au démarrage.

---

### v0.4.0
*L'interface se divise en deux zones distinctes.*

Ajout du **Dual-pane** : une sidebar à gauche liste en temps réel les fichiers et dossiers du répertoire courant, avec des couleurs différentes selon le type de fichier. La sidebar se rafraîchit automatiquement après chaque commande.

---

### v1.0.0 *(milestone majeur)*
*Leyo devient une vraie application desktop.*

Migration complète vers **Wails** — Leyo n'est plus un programme qui tourne dans `cmd.exe` mais une fenêtre native Windows avec une interface HTML/CSS/JS sur un cœur Go. Design repensé autour du logo low-poly : fond sombre profond, dégradés géométriques, sidebar avec liseré dégradé. Le logo officiel est intégré dans le header.

---

### v1.1.0
*Leyo comprend quand tu fais une faute de frappe.*

Implémentation de l'algorithme de **distance de Levenshtein**. Quand une commande est inconnue, Leyo calcule la commande la plus proche dans l'historique et les commandes connues. Une suggestion apparaît avec deux boutons — **Exécuter** ou **Ignorer**.

```
mkdor test
❌ 'mkdor' n'est pas reconnu...
💡 Vouliez-vous dire : mkdir  [Exécuter] [Ignorer]
```

---

### v1.2.0
*Leyo finit tes phrases.*

Ajout du **Ghost text** : en tapant les premières lettres d'une commande, Leyo affiche en grisé la complétion la plus probable. La touche `→` accepte la suggestion instantanément.

```
mkd█ir   ← "ir" apparaît en grisé
```

---

### v1.3.0
*Leyo fait peau neuve.*

Refonte visuelle complète alignée sur le logo officiel — animal low-poly aux couleurs cyan → bleu → violet → magenta. Polygones décoratifs CSS, bandes dégradées, indicateur de hover dans la sidebar. Correction de la fenêtre `cmd.exe` noire qui s'ouvrait brièvement (`HideWindow: true`).

---

### v1.3.1
*Les chemins fonctionnent vraiment.*

Refonte complète de la gestion du `cd`. `filepath.Clean` résout tous les cas : chemins relatifs, absolus, remontées multiples, guillemets, espaces dans les noms.

---

### v1.3.2
*Leyo s'ouvre depuis n'importe où.*

Correction du bug WebView2 qui empêchait Leyo de démarrer depuis un dossier sans droits d'écriture. Le dossier de données WebView2 est désormais fixé dans `%APPDATA%\Leyo`.

---

### v1.4.0
*Leyo devient un vrai outil de productivité.*

**Onglets** — plusieurs sessions simultanées avec `Ctrl+T` / `Ctrl+W`, chaque onglet conserve son output et son chemin courant.

**Alias** — raccourcis persistants entre les sessions :
```
alias ll="ls -la"    → crée l'alias
alias               → liste tous les alias
unalias ll          → supprime l'alias
```

**Installeur** — `LeyoSetup.exe` installe Leyo proprement sur Windows avec raccourci Bureau et désinstalleur intégré.

---

### v1.5.0
*Split view, recherche dans l'output, drag & drop.*

**Split view** (`Ctrl+D`) — deux panes côte à côte, chacun avec son propre prompt et output. **Recherche** (`Ctrl+F`) — barre de recherche dans l'output avec navigation précédent/suivant. **Drag & drop** — glisse un fichier depuis la sidebar vers le prompt pour coller son nom.

---

### v1.6.0
*Prévisualisation fichiers.*

Clic sur un fichier dans la sidebar ouvre un panneau de prévisualisation inline avec le contenu, la taille et le nombre de lignes. Détection binaire automatique pour les `.exe`, `.png`, `.zip`, etc.

---

### v1.7.0
*Thèmes et sidebar redimensionnable.*

5 palettes de couleurs sélectionnables via `Ctrl+K`. La sidebar se redimensionne par drag. Indicateur de thème actif dans la status bar.

---

### v1.10.0
*Terminal interactif réel.*

Intégration de **ConPTY** (Windows Pseudo Console) + **xterm.js**. Les commandes interactives (`python`, `ssh`, `vim`, `node`, `powershell`…) ouvrent maintenant un vrai terminal dans Leyo plutôt que de bloquer. Rendu ANSI complet, resize dynamique.

---

### v1.11.0
*Design, settings et opérations fichiers.*

**Redesign complet** — trois thèmes signés : *Velvet Night*, *Dusk*, *Amber*. Titlebar minimaliste, status bar, prompt powerline segmenté.

**Settings** (`⚙`) — panneau de configuration : taille de police, hauteur de ligne, police du terminal, scrollback buffer.

**Opérations fichiers** — menu contextuel clic-droit dans la sidebar : renommer, copier, couper, coller, supprimer, nouveau fichier, nouveau dossier.

**Couleurs par type de fichier** — 35 types distincts avec palette pastel dédiée (`.go` cyan, `.py` bleu-gris, `.js` ambre, `.rs` orange, `.rb` rouge…).

---

### v1.12.0 *(version actuelle)*
*Onglets isolés, complétion universelle, command palette.*

**Onglets avec sessions isolées** — chaque onglet a désormais son propre répertoire de travail indépendant. Naviguer dans un onglet n'affecte plus les autres. Fonctionne via `RunCommandAt` côté Go qui cd au chemin de l'onglet avant chaque commande.

**Tab completion universelle** — `Tab` complète le dernier token de n'importe quelle commande (`cat`, `rm`, `code`…) contre les fichiers du répertoire courant. Appuis répétés sur `Tab` cyclent entre tous les candidats. Le premier token complète aussi les commandes connues.

**Command palette** (`Ctrl+P`) — overlay style VS Code listant l'historique (plus récent en premier) et les commandes connues. Filtre en live, navigation clavier `↑` `↓` `Enter`, `Esc` pour fermer.

**Drag & drop depuis l'explorateur Windows** — glisse un fichier depuis l'explorateur Windows directement sur le terminal pour insérer son chemin complet dans le prompt. Chemins avec espaces auto-quotés. Multi-fichiers supporté.

**Scrollback clavier** — `PgUp`/`PgDn` scrolle l'output de 80% de la hauteur visible. `Ctrl+Home`/`Ctrl+End` pour sauter en haut/bas. `Ctrl+L` efface l'output.

---

## ✨ Fonctionnalités

| Catégorie | Fonctionnalité |
|---|---|
| **Shell** | Syntaxe Unix (`ls`, `rm`, `cp`, `mv`, `cat`, `mkdir`, `touch`, `pwd`) |
| **Shell** | Correction par distance de Levenshtein avec suggestion cliquable |
| **Shell** | Ghost text — complétion automatique en grisé |
| **Shell** | Tab completion cyclique sur fichiers/dossiers/commandes |
| **Shell** | Historique persistant, navigation `↑` `↓` |
| **Shell** | Alias personnalisés persistants entre sessions |
| **Shell** | Parser ANSI — couleurs dans l'output des commandes |
| **Interface** | Onglets avec sessions isolées (`Ctrl+T` / `Ctrl+W` / `Ctrl+Tab`) |
| **Interface** | Split view — deux panes indépendants (`Ctrl+D`) |
| **Interface** | Command palette fuzzy (`Ctrl+P`) |
| **Interface** | Recherche dans l'output (`Ctrl+F`) |
| **Interface** | Scrollback clavier (`PgUp` / `PgDn` / `Ctrl+Home` / `Ctrl+End`) |
| **Interface** | Thèmes : Velvet Night, Dusk, Amber (`Ctrl+K`) |
| **Interface** | Settings — police, taille, hauteur de ligne, scrollback (`⚙`) |
| **Sidebar** | Listing en temps réel, 35 couleurs par type de fichier |
| **Sidebar** | Recherche/filtre par nom |
| **Sidebar** | Prévisualisation fichiers inline |
| **Sidebar** | Opérations : renommer, copier, couper, coller, supprimer, créer |
| **Sidebar** | Drag & drop sidebar→prompt et explorateur Windows→prompt |
| **Terminal** | PTY réel via ConPTY + xterm.js pour `python`, `ssh`, `vim`, `node`… |
| **Éditeur** | CodeMirror intégré — ouvre avec `nano fichier` ou clic sidebar |

---

## ⌨️ Raccourcis clavier

| Raccourci | Action |
|---|---|
| `↑` / `↓` | Naviguer dans l'historique |
| `→` | Accepter la suggestion ghost text |
| `Tab` | Compléter fichier/commande (répéter pour cycler) |
| `Ctrl+T` | Nouvel onglet |
| `Ctrl+W` | Fermer l'onglet courant |
| `Ctrl+Tab` | Onglet suivant |
| `Ctrl+D` | Activer / désactiver le split |
| `Ctrl+P` | Command palette |
| `Ctrl+K` | Sélecteur de thèmes |
| `Ctrl+F` | Rechercher dans l'output |
| `Ctrl+L` | Effacer l'output |
| `PgUp` / `PgDn` | Scroll de l'output |
| `Ctrl+Home` / `Ctrl+End` | Haut / bas de l'output |
| `Ctrl+C` | Copier la sélection |
| `Ctrl+V` | Coller |
| `Ctrl+S` | Sauvegarder (éditeur) |
| `Ctrl+Q` | Fermer l'éditeur |

---

## 🖥️ Commandes intégrées

| Commande | Description |
|---|---|
| `help` | Affiche l'aide complète |
| `clear` / `Ctrl+L` | Vide l'output |
| `history` | Liste les commandes récentes |
| `theme` | Ouvre le sélecteur de thèmes |
| `alias` | Liste les alias définis |
| `alias nom="cmd"` | Crée un alias |
| `unalias nom` | Supprime un alias |
| `nano fichier` | Ouvre l'éditeur intégré |
| `exit` | Quitte Leyo |

---

## 📥 Installation

### Option 1 — Installeur (recommandé)
1. Télécharge `LeyoSetup.exe` depuis [Releases](../../releases)
2. Lance l'installeur
3. Leyo apparaît sur le Bureau et dans le Menu Démarrer

### Option 2 — Portable
1. Télécharge `Leyo.exe` depuis [Releases](../../releases)
2. Place-le dans `C:\Leyo\`
3. Lance `Leyo.exe`

> ⚠️ Windows peut afficher un avertissement car Leyo n'est pas signé numériquement. Clique sur **"Informations complémentaires" → "Exécuter quand même"**.

---

## 🔧 Build depuis les sources

```bash
# Prérequis : Go 1.21+, Node.js 18+, Wails v2
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Bundler les assets frontend
cd frontend
npm install
npm run build
cd ..

# Build Wails
wails build
```
