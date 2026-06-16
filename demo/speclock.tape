# Demo recording script for speclock, using charmbracelet/vhs.
#
#   1. Install vhs:            brew install vhs     (or: go install github.com/charmbracelet/vhs@latest)
#   2. Record the GIF:         vhs demo/speclock.tape
#   3. Output:                 demo/speclock.gif    (embed it at the top of README.md)
#
# The tape runs the real CLI against a throwaway project in /tmp, so it always
# reflects current behavior. Alternatively, record with asciinema:
#   asciinema rec demo/speclock.cast -c "bash demo/run.sh"

Output demo/speclock.gif

Set Shell "bash"
Set FontSize 18
Set Width 1100
Set Height 760
Set Padding 18
Set Theme "Catppuccin Mocha"

Type "cd $(mktemp -d) && alias speclock='npx -y github:aymandakir-gh/speclock'" Enter
Sleep 1s

Type "# 1. scaffold a spec" Enter
Type "speclock init" Enter
Sleep 3s

Type "# 2. lock the acceptance criteria" Enter
Type "speclock plan" Enter
Sleep 3s

Type "# 3. before tests exist, the gate is honest:" Enter
Type "speclock status" Enter
Sleep 3s

Type "# every criterion is ❌ until a passing test maps to it." Enter
Sleep 2s
