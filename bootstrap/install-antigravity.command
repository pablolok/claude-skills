#!/bin/bash
# macOS double-click wrapper: loads this clone's plugins into Antigravity (see antigravity-plugins.mjs).
cd "$(dirname "$0")/.." || exit 1
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || nvm use 26 >/dev/null 2>&1
fi
node bootstrap/antigravity-plugins.mjs "$@"
status=$?
echo
read -r -p "Press Enter to close. " _
exit $status
