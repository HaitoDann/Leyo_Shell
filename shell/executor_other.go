//go:build !windows

package shell

import "os/exec"

func hideCmdWindow(cmd *exec.Cmd) {}
