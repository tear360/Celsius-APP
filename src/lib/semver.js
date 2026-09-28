// Comparaison de versions type semver, tolérante aux préfixes (v1.2.3, 1.2.3-beta.1, 1.2)

const PRE_ORDER = { alpha: 0, a: 0, beta: 1, b: 1, rc: 2, pre: 2, '': 3 };

export function parseVersion(input) {
  if (!input) return null;
  const raw = String(input).trim().replace(/^v/i, '');
  const m = raw.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+.]?([0-9A-Za-z.-]+))?/);
  if (!m) return null;
  return {
    major: Number(m[1] || 0),
    minor: Number(m[2] || 0),
    patch: Number(m[3] || 0),
    pre: m[4] || '',
    raw,
  };
}

function preRank(pre) {
  if (!pre) return { stage: 3, num: 0 };
  const cleaned = pre.replace(/^\d+[.-]?/, '');
  const head = (cleaned.match(/^([0-9A-Za-z]+)/) || ['', ''])[1].toLowerCase();
  const stage = head in PRE_ORDER ? PRE_ORDER[head] : 3;
  const numMatch = cleaned.match(/(\d+)\s*$/);
  return { stage, num: numMatch ? Number(numMatch[1]) : 0 };
}

/** -1 si a < b, 0 si égal, 1 si a > b. null si l'une des deux est illisible. */
export function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;
  for (const key of ['major', 'minor', 'patch']) {
    if (va[key] !== vb[key]) return va[key] > vb[key] ? 1 : -1;
  }
  const ra = preRank(va.pre);
  const rb = preRank(vb.pre);
  if (ra.stage !== rb.stage) return ra.stage > rb.stage ? 1 : -1;
  if (ra.num !== rb.num) return ra.num > rb.num ? 1 : -1;
  return 0;
}

export function isNewer(candidate, current) {
  if (!candidate) return false;
  if (!current) return true;
  return compareVersions(candidate, current) > 0;
}

export function isPrerelease(input) {
  const v = parseVersion(input);
  return Boolean(v && v.pre);
}
