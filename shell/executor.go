package shell

import (
	"os/exec"
	"strings"
)

func Run(input string) {
	result, errMsg := RunWithOutput(input)
	if errMsg != "" {
		println("❌ " + errMsg)
	}
	if result != "" {
		println(result)
	}
}

func RunWithOutput(input string) (string, string) {
	input = ResolveAlias(input)
	command := Parse(input)

	cmd := exec.Command("cmd", "/C", command)
	hideCmdWindow(cmd)

	output, err := cmd.CombinedOutput()
	result := strings.TrimSpace(string(output))

	if err != nil && result == "" {
		return "", err.Error()
	}
	return result, ""
}
