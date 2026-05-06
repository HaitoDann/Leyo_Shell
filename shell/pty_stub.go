//go:build !windows

package shell

// Stub pour les plateformes non-Windows (build CI / macOS / Linux).
// L'implémentation réelle ConPTY est dans pty.go (//go:build windows).

type ptyManagerStub struct{}

func (m *ptyManagerStub) Start(sessionId string, cols, rows int,
	onData func([]byte), onExit func()) error {
	return nil
}
func (m *ptyManagerStub) Write(sessionId, data string) error { return nil }
func (m *ptyManagerStub) Resize(sessionId string, cols, rows int) {}
func (m *ptyManagerStub) Stop(sessionId string)                   {}

var Manager ptyManager = &ptyManagerStub{}
