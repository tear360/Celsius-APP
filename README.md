# Celsius

**Celsius** est un store d'applications personnel pour **Windows** et **Android**, publie par TEAR36.
Il lit tes depots GitHub, trouve le bon installeur dans chaque release, telecharge, installe,
lance, et gere les mises a jour tout seul — sans passer par le Play Store ni le Microsoft Store.

```
Celsius-Setup-1.0.0.exe     installateur Windows (NSIS)
Celsius-1.0.0.apk           APK Android signe
```

---

## Ce que fait Celsius

| Fonction | Windows | Android |
| --- | :---: | :---: |
| Catalogue d'apps pilote par `apps.json` | ✅ | ✅ |
| Detection automatique de l'installeur / APK dans une release | ✅ | ✅ |
| Telechargement avec barre de progression et vitesse | ✅ | ✅ |
| Installation (lance l'exe / ouvre l'instalteur systeme) | ✅ | ✅ |
| Suivi des versions installees + badge « MAJ » | ✅ | ✅ |
| Lancement d'une app installee | ✅ (recherche l'exe) | ✅ (package Android) |
| Historique des versions et notes de release | ✅ | ✅ |
| **Mise a jour de Celsius depuis la nouvelle release GitHub** | ✅ `electron-updater` | ✅ APK +installeur |
| Mise a jour des apps du catalogue | ✅ | ✅ |

## Comment la selection des fichiers fonctionne

Pour chaque app, Celsius parcourt les assets de la release GitHub et applique ces regles
**dans l'ordre** (premiere regle qui gagne) :

| # | Regle Windows | Resultat |
| --- | --- | --- |
| 1 | contient `Windows-Setup` + `.exe` | installeur |
| 2 | contient `Windows` + `.zip` | version portable (decompressee dans `%APPDATA%/Celsius/apps`) |
| 3 | n'importe quel `.exe` / `.msi` | installeur |

| # | Regle Android | Resultat |
| --- | --- | --- |
| 1 | contient `Android` + `.apk` | APK |

Si tes assets portent d'autres noms, surcharge les regles pour cette app dans
`apps.json` (champ `assets`). Chaque regle est `{ "match": "<regex>", "kind": "installer|portable|apk" }`.

---

## Gerer le catalogue

Le catalogue vit dans **`public/apps.json`** du depot. Celsius le lit **depuis GitHub**
(`raw.githubusercontent.com/.../public/apps.json`, URL definie dans `src/config.js`) : tu pushes,
les clients qui rafraichissent voient la nouvelle app. Il reste une copie embarquee dans l'app
comme repli hors ligne, et un indicateur dans les reglages indique laquelle est utilisee.

### Ajouter une application

```jsonc
{
  "id": "mon-app",                    // identifiant unique, sert de cle locale
  "name": "Mon App",                  // nom affiche
  "repo": "tear360/mon-app",          // depot qui porte les releases
  "tagline": "Une phrase courte",     // sous-titre sur la carte
  "description": "Description longue.\nLigne 2…",
  "icon": "https://raw.githubusercontent.com/tear360/mon-app/main/icon.png",
  "androidPackage": "com.exemple.app",// optionnel : permet le bouton « Lancer » sur Android
  "website": "https://…",
  "assets": {                         // optionnel : surcharge les regles par defaut
    "windows": [
      { "match": "Setup-.*\\.exe$", "kind": "installer" }
    ],
    "android": [
      { "match": "release-.*\\.apk$", "kind": "apk" }
    ]
  }
}
```

Le workflow `ci.yml` valide `apps.json` a chaque push (JSON, champs obligatoires, ids uniques,
regex valides). Il n'y a **pas de categories** : le catalogue est une liste, l'ordre du fichier
est l'ordre d'affichage.

## Persistance et bibliotheque

Celsius retient les versions installees dans `%APPDATA%\Celsius\celsius-state.json`
(le chemin est affiche dans les reglages).

