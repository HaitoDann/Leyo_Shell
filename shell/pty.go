//go:build windows

package shell

import (
	"context"
	"fmt"
	"io"
	"os"
	"sync"

	"github.com/UserExistsError/conpty"
)

// PTYSession encapsule une session ConPTY Windows (un process cmd.exe persistant).
// Chaque pane du frontend a sa propre session.
type PTYSession struct {
	id     string
	cpty   *conpty.ConPTY
	cancel context.CancelFunc
	mu     sync.Mutex
	closed bool
}

// PTYManager gère toutes les sessions actives.
type PTYManager struct {
	mu       sync.RWMutex
	sessions map[string]*PTYSession
}

// Assure que PTYManager satisfait l'interface ptyManager du stub.
var _ ptyManager = (*PTYManager)(nil)

var Manager ptyManager = &PTYManager{
	sessions: make(map[string]*PTYSession),
}

// Start lance une nouvelle session ConPTY pour le sessionId donné.
// onData est appelé à chaque chunk de sortie PTY (ANSI inclus).
// onExit est appelé quand le processus se termine.
func (m *PTYManager) Start(sessionId string, cols, rows int,
	onData func(data []byte),
	onExit func(),
) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Ferme une éventuelle session existante avec ce même id
	if old, ok := m.sessions[sessionId]; ok {
		old.Close()
	}

	cpty, err := conpty.Start(
		`cmd.exe`,
		conpty.ConPtyDimensions(uint16(cols), uint16(rows)),
	)
	if err != nil {
		return fmt.Errorf("conpty start: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	sess := &PTYSession{
		id:     sessionId,
		cpty:   cpty,
		cancel: cancel,
	}
	m.sessions[sessionId] = sess

	// Goroutine de lecture — envoie les chunks au frontend
	go func() {
		defer func() {
			sess.mu.Lock()
			sess.closed = true
			sess.mu.Unlock()
			cancel()
			if onExit != nil {
				onExit()
			}
		}()

		buf := make([]byte, 4096)
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}
			n, err := cpty.Read(buf)
			if n > 0 {
				chunk := make([]byte, n)
				copy(chunk, buf[:n])
				onData(chunk)
			}
			if err != nil {
				if err != io.EOF && err != os.ErrClosed {
					// Erreur réelle — on laisse onExit s'en charger
				}
				return
			}
		}
	}()

	return nil
}

// Write envoie des données (touches, commandes) au PTY.
func (m *PTYManager) Write(sessionId, data string) error {
	m.mu.RLock()
	sess, ok := m.sessions[sessionId]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("session %q introuvable", sessionId)
	}
	sess.mu.Lock()
	defer sess.mu.Unlock()
	if sess.closed {
		return fmt.Errorf("session %q fermée", sessionId)
	}
	_, err := sess.cpty.Write([]byte(data))
	return err
}

// Resize redimensionne le PTY.
func (m *PTYManager) Resize(sessionId string, cols, rows int) {
	m.mu.RLock()
	sess, ok := m.sessions[sessionId]
	m.mu.RUnlock()
	if !ok {
		return
	}
	sess.mu.Lock()
	defer sess.mu.Unlock()
	if !sess.closed {
		sess.cpty.Resize(uint16(cols), uint16(rows))
	}
}

// Stop ferme proprement la session.
func (m *PTYManager) Stop(sessionId string) {
	m.mu.Lock()
	sess, ok := m.sessions[sessionId]
	if ok {
		delete(m.sessions, sessionId)
	}
	m.mu.Unlock()
	if ok {
		sess.Close()
	}
}

func (s *PTYSession) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.closed = true
		s.cancel()
		s.cpty.Close()
	}
}
