param(
  [string]$Target = "nsis",
  [switch]$SkipWeb
)
$ErrorActionPreference = "Continue"
Set-Location -LiteralPath "$PWD"

if (-not $SkipWeb) {
  Write-Output "== build web =="
  & npx vite build
  if ($LASTEXITCODE -ne 0) { Write-Output "WEB_BUILD_FAILED=$LASTEXITCODE"; exit 1 }
}

Write-Output "== electron-builder ($Target) =="
& npx electron-builder --config electron-builder.config.mjs --win $Target --publish never
Write-Output "EXITCODE=$LASTEXITCODE"