Une mise a jour remplace les fichiers de l'application ; ce fichier peut devenir momentanement
illisible (verrou, antivirus, ecriture interrompue). Pour ne jamais transformer un fichier
illisible en « zero donnee » et l'ecraser ensuite :

- chaque ecriture est atomique (`*.tmp` puis `rename`) et laisse un miroir `.bak` du dernier
  etat connu bon ;
- la lecture fusionne les deux copies et garde l'entree la plus recente par application ;
- si le fichier principal est illisible au demarrage, un bandeau le signale dans les reglages.

**Rattrapage manuel** : le bouton « Rechercher les apps installees » (reglages, ou etat vide de
la bibliotheque) parcourt les dossiers d'installation du catalogue et reconstruit les entrees
manquantes, en lisant la version du binaire. Une application trouvee sans version exploitable est
consideree a jour plutot que de declencher une fausse notification de mise a jour.

---

## Architecture

Un seul code d'interface, deux coques natives.

```
src/                    interface React (unique)
  lib/                  API GitHub, semver, formats
  platform/electron.js  bridge -> IPC     (Windows)
  platform/android.js   bridge -> Capacitor (Android)
  state/store.jsx       catalogue, installs, telechargements, MAJ
electron/
  main.cjs              protocole app://, fenetre frameless, IPC, telechargements
  preload.cjs           contextBridge (sandbox on, contextIsolation on)
  lib/                  json-store, downloader (redirects + progress), updater
android/                projet Capacitor + plugin natif CelsiusPlugin.java
public/apps.json        catalogue
build/installer.nsh     points d'integration NSIS
```

Le processus principal sert le bundle via un protocole `app://` custom
(plutot que `file://`), ce qui garde `fetch()` et les CSP habituels.

### Le plugin natif Android

`CelsiusPlugin.java` gere ce que Capacitor ne fait pas seul :

- `download` — telecharge l'APK en suivant les redirections GitHub, emet la progression
- `installApk` — `FileProvider` + `ACTION_VIEW` vers l'instalteur systeme, avec renvoi vers les
  reglages « installer des apps inconnues » si la permission `REQUEST_INSTALL_PACKAGES` manque
- `launchPackage` — lance une autre app via son package name
- `uninstallPackage` / `openExternal` / `isPackageInstalled`

Permissions declarees : `INTERNET`, `ACCESS_NETWORK_STATE`, `REQUEST_INSTALL_PACKAGES`,
plus un bloc `<queries>` pour la visibilite des packages (Android 11+).

## Integration Windows

- Fenetre sans chrome avec **contrôles de fenêtre dessinés par l'app** (réduire / agrandir /
  fermer, style Windows 11) et zone de glisser. Le `titleBarOverlay` natif a été abandonné : sur
  certaines machines son bouton de fermeture ne faisait que réduire la fenêtre au lieu de quitter.
  La fermeture appelle `destroy()` puis `app.quit()` : aucun processus ne survit.
