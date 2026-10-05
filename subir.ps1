# Crea el repositorio privado en GitHub, guarda la clave de firma como secreto y sube el código (Windows).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
gh auth status | Out-Null
git init -b main
git add .
git commit -m "Voltio: primera versión"
gh repo create voltio --private --source=. --remote=origin
Get-Content -Raw signing\voltio.keystore.b64 | gh secret set ANDROID_KEYSTORE_BASE64
Get-Content -Raw signing\password.txt | gh secret set KEYSTORE_PASSWORD
git push -u origin main
Write-Host "Compilando en GitHub Actions..."
Start-Sleep -Seconds 8
$id = gh run list --limit 1 --json databaseId -q '.[0].databaseId'
gh run watch --exit-status $id
$url = gh repo view --json url -q .url
Write-Host ""
Write-Host "Listo. Descarga el APK desde el movil en: $url/releases/latest"
