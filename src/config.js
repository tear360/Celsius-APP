export const CONFIG = {
  storeName: 'Celsius',
  vendor: 'TEAR36',
  selfRepo: 'tear360/Celsius-APP',
  repoUrl: 'https://github.com/tear360/Celsius-APP',
  releasesApi: 'https://api.github.com/repos/tear360/Celsius-APP/releases',
  supportUrl: 'https://github.com/tear360/Celsius-APP/issues',
  /** Page "nouvelle issue" pre-remplie par le menu de signalement. */
  issueBase: 'https://github.com/tear360/Celsius-APP/issues/new',
  /** Catalogue par defaut : lu depuis le repo, donc modifiable sans re-publier l'app. */
  catalogUrl: 'https://raw.githubusercontent.com/tear360/Celsius-APP/main/public/apps.json',
  catalogEditUrl: 'https://github.com/tear360/Celsius-APP/blob/main/public/apps.json',
  defaultWindowsAsset: [/Celsius-Setup-.*\.exe$/i, /\.exe$/i],
  defaultApkAsset: [/Celsius-.*\.apk$/i, /\.apk$/i],
};

export const KV = {
  installed: 'celsius.installed',
  settings: 'celsius.settings',
};

export const DEFAULT_SETTINGS = {
  includePrereleases: false,
  autoCheckUpdates: true,
  confirmInstall: true,
  startMaximized: false,
};
