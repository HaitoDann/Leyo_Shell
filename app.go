package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/HaitoDann/Leyo/shell"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type FileEntry struct {
	Name  string
	IsDir bool
	Ext   string
}

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) RunCommand(input string) map[string]string {
	return a.RunCommandAt("", input)
}

// RunCommandAt runs a command in a specific directory, returns output + new path.
// Used by the frontend to give each tab its own independent working directory.
func (a *App) RunCommandAt(dir, input string) map[string]string {
	if dir != "" {
		if err := os.Chdir(dir); err != nil {
			return map[string]string{"output": "", "error": "Impossible d'accéder à : " + dir, "suggestion": "", "path": dir}
		}
	}

	trimmed := strings.TrimSpace(input)

	if trimmed == "cd" {
		current, _ := os.Getwd()
		root := filepath.VolumeName(current) + `\`
		if err := os.Chdir(root); err != nil {
			newPath, _ := os.Getwd()
			return map[string]string{"output": "", "error": err.Error(), "suggestion": "", "path": newPath}
		}
		newPath, _ := os.Getwd()
		return map[string]string{"output": "→ " + newPath, "error": "", "suggestion": "", "path": newPath}
	}

	if strings.HasPrefix(trimmed, "cd ") {
		d := strings.TrimPrefix(trimmed, "cd ")
		d = strings.Trim(d, "\"")
		d = strings.TrimSpace(d)
		if !filepath.IsAbs(d) {
			current, _ := os.Getwd()
			d = filepath.Join(current, d)
		}
		d = filepath.Clean(d)
		if err := os.Chdir(d); err != nil {
			cur, _ := os.Getwd()
			return map[string]string{"output": "", "error": "Impossible d'accéder à : " + d, "suggestion": "", "path": cur}
		}
		newPath, _ := os.Getwd()
		return map[string]string{"output": "→ " + newPath, "error": "", "suggestion": "", "path": newPath}
	}

	result, errMsg := shell.RunWithOutput(input)

	isWindowsError := strings.Contains(result, "n'est pas reconnu") ||
		strings.Contains(result, "not recognized") ||
		strings.Contains(result, "not found") ||
		strings.Contains(result, "impossible de trouver")

	if isWindowsError {
		errMsg = result
		result = ""
	}

	suggestion := ""
	if errMsg != "" || isWindowsError {
		history := shell.LoadHistory()
		if closest, found := shell.FindClosest(trimmed, history); found {
			suggestion = closest
		}
	}

	newPath, _ := os.Getwd()
	return map[string]string{
		"output": result, "error": errMsg, "suggestion": suggestion, "path": newPath,
	}
}

func (a *App) GetHistory() []string {
	h := shell.LoadHistory()
	if h == nil {
		return []string{}
	}
	return h
}

func (a *App) SaveHistory(cmd string) {
	shell.SaveToHistory(cmd)
}

func (a *App) GetCurrentPath() string {
	dir, err := os.Getwd()
	if err != nil {
		return `C:\`
	}
	return dir
}

func (a *App) PathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func (a *App) ListFiles() []FileEntry {
	dir, err := os.Getwd()
	if err != nil {
		return []FileEntry{}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return []FileEntry{}
	}
	var files []FileEntry
	for _, e := range entries {
		if e.IsDir() {
			files = append(files, FileEntry{Name: e.Name(), IsDir: true, Ext: ""})
		}
	}
	for _, e := range entries {
		if !e.IsDir() {
			files = append(files, FileEntry{
				Name: e.Name(), IsDir: false, Ext: filepath.Ext(e.Name()),
			})
		}
	}
	return files
}

func (a *App) ListFilesAt(path string) []FileEntry {
	current, _ := os.Getwd()
	absPath := filepath.Clean(filepath.Join(current, path))
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return []FileEntry{}
	}
	var files []FileEntry
	for _, e := range entries {
		if e.IsDir() {
			files = append(files, FileEntry{Name: e.Name(), IsDir: true, Ext: ""})
		}
	}
	for _, e := range entries {
		if !e.IsDir() {
			files = append(files, FileEntry{Name: e.Name(), IsDir: false, Ext: filepath.Ext(e.Name())})
		}
	}
	return files
}

func (a *App) ReadFilePreview(name string) map[string]string {
	dir, _ := os.Getwd()
	fullPath := filepath.Join(dir, name)

	info, err := os.Stat(fullPath)
	if err != nil {
		return map[string]string{"error": "Fichier introuvable", "content": "", "size": "", "lines": ""}
	}

	size := formatSize(info.Size())
	ext := strings.ToLower(filepath.Ext(name))
	binaryExts := map[string]bool{
		".exe": true, ".dll": true, ".bin": true, ".zip": true,
		".rar": true, ".7z": true, ".tar": true, ".gz": true,
		".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
		".ico": true, ".pdf": true, ".mp3": true, ".mp4": true,
	}

	if binaryExts[ext] {
		return map[string]string{"content": "", "binary": "true", "size": size, "lines": "—"}
	}

	const maxBytes = 50 * 1024
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return map[string]string{"error": "Lecture impossible", "content": "", "size": size, "lines": ""}
	}

	content := string(data)
	if len(data) > maxBytes {
		content = string(data[:maxBytes]) + "\n\n… (fichier tronqué)"
	}

	lines := strings.Count(content, "\n") + 1
	return map[string]string{
		"content": content, "binary": "false",
		"size": size, "lines": fmt.Sprintf("%d", lines),
	}
}

func formatSize(bytes int64) string {
	switch {
	case bytes < 1024:
		return fmt.Sprintf("%d B", bytes)
	case bytes < 1024*1024:
		return fmt.Sprintf("%.1f KB", float64(bytes)/1024)
	default:
		return fmt.Sprintf("%.1f MB", float64(bytes)/(1024*1024))
	}
}

func (a *App) GetGitBranch() string {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir, _ = os.Getwd()
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	branch := strings.TrimSpace(string(out))
	if branch == "HEAD" {
		return ""
	}
	return branch
}

// GetGitStatus returns a map of filename → git status code for the cwd.
// Status codes mirror `git status --porcelain`: "M" modified, "A" added,
// "D" deleted, "R" renamed, "?" untracked, "!" ignored.
func (a *App) GetGitStatus() map[string]string {
	cmd := exec.Command("git", "status", "--porcelain", "--ignored")
	cmd.Dir, _ = os.Getwd()
	out, err := cmd.Output()
	if err != nil {
		return map[string]string{}
	}
	result := map[string]string{}
	for _, line := range strings.Split(string(out), "\n") {
		if len(line) < 4 {
			continue
		}
		xy := strings.TrimRight(line[:2], " ")
		name := strings.TrimSpace(line[3:])
		// Renamed: "old -> new" — keep the new name
		if strings.Contains(name, " -> ") {
			name = strings.SplitN(name, " -> ", 2)[1]
		}
		name = strings.Trim(name, "\"")
		// Use index status first, then worktree
		code := string(line[0])
		if code == " " {
			code = string(line[1])
		}
		if code != " " && name != "" {
			result[name] = code
			// Also index top-level dir for files inside it
			if parts := strings.SplitN(name, "/", 2); len(parts) == 2 {
				if _, exists := result[parts[0]]; !exists {
					result[parts[0]] = code
				}
			}
		}
		_ = xy
	}
	return result
}

// ── Sessions persistantes ─────────────────────────────────────

func sessionFile() string {
	return filepath.Join(os.Getenv("APPDATA"), "Leyo", "session.json")
}

func (a *App) SaveSession(data string) string {
	if err := os.WriteFile(sessionFile(), []byte(data), 0644); err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) LoadSession() string {
	data, err := os.ReadFile(sessionFile())
	if err != nil {
		return ""
	}
	return string(data)
}

// ── Thèmes ────────────────────────────────────────────────────
func (a *App) GetThemes() []shell.Theme {
	return shell.DefaultThemes
}

func (a *App) GetCurrentTheme() shell.Theme {
	return shell.LoadCurrentTheme()
}

func (a *App) SetTheme(name string) string {
	for _, t := range shell.DefaultThemes {
		if t.Name == name {
			if err := shell.SaveCurrentTheme(t); err != nil {
				return err.Error()
			}
			return ""
		}
	}
	return "Thème introuvable"
}

// ── Alias ─────────────────────────────────────────────────────
func (a *App) GetAliases() map[string]string {
	return shell.LoadAliases()
}

func (a *App) SaveAlias(name, command string) string {
	if err := shell.SaveAlias(name, command); err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) DeleteAlias(name string) {
	shell.DeleteAlias(name)
}

// ── Éditeur de fichiers ───────────────────────────────────────
func (a *App) ReadFile(name string) map[string]string {
	dir, _ := os.Getwd()
	fullPath := filepath.Join(dir, name)
	data, err := os.ReadFile(fullPath)
	if err != nil {
		return map[string]string{"content": "", "exists": "false", "path": fullPath}
	}
	return map[string]string{
		"content": string(data),
		"exists":  "true",
		"path":    fullPath,
	}
}

func (a *App) WriteFile(name, content string) string {
	dir, _ := os.Getwd()
	fullPath := filepath.Join(dir, name)
	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return err.Error()
	}
	return ""
}

// ── Opérations fichiers ───────────────────────────────────────

func (a *App) DeleteFile(name string) string {
	dir, _ := os.Getwd()
	fullPath := filepath.Clean(filepath.Join(dir, name))
	if err := os.RemoveAll(fullPath); err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) RenameFile(oldName, newName string) string {
	dir, _ := os.Getwd()
	oldPath := filepath.Clean(filepath.Join(dir, oldName))
	newPath := filepath.Clean(filepath.Join(dir, newName))
	if err := os.Rename(oldPath, newPath); err != nil {
		return err.Error()
	}
	return ""
}

func (a *App) CopyFileTo(srcName, dstName string) string {
	dir, _ := os.Getwd()
	src := filepath.Clean(filepath.Join(dir, srcName))
	dst := filepath.Clean(filepath.Join(dir, dstName))
	info, err := os.Stat(src)
	if err != nil {
		return err.Error()
	}
	if info.IsDir() {
		return leyoCopyDir(src, dst)
	}
	return leyoCopyFile(src, dst)
}

func leyoCopyFile(src, dst string) string {
	in, err := os.Open(src)
	if err != nil {
		return err.Error()
	}
	defer in.Close()
	info, _ := in.Stat()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode())
	if err != nil {
		return err.Error()
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err.Error()
	}
	return ""
}

func leyoCopyDir(src, dst string) string {
	info, err := os.Stat(src)
	if err != nil {
		return err.Error()
	}
	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err.Error()
	}
	entries, err := os.ReadDir(src)
	if err != nil {
		return err.Error()
	}
	for _, e := range entries {
		s := filepath.Join(src, e.Name())
		d := filepath.Join(dst, e.Name())
		if e.IsDir() {
			if msg := leyoCopyDir(s, d); msg != "" {
				return msg
			}
		} else {
			if msg := leyoCopyFile(s, d); msg != "" {
				return msg
			}
		}
	}
	return ""
}

func (a *App) CreateNewFile(name string) string {
	dir, _ := os.Getwd()
	fullPath := filepath.Clean(filepath.Join(dir, name))
	f, err := os.Create(fullPath)
	if err != nil {
		return err.Error()
	}
	f.Close()
	return ""
}

func (a *App) CreateNewDir(name string) string {
	dir, _ := os.Getwd()
	fullPath := filepath.Clean(filepath.Join(dir, name))
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return err.Error()
	}
	return ""
}

// ── PTY réel via ConPTY (Leyo 1.10) ──────────────────────────

// IsPTYCommand détecte les commandes qui nécessitent un terminal interactif.
func (a *App) IsPTYCommand(input string) bool {
	ptyCommands := []string{
		"python", "python3", "py",
		"ssh", "node",
		"mysql", "psql", "redis-cli",
		"powershell", "pwsh",
		"bash", "sh", "wsl",
		"ftp", "telnet",
		"ipython", "julia",
		"vim", "nvim", "nano", "htop",
	}
	lower := strings.ToLower(strings.TrimSpace(input))
	for _, cmd := range ptyCommands {
		if lower == cmd || strings.HasPrefix(lower, cmd+" ") {
			return true
		}
	}
	return false
}

// StartShell lance une session ConPTY persistante (cmd.exe) pour un pane.
// Le frontend reçoit les événements "pty:data:<sessionId>" en continu.
func (a *App) StartShell(sessionId string, cols, rows int) string {
	err := shell.Manager.Start(
		sessionId, cols, rows,
		func(data []byte) {
			// Émet les données brutes (ANSI inclus) au frontend
			runtime.EventsEmit(a.ctx, "pty:data:"+sessionId, string(data))
		},
		func() {
			runtime.EventsEmit(a.ctx, "pty:exit:"+sessionId, nil)
		},
	)
	if err != nil {
		return err.Error()
	}
	return ""
}

// WriteShell envoie des données au PTY (frappe clavier, commande + \r\n).
func (a *App) WriteShell(sessionId, data string) string {
	if err := shell.Manager.Write(sessionId, data); err != nil {
		return err.Error()
	}
	return ""
}

// ResizeShell redimensionne le terminal PTY.
func (a *App) ResizeShell(sessionId string, cols, rows int) {
	shell.Manager.Resize(sessionId, cols, rows)
}

// StopShell ferme proprement la session ConPTY.
func (a *App) StopShell(sessionId string) {
	shell.Manager.Stop(sessionId)
}

// StartPTYSession — gardé pour compatibilité, redirige vers StartShell.
func (a *App) StartPTYSession(sessionId, command string, cols, rows int) string {
	err := shell.Manager.Start(
		sessionId, cols, rows,
		func(data []byte) {
			runtime.EventsEmit(a.ctx, "pty:data:"+sessionId, string(data))
		},
		func() {
			runtime.EventsEmit(a.ctx, "pty:exit:"+sessionId, nil)
		},
	)
	if err != nil {
		return err.Error()
	}
	// Envoie la commande initiale si fournie
	if command != "" {
		shell.Manager.Write(sessionId, command+"\r\n")
	}
	return ""
}

func (a *App) WritePTY(sessionId, data string) string {
	return a.WriteShell(sessionId, data)
}

func (a *App) ResizePTY(sessionId string, cols, rows int) {
	a.ResizeShell(sessionId, cols, rows)
}

func (a *App) StopPTYSession(sessionId string) {
	a.StopShell(sessionId)
}