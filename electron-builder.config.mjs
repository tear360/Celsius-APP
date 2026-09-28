import { defineConfig } from 'vite';

export default defineConfig({
  appId: 'com.tear360.celsius',
  productName: 'Celsius',
  copyright: 'Copyright (c) 2026 TEAR36',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: ['dist/**/*', 'electron/**/*', 'package.json', '!**/*.map'],
  extraMetadata: {
    main: 'electron/main.cjs',
  },
  asar: true,
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico',
    artifactName: 'Celsius-Setup-${version}.${ext}',
    legalTrademarks: 'TEAR36',
    generateUpdatesFilesForAllChannels: true,
    electronLanguages: ['fr-FR', 'en-US'],
    requestedExecutionLevel: 'asInvoker',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Celsius',
    menuCategory: 'TEAR36',
    installerLanguages: ['fr_FR', 'en_US'],
    displayLanguageSelector: true,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    include: 'build/installer.nsh',
  },
  publish: [
    {
      provider: 'github',
      owner: 'tear360',
      repo: 'Celsius-APP',
      releaseType: 'release',
    },
  ],
  electronDownload: {
    cache: '.cache/electron',
  },
});