- Raccourcis **Start Menu** et **Bureau**, dossier de menu `TEAR36`
- Entrée dans **Paramètres → Applications → Celsius** (désinstalleur NSIS)
- Installateur **par utilisateur** (pas d'UAC), dossier au choix, **français / anglais**
- `app.setAppUserModelId('com.tear360.celsius')` : regroupement de barre des tâches et notifications
- Protocole `app://bundle/` interne (aucun accès disque depuis le renderer)

### Lancement d'une application installée

Un installeur `.exe` téléchargé n'est **jamais** mémorisé comme chemin d'application : le dossier
d'installation n'existe qu'une fois l'assistant terminé. Au moment du lancement, `electron/lib/resolve.cjs`
explore `%LOCALAPPDATA%\Programs`, `%LOCALAPPDATA%`, `Program Files` et `Program Files (x86)` :

- les installeurs et désinstalleurs (`*Setup*`, `*Installer*`, `unins*`, …) sont exclus ;
- le nom du binaire prime sur le nom du dossier (`QuizRevise-v1.4.5.exe` bat `unins000.exe`) ;
- la comparaison ignore casse, accents et séparateurs ;
- si rien n'est trouvé, un sélecteur de fichier s'ouvre **une seule fois** et le chemin est mémorisé.

C'est ce mécanisme qui évite de retomber sur l'installeur au clic sur « Lancer ».

---

## Auto-update de Celsius

**Windows** — `electron-updater` lit le `latest.yml` publie avec la release, telecharge le
delta en arriere-plan et propose « Redemarrer et installer ». Si le packager est lance hors
mode empaquete, un repli manuel telecharge l'installateur et l'execute en `/S`.

**Android** — le Play Store n'intervient pas sur un APK sideloade : Celsius interroge
`api.github.com/repos/tear360/Celsius-APP/releases/latest`, telecharge l'APK de la release,
puis ouvre l'instalteur systeme. Comme l'APK est signe avec la meme cle a chaque build,
Android accepte la mise a jour par-dessus l'existante.

### Publier une nouvelle version

```bash
npm version 1.1.0        # met a jour package.json (source de verite)
git push --follow-tags   # declenche .github/workflows/release.yml
```

Le workflow construit l'installateur Windows et l'APK Android, puis cree la release
`Celsius-Setup-<version>.exe`, `Celsius-<version>.apk` et `latest.yml`.

### Secrets necessaires

| Secret | Role | Requis |
| --- | --- | --- |
| `GITHUB_TOKEN` | fourni automatiquement par GitHub Actions | non |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 keys/celsius-release.jks` | **oui** |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore | **oui** |
| `ANDROID_KEY_ALIAS` | alias de cle (`celsius`) | **oui** |
| `ANDROID_KEY_PASSWORD` | mot de passe de la cle | **oui** |

> **Ne perds pas `keys/celsius-release.jks`.** Sans la meme cle, Android refusera toute
> mise a jour d'une installation existante (il faut desinstaller au prealable).
> Sans secret, la CI signe l'APK avec la cle de debug — pratique pour tester, mais pas pour diffuser.

## Developpement

```bash
npm install
npm run check                     # lint + tests + build  (a lancer avant chaque push)

npm run dev                       # Vite seul (le store n'a pas de bridge natif)
npm run dev:electron              # Vite + Electron (les deux terminaux)
npm run build                     # bundle web -> dist/
npm run cap:sync                  # build + copie vers android/
node scripts/make-icons.mjs       # icon.png / icon.ico / mipmaps / splash

npm run android:apk               # APK release signe (variables CELSIUS_* requises)
powershell -File scripts/build-win.ps1    # installateur Windows -> release/
```

### Tests

`npm test` execute trois suites, sans dependance externe :

| Suite | Couverture |
| --- | --- |
| `scripts/test-semver.mjs` | comparaison de versions, pre-releases, entrees invalides |
| `scripts/test-resolve.cjs` | resolution de l'executable installe (8 scenarios NSIS / Program Files / portable) |
| `scripts/test-catalog.mjs` | selection des assets, statuts installed / a jour / MAJ, catalogue invalide |
| `scripts/test-store.mjs` | persistance : fichier tronque, absent, copie de secours, fusion |

`npm run lint` applique ESLint avec `no-use-before-define` et les regles de hooks React : un
composant qui lit une variable declaree plus bas entraine une erreur TDZ au premier rendu et
l'application demarre avec une page blanche sans message — c'est exactement le piege que ces
regles bloquent.

Variables pour signer l'APK en local :

```powershell
$env:CELSIUS_KEYSTORE_PATH   = "$PWD\keys\celsius-release.jks"
$env:CELSIUS_KEYSTORE_PASSWORD = "…"
$env:CELSIUS_KEY_ALIAS      = "celsius"
$env:CELSIUS_KEY_PASSWORD    = "…"
```

## Configuration GitHub

Dans **Settings → Actions → General → Workflow permissions**, mets
**Read and write permissions**. Le `GITHUB_TOKEN` doit pouvoir creer les releases.

## Licence

MIT — voir [LICENSE](LICENSE).
