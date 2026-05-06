//go:build windows

package shell

import (
	"os/exec"
	"syscall"
)

func hideCmdWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
