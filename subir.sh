#!/usr/bin/env bash
# Crea el repositorio privado en GitHub, guarda la clave de firma como secreto y sube el código.
set -e
cd "$(dirname "$0")"
gh auth status >/dev/null
git init -b main
git add .
git commit -m "Voltio: primera versión"
gh repo create voltio --private --source=. --remote=origin
gh secret set ANDROID_KEYSTORE_BASE64 < signing/voltio.keystore.b64
gh secret set KEYSTORE_PASSWORD < signing/password.txt
git push -u origin main
echo "Compilando en GitHub Actions…"
sleep 8
gh run watch --exit-status "$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')"
echo
echo "Listo. Descarga el APK desde el móvil en:"
echo "$(gh repo view --json url -q .url)/releases/latest"
