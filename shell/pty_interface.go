package shell

// Interface commune implémentée par PTYManager (Windows) et ptyManagerStub (autres OS).
type ptyManager interface {
	Start(string, int, int, func([]byte), func()) error
	Write(string, string) error
	Resize(string, int, int)
	Stop(string)
}
