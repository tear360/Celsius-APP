import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { CONFIG, DEFAULT_SETTINGS, KV } from '../config.js';
import {
  buildAppEntry,
  fetchLatestRelease,
} from '../lib/github.js';
import { formatBytes, initials, hueFor, stripHtml } from '../lib/format.js';
import * as bridge from '../platform/index.js';

const StoreContext = createContext(null);

const initialState = {
  booted: false,
  status: 'idle',
  bootMessage: 'Demarrage de Celsius…',
  catalog: { name: CONFIG.storeName, apps: [] },
  installed: {},
  settings: { ...DEFAULT_SETTINGS },
  apps: [],
  tasks: {},
  selfUpdate: null,
  selfUpdatePhase: 'idle',
  view: 'home',
  selectedId: null,
  search: '',
  toast: null,
  modal: null,
  appInfo: null,
  systemInfo: null,
  stateInfo: null,
  busy: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'boot':
      return { ...state, ...action.patch };
    case 'status':
      return { ...state, status: action.status, bootMessage: action.message ?? state.bootMessage };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'installed':
      return { ...state, installed: action.installed };
    case 'apps':
      return { ...state, apps: action.apps, status: 'ready' };
    case 'view':
      return { ...state, view: action.view, selectedId: action.selectedId ?? state.selectedId };
    case 'select':
      return { ...state, view: 'detail', selectedId: action.id };
    case 'search':
      return { ...state, search: action.value };
    case 'catalogMeta':
      return { ...state, catalog: { ...state.catalog, ...action.patch } };
    case 'task':
      return { ...state, tasks: { ...state.tasks, [action.task.id]: action.task } };
    case 'taskRemove':
      return { ...state, tasks: omit(state.tasks, action.id) };
    case 'selfUpdate':
      return { ...state, selfUpdate: action.payload };
    case 'selfUpdatePhase':
      return { ...state, selfUpdatePhase: action.phase };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'modal':
      return { ...state, modal: action.modal };
    case 'info':
      return {
        ...state,
        appInfo: action.appInfo,
        systemInfo: action.systemInfo,
        stateInfo: action.stateInfo,
      };
    case 'busy':
      return { ...state, busy: { ...state.busy, [action.key]: action.value } };
    case 'reset':
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

function omit(obj, key) {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

export function installKey(appId, platform) {
  return `${appId}:${platform}`;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

function enrich(app, settings) {
  const changelog = stripHtml(app.changelog);
  return {
    ...app,
    changelog,
    subtitle:
      app.tagline ||
      (app.repo ? app.repo : '') ||
      (app.version ? `v${app.version}` : 'Version inconnue'),
    sizeLabel: app.size ? formatBytes(app.size) : null,
    iconFallback: initials(app.name),
    iconHue: hueFor(app.id || app.name),
    hidden: settings.includePrereleases ? false : app.prerelease,
  };
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastTimer = useRef(null);

  const toast = useCallback((text, kind = 'info', duration = 4200) => {
    dispatch({ type: 'toast', toast: { text, kind, id: Date.now() } });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => dispatch({ type: 'toast', toast: null }), duration);
  }, []);

  const modal = useCallback((payload) => dispatch({ type: 'modal', modal: payload }), []);

  /* ------------------------------------------------------------------ */

  const loadCatalogSource = useCallback(async () => {
    try {
      const res = await fetch(CONFIG.catalogUrl, { cache: 'no-cache' });
      if (res.ok) return { data: await res.json(), from: 'remote' };
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn(
        '[celsius] catalogue distant indisponible, repli sur la copie embarquee',
        err,
      );
    }
    const res = await fetch('apps.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Catalogue embarque introuvable');
    return { data: await res.json(), from: 'embedded' };
  }, []);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        dispatch({ type: 'status', status: 'loading', message: 'Chargement du catalogue…' });
      }
      let source;
      try {
        const res = await loadCatalogSource();
        source = res.data;
        dispatch({ type: 'catalogMeta', patch: { source: res.from } });
      } catch (err) {
        dispatch({ type: 'status', status: 'ready' });
        toast(err.message, 'error');
        return;
      }
      dispatch({
        type: 'catalogMeta',
        patch: { storeName: source.store?.name || CONFIG.storeName },
      });

      const apps = source.apps || [];
      const installedMap = stateRef.current.installed;

      const built = await mapLimit(apps, 5, async (def) => {
        let release = null;
        try {
          release = await fetchLatestRelease(def.repo);
        } catch (err) {
          console.warn(`[celsius] release inaccessible pour ${def.repo}`, err);
        }
        const installed = {};
        for (const platform of ['windows', 'android']) {
          const rec = installedMap[installKey(def.id, platform)];
          if (rec) installed[platform] = rec;
        }
        return enrich(buildAppEntry(def, release, installed), stateRef.current.settings);
      });

      const order = new Map(apps.map((d, i) => [d.id, i]));
      built.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      dispatch({ type: 'apps', apps: built });
    },
    [loadCatalogSource, toast],
  );


  /* ------------------------------ install ----------------------------- */

  const setTask = useCallback((task) => dispatch({ type: 'task', task }), []);

  const doInstall = useCallback(
    async (app, targetPlatform, { skipConfirm = false } = {}) => {
      const entry = app.platforms[targetPlatform];
      if (!entry?.asset) {
        toast('Aucun fichier pour cette plateforme.', 'error');
        return;
      }
      if (entry.status === 'up-to-date') {
        toast(`${app.name} est deja a jour.`, 'info');
        return;
      }
      const run = async () => {
        setTask({
          id: `${app.id}:${targetPlatform}:${Date.now()}`,
          appId: app.id,
          appName: app.name,
          platform: targetPlatform,
          version: app.version,
          assetName: entry.asset.name,
          url: entry.asset.url,
          size: entry.asset.size,
          kind: entry.asset.kind,
          phase: 'queued',
          received: 0,
          total: entry.asset.size || 0,
          percent: 0,
          error: null,
        });
        try {
          const res = await bridge.install({
            appId: app.id,
            appName: app.name,
            asset: entry.asset,
            version: app.version,
            platform: targetPlatform,
          });
          setTask({
            id: res.taskId,
            appId: app.id,
            appName: app.name,
            platform: targetPlatform,
            version: app.version,
            assetName: entry.asset.name,
            size: entry.asset.size,
            kind: entry.asset.kind,
            phase: 'downloading',
            received: 0,
            total: entry.asset.size || 0,
            percent: 0,
          });
        } catch (err) {
          setTask({
            id: `${app.id}:${targetPlatform}:${Date.now()}`,
            appId: app.id,
            appName: app.name,
            platform: targetPlatform,
            phase: 'error',
            error: err?.message || String(err),
            received: 0,
            total: 0,
            percent: 0,
          });
          toast(`Echec de l'installation : ${err?.message || err}`, 'error');
        }
      };

      if (
        !skipConfirm &&
        entry.asset.kind === 'installer' &&
        stateRef.current.settings.confirmInstall
      ) {
        modal({
          kind: 'confirm',
          title: `Installer ${app.name} ?`,
          body: `Le fichier « ${entry.asset.name} » sera telecharge puis execute. Windows peut afficher un avertissement SmartScreen pour un editeur inconnu : clique sur « Plus d'informations » puis « Executer quand meme ».`,
          confirmLabel: 'Telecharger et installer',
          onConfirm: run,
        });
        return;
      }
      await run();
    },
    [modal, setTask, toast],
  );

  const cancelTask = useCallback(async (taskId) => {
    try {
      await bridge.cancel(taskId);
    } catch {
      /* ignore */
    }
    dispatch({ type: 'taskRemove', id: taskId });
  }, []);

  const rememberInstall = useCallback(
    async (app, targetPlatform, record) => {
      const key = installKey(app.id, targetPlatform);
      let version = record.version;
      let installedPath = record.path || null;
      if (targetPlatform === 'android' && app.androidPackage) {
        const real = await bridge.installedVersionOf?.(app.androidPackage);
        if (real) version = real;
      }
      const next = { ...stateRef.current.installed };
      next[key] = {
        version,
        installedAt: Date.now(),
        path: installedPath,
        packageName: record.packageName || app.androidPackage || null,
        assetName: record.assetName || null,
      };
      await bridge.kvSet(KV.installed, next);
      dispatch({ type: 'installed', installed: next });
      await refresh({ silent: true });
    },
    [refresh],
  );

  const launchApp = useCallback(
    async (app, targetPlatform) => {
      const entry = app.platforms[targetPlatform];
      const rec = entry?.installed;
      try {
        if (targetPlatform === 'android' && app.androidPackage) {
          await bridge.launch({ platform: 'android', packageName: app.androidPackage });
          return;
        }
        const res = await bridge.launch({
          platform: 'windows',
          appName: app.name,
          executablePath: rec?.path || null,
        });
        if (res?.cancelled) {
          toast('Aucun executable trouve pour cette app.', 'info');
          return;
        }
        if (res?.path && res.path !== rec?.path) {
          // Chemin trouve par l'exploration (ou choisi a la main) : on le garde
          // pour que les prochains lancements soient instantanes.
          await rememberInstall(app, targetPlatform, {
            version: rec?.version || app.version,
            path: res.path,
            assetName: rec?.assetName,
          });
          if (res.picked) toast(`Chemin de lancement memorise pour ${app.name}.`, 'success');
        }
      } catch (err) {
        toast(err?.message || String(err), 'error');
      }
    },
    [rememberInstall, toast],
  );
  const markInstalled = useCallback(
    async (appId, targetPlatform, record) => {
      const app = stateRef.current.apps.find((a) => a.id === appId);
      if (!app) return;
      await rememberInstall(app, targetPlatform, record);
    },
    [rememberInstall],
  );

  const uninstallApp = useCallback(
    async (app, targetPlatform) => {
      const key = installKey(app.id, targetPlatform);
      const rec = stateRef.current.installed[key];
      if (!rec) return;
      try {
        if (targetPlatform === 'android') {
          await bridge.openExternal(`package:${app.androidPackage || rec.packageName}`);
        } else if (rec.path) {
          await bridge.revealPath(rec.path);
          return;
        }
      } catch {
        /* ignore */
      }
      modal({
        kind: 'confirm',
        title: 'Retirer de la bibliotheque ?',
        body:
          targetPlatform === 'android'
            ? `${app.name} sera ouvert dans les reglages systeme de ton appareil pour le desinstaller.`
            : `Le dossier de ${app.name} sera ouvert dans l'explorateur. Desinstalle-le avec le desinstalleur de Windows, puis confirme ici.`,
        confirmLabel: "J'ai desinstalle",
        onConfirm: async () => {
          const next = { ...stateRef.current.installed };
          delete next[key];
          await bridge.kvSet(KV.installed, next);
          dispatch({ type: 'installed', installed: next });
          await refresh({ silent: true });
          toast(`${app.name} retire de la bibliotheque.`, 'success');
        },
      });
    },
    [modal, refresh, toast],
  );


  /**
   * Reconstruit la bibliotheque en parcourant le disque.
   * Filet de securite quand l'etat a ete perdu ou quand une app a ete
   * installee en dehors de Celsius.
   */
  const detectInstalled = useCallback(async () => {
    const list = stateRef.current.apps.map((a) => ({
      id: a.id,
      name: a.name,
      androidPackage: a.androidPackage,
    }));
    if (!list.length) {
      toast('Le catalogue est vide.', 'info');
      return;
    }
    dispatch({ type: 'busy', key: 'detect', value: true });
    try {
      const found = await bridge.detectInstalled(list);
      const next = { ...stateRef.current.installed };
      let changed = 0;
      for (const item of found) {
        if (!item?.id || !item.platform) continue;
        const key = installKey(item.id, item.platform);
        const prev = next[key];
        const version = item.version || prev?.version || null;
        const path = item.path || prev?.path || null;
        if (prev?.path === path && prev?.version === version) continue;
        next[key] = {
          version,
          // Conserve la date d'origine : une detection n'est pas une installation.
          installedAt: prev?.installedAt || Date.now(),
          path,
          packageName: prev?.packageName || null,
          assetName: prev?.assetName || null,
        };
        changed += 1;
      }
      if (changed) {
        await bridge.kvSet(KV.installed, next);
        dispatch({ type: 'installed', installed: next });
        await refresh({ silent: true });
        toast(`${changed} application(s) retrouvee(s) sur ce PC.`, 'success');
      } else {
        toast('Toutes les apps du catalogue sont deja declarees.', 'info');
      }
    } catch (err) {
      toast(err?.message || String(err), 'error');
    } finally {
      dispatch({ type: 'busy', key: 'detect', value: false });
    }
  }, [refresh, toast]);

  /* ----------------------------- settings ----------------------------- */

  const saveSettings = useCallback(
    async (patch) => {
      const next = { ...stateRef.current.settings, ...patch };
      await bridge.kvSet(KV.settings, next);
      dispatch({ type: 'settings', patch });
      if ('includePrereleases' in patch) {
        await refresh({ silent: true });
      }
      return next;
    },
    [refresh],
  );

  /* --------------------------- self update ---------------------------- */

  const checkSelf = useCallback(
    async ({ manual = false } = {}) => {
      dispatch({ type: 'selfUpdatePhase', phase: 'checking' });
      try {
        const res = await bridge.checkSelfUpdate({
          includePrereleases: stateRef.current.settings.includePrereleases,
        });
        dispatch({ type: 'selfUpdate', payload: res });
        dispatch({ type: 'selfUpdatePhase', phase: res.available ? 'available' : 'idle' });
        if (manual) {
          toast(
            res.available ? `Celsius ${res.version} est disponible.` : 'Celsius est a jour.',
            res.available ? 'info' : 'success',
          );
        }
        if (res.available) {
          modal({
            kind: 'update',
            update: res,
          });
        }
        return res;
      } catch (err) {
        dispatch({ type: 'selfUpdatePhase', phase: 'idle' });
        if (manual) toast(err?.message || String(err), 'error');
        return null;
      }
    },
    [modal, toast],
  );

  const applySelf = useCallback(async () => {
    dispatch({ type: 'selfUpdatePhase', phase: 'downloading' });
    try {
      await bridge.applySelfUpdate('install');
    } catch (err) {
      dispatch({ type: 'selfUpdatePhase', phase: 'idle' });
      toast(err?.message || String(err), 'error');
    }
  }, [toast]);

  /* ------------------------------- boot ------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: 'status', message: 'Lecture de la configuration…' });
      const [appInfo, systemInfo, stateInfo, settings, installed] = await Promise.all([
        bridge.info(),
        bridge.systemInfo().catch(() => null),
        bridge.stateInfo().catch(() => null),
        bridge.kvGet(KV.settings).catch(() => null),
        bridge.kvGet(KV.installed).catch(() => null),
      ]);
      if (cancelled) return;
      dispatch({
        type: 'settings',
        patch: { ...DEFAULT_SETTINGS, ...(settings || {}) },
      });
      dispatch({ type: 'installed', installed: installed || {} });
      dispatch({ type: 'info', appInfo, systemInfo, stateInfo });
      await refresh();
      if (cancelled) return;
      dispatch({ type: 'boot', patch: { booted: true, status: 'ready' } });
      if (stateRef.current.settings.autoCheckUpdates) {
        setTimeout(() => checkSelf(), 6000);
      }
    })().catch((err) => {
      dispatch({ type: 'boot', patch: { booted: true, status: 'error', bootMessage: String(err) } });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- bridge subscriptions ---------------------- */

  useEffect(() => {
    const offProgress = bridge.onDownloadProgress(async (evt) => {
      const task = stateRef.current.tasks[evt.taskId];
      if (!task) return;
      const total = evt.total || task.total || 0;
      setTask({
        ...task,
        phase: 'downloading',
        received: evt.received,
        total,
        percent: total ? Math.min(100, (evt.received / total) * 100) : task.percent,
        speed: evt.speed || task.speed,
        filePath: evt.path || task.filePath,
      });
    });

    const offState = bridge.onTaskState(async (evt) => {
      const task = stateRef.current.tasks[evt.taskId];
      if (!task) return;
      if (evt.phase === 'downloaded') {
        setTask({ ...task, phase: 'downloading', percent: 100, received: task.total });
      } else if (evt.phase === 'installing' || evt.phase === 'launching') {
        setTask({ ...task, phase: 'installing' });
      } else if (evt.phase === 'error') {
        setTask({ ...task, phase: 'error', error: evt.error });
        toast(`${task.appName} : ${evt.error}`, 'error');
      } else if (evt.phase === 'done') {
        setTask({ ...task, phase: 'done', percent: 100 });
        await markInstalled(task.appId, task.platform, {
          version: task.version,
          path: evt.path || task.filePath || null,
          assetName: task.assetName,
        });
        toast(`${task.appName} installe.`, 'success');
        setTimeout(() => dispatch({ type: 'taskRemove', id: task.id }), 2500);
      } else if (evt.phase === 'awaiting-install') {
        setTask({ ...task, phase: 'awaiting-install' });
        await markInstalled(task.appId, task.platform, {
          version: task.version,
          path: evt.path || task.filePath || null,
          assetName: task.assetName,
        });
        toast(`Confirme l'installation de ${task.appName} sur ton appareil.`, 'info', 6000);
      } else if (evt.phase === 'needs-permission') {
        setTask({ ...task, phase: 'needs-permission', error: evt.error });
        toast(
          "Android doit autoriser Celsius a installer des APK. Active l'option puis reessaie.",
          'info',
          8000,
        );
      } else if (evt.phase === 'cancelled') {
        dispatch({ type: 'taskRemove', id: task.id });
      }
    });

    const offUpdate = bridge.onSelfUpdateEvent((evt) => {
      if (evt.phase === 'downloaded') {
        dispatch({ type: 'selfUpdatePhase', phase: 'downloaded' });
        modal({ kind: 'update', update: { ...stateRef.current.selfUpdate, readyToInstall: true } });
      } else if (evt.phase === 'error') {
        dispatch({ type: 'selfUpdatePhase', phase: 'idle' });
        toast(evt.error || 'Mise a jour impossible.', 'error');
      }
    });


    return () => {
      offProgress?.();
      offState?.();
      offUpdate?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markInstalled, toast]);

  /* ------------------------------ derived ----------------------------- */

  const visibleApps = useMemo(
    () =>
      state.apps
        .filter((a) => !a.hidden)
        .filter((a) => {
          const q = state.search.trim().toLowerCase();
          if (!q) return true;
          return a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q);
        }),
    [state.apps, state.search],
  );

  const updates = useMemo(() => state.apps.filter((a) => a.needsUpdate), [state.apps]);
  const library = useMemo(
    () => state.apps.filter((a) => ['windows', 'android'].some((p) => a.platforms[p]?.installed)),
    [state.apps],
  );
  const selected = useMemo(
    () => state.apps.find((a) => a.id === state.selectedId) || null,
    [state.apps, state.selectedId],
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      visibleApps,
      updates,
      library,
      selected,
      toast,
      modal,
      refresh,
      doInstall,
      cancelTask,
      launchApp,
      uninstallApp,
      markInstalled,
      saveSettings,
      detectInstalled,
      checkSelf,
      applySelf,
    }),
    [
      state,
      visibleApps,
      updates,
      library,
      selected,
      toast,
      modal,
      refresh,
      doInstall,
      cancelTask,
      launchApp,
      uninstallApp,
      markInstalled,
      saveSettings,
      detectInstalled,
      checkSelf,
      applySelf,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit etre utilise dans StoreProvider');
  return ctx;
}
