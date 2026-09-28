import { isNewer } from './semver.js';

const API = 'https://api.github.com';
const memory = new Map();

function headers(token) {
  const h = { Accept: 'application/vnd.github+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh(path, token, signal) {
  const res = await fetch(`${API}${path}`, { headers: headers(token), signal });
  if (res.status === 304) return { notModified: true };
  if (res.status === 404) {
    const err = new Error('Introuvable sur GitHub');
    err.status = 404;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('Limite de l\'API GitHub atteinte (60 requetes/h sans jeton)');
    err.status = 403;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Erreur GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function pickAsset(assets, rules) {
  if (!Array.isArray(assets) || !assets.length) return null;
  for (const rule of rules || []) {
    let re;
    try {
      re = new RegExp(rule.match, 'i');
    } catch {
      continue;
    }
    const found = assets.find((a) => re.test(a.name));
    if (found) return { ...found, kind: rule.kind };
  }
  return null;
}

function toRelease(raw) {
  return {
    id: raw.id,
    tag: raw.tag_name,
    version: String(raw.tag_name || '').replace(/^v/i, ''),
    name: raw.name || raw.tag_name,
    body: raw.body || '',
    prerelease: Boolean(raw.prerelease),
    draft: Boolean(raw.draft),
    publishedAt: raw.published_at,
    url: raw.html_url,
    assets: (raw.assets || []).map((a) => ({
      name: a.name,
      size: a.size,
      url: a.browser_download_url,
      contentType: a.content_type,
      downloadCount: a.download_count,
      updatedAt: a.updated_at,
    })),
  };
}

export async function fetchLatestRelease(full, { token, signal } = {}) {
  const cacheKey = `${full}@latest:${token ? 'auth' : 'anon'}`;
  const hit = memory.get(cacheKey);
  if (hit && Date.now() - hit.at < 60_000) return hit.data;
  const raw = await gh(`/repos/${full}/releases/latest`, token, signal);
  const data = toRelease(raw);
  memory.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function fetchReleases(full, { token, signal, perPage = 10 } = {}) {
  const raw = await gh(`/repos/${full}/releases?per_page=${perPage}`, token, signal);
  return raw.filter((r) => !r.draft).map(toRelease);
}

/**
 * Construit la vue "app" d'un catalogue : release head, assets par plateforme,
 * état de mise à jour par rapport à la version installée.
 */
export function buildAppEntry(def, release, installed) {
  const platforms = {};
  for (const platform of ['windows', 'android']) {
    const asset = pickAsset(release?.assets, def.assets?.[platform]);
    const inst = installed?.[platform];
    const version = release?.version || null;
    let status = 'absent';
    if (inst) {
      // Version inconnue (app detectee sur le disque) : on ne peut pas juger,
      // donc pas de notification de MAJ inutile.
      if (!version || !inst.version) status = 'up-to-date';
      else status = isNewer(version, inst.version) ? 'outdated' : 'up-to-date';
    }
    platforms[platform] = {
      asset: asset || null,
      available: Boolean(asset),
      installed: inst || null,
      status,
      updateVersion: status === 'outdated' ? version : null,
    };
  }
  return {
    id: def.id,
    name: def.name,
    repo: def.repo,
    category: def.category || 'Divers',
    tagline: def.tagline || '',
    description: def.description || '',
    icon: def.icon || null,
    androidPackage: def.androidPackage || null,
    website: def.website || `https://github.com/${def.repo}`,
    custom: Boolean(def.custom),
    featured: Boolean(def.featured),
    version: release?.version || null,
    tag: release?.tag || null,
    publishedAt: release?.publishedAt || null,
    releaseUrl: release?.url || `https://github.com/${def.repo}/releases`,
    changelog: release?.body || '',
    prerelease: Boolean(release?.prerelease),
    size: Object.values(platforms).map((p) => p.asset?.size).find(Boolean) || null,
    downloads: Object.values(platforms).reduce((sum, p) => sum + (p.asset?.downloadCount || 0), 0),
    platforms,
    needsUpdate: anyUpdate(platforms),
    error: release === null ? 'introuvable' : null,
  };
}

export function anyUpdate(platforms) {
  return ['windows', 'android'].some((p) => platforms[p]?.status === 'outdated');
}

