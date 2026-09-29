const { execFile, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Execute un programme et attend sa fin.
 * Un installeur peut relauncher un processus enfant puis rendre la main : on
 * considere alors qu'il a reussi si aucun code d'echec n'arrive.
 *
 * Retourne { code, timedOut, error }.
 */
function runProcess(exePath, args = [], { timeoutMs = 15 * 60 * 1000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    let child;
    try {
      child = execFile(
        exePath,
        args,
        { timeout: timeoutMs, windowsHide: false, maxBuffer: 1024 * 1024 },
        (err) => {
          if (err?.killed) return done({ code: 0, timedOut: true });
          const code = typeof err?.code === 'number' ? err.code : 0;
          return done({ code, error: code ? err.message : null });
        },
      );
    } catch (err) {
      done({ code: -1, error: err?.message || String(err) });
      return;
    }
    child.on('error', (err) => done({ code: -1, error: err?.message || String(err) }));
  });
}

/* ------------------------- technology des installeurs ------------------- */

const SILENT_ARGS = {
  nsis: ['/S'],
  inno: ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'],
  jpackage: ['/quiet', '/norestart'],
};

function detectInstallerKind(installedExePath) {
  try {
    const info = fs.readFileSync(installedExePath, { encoding: 'latin1' });
    if (info.includes('Nullsoft') || info.includes('NullsoftInst')) return 'nsis';
    if (info.includes('Inno Setup')) return 'inno';
    if (info.includes('WiX') || info.includes('wixburn')) return 'jpackage';
  } catch {
    /* detection best-effort */
  }
  return null;
}

function silentArgsFor(installedExePath, fallback = 'jpackage') {
  const kind = detectInstallerKind(installedExePath) || fallback;
  return SILENT_ARGS[kind] || SILENT_ARGS.jpackage;
}

/* ------------------------------ processus ------------------------------- */

/** Le binaire tourne-t-il encore ? */
function isRunning(exePath) {
  const name = path.basename(exePath || '', '.exe');
  if (!name) return false;
  try {
    const out = execFileSync('tasklist.exe', ['/FI', `IMAGENAME eq ${name}`, '/NH', '/FO', 'CSV'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 8000,
    });
    return out.toLowerCase().includes(`"${name.toLowerCase()}"`);
  } catch {
    return false;
  }
}

function stopRunning(exePath) {
  const name = path.basename(exePath || '', '.exe');
  if (!name) return false;
  try {
    execFileSync('taskkill.exe', ['/F', '/IM', name, '/T'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------- desinstallation --------------------------- */

/**
 * Desinstalleur pose a cote de l'application (NSIS, Inno Setup).
 * jpackage/WiX n'en laisse pas : il faut passer par le registre.
 */
function findUninstallerNextTo(installedExePath) {
  if (!installedExePath) return null;
  const dir = path.dirname(installedExePath);
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = entries.filter((e) => e.isFile() && /\.(exe|cmd|bat)$/i.test(e.name));
  const pick = files
    .map((e) => e.name)
    .filter((n) => /^(unins\d*|uninstall)/i.test(n))
    .sort((a, b) => a.length - b.length);
  if (pick.length) return path.join(dir, pick[0]);

  // jpackage : le bundle d'installation se trouve souvent au niveau parent.
  try {
    const parent = path.dirname(dir);
    const siblings = fs.readdirSync(parent, { withFileTypes: true });
    const found = siblings.find(
      (e) => e.isFile() && /^(unins\d*|uninstall).*\.(exe|cmd)$/i.test(e.name),
    );
    if (found) return path.join(parent, found.name);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Commande de desinstallation declaree dans le registre (WiX/MSI, MSI pur).
 * Retourne { command, args, productCode } ou null.
 */
function findUninstallCommand(appName) {
  const script = `
$keys = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
)
$target = '${String(appName || '').replace(/'/g, "''")}'
foreach ($k in $keys) {
  Get-ChildItem $k -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
    if ($p -and $p.DisplayName -and $p.DisplayName.ToLower().Contains($target.ToLower())) {
      $cmd = $p.QuietUninstallString
      if (-not $cmd) { $cmd = $p.UninstallString }
      if ($cmd) {
        $out = @{
          command = $cmd
          productCode = $p.PSChildName
          systemComponent = [string]$p.SystemComponent
        }
        $out | ConvertTo-Json -Compress
      }
    }
  }
}`;
  try {
    const raw = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 },
    );
    const line = String(raw)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith('{'))
      .pop();
    if (!line) return null;
    const parsed = JSON.parse(line);
    if (!parsed.command) return null;
    return { command: parsed.command, productCode: parsed.productCode };
  } catch {
    return null;
  }
}

module.exports = {
  runProcess,
  detectInstallerKind,
  silentArgsFor,
  isRunning,
  stopRunning,
  findUninstallerNextTo,
  findUninstallCommand,
};
