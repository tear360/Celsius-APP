const { execFile } = require('node:child_process');

/**
 * Lit la version d'un binaire Windows (VERSIONINFO du PE).
 * Retourne null si la version n'est pas exploitable : l'appelant traitera
 * l'application comme installee mais de version inconnue.
 */
function readProductVersion(filePath, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const escaped = String(filePath).replace(/'/g, "''");
    const script =
      `$i = Get-Item -LiteralPath '${escaped}' -ErrorAction SilentlyContinue;` +
      `if ($i) { $v = $i.VersionInfo;` +
      `if ($v.ProductVersion) { $v.ProductVersion }` +
      `elseif ($v.FileVersion) { $v.FileVersion } }`;

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8', windowsHide: true, timeout: timeoutMs, maxBuffer: 1024 * 64 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const value = String(stdout || '').trim();
        resolve(/^\d+(\.\d+)*/.test(value) ? value.trim() : null);
      },
    );
  });
}

module.exports = { readProductVersion };
