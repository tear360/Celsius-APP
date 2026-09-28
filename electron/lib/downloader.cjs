const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const { pipeline } = require('node:stream/promises');

const MAX_REDIRECTS = 8;
const UA = 'Celsius-Store (+https://github.com/tear360/Celsius-APP)';

function requestOnce(rawUrl, options, redirectsLeft) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      reject(new Error(`URL invalide : ${rawUrl}`));
      return;
    }
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': UA,
          Accept: 'application/octet-stream,*/*',
          ...(options.headers || {}),
        },
        timeout: options.timeoutMs || 45000,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Trop de redirections'));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          resolve(requestOnce(next, options, redirectsLeft - 1));
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`Telechargement refuse (HTTP ${status})`));
          return;
        }
        resolve({ res, req });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Delai depasse'));
    });
    req.on('error', reject);
    if (options.signal) {
      if (options.signal.aborted) {
        req.destroy(new Error('Annule'));
        return;
      }
      options.signal.addEventListener(
        'abort',
        () => req.destroy(new Error('Annule')),
        { once: true },
      );
    }
    req.end();
  });
}

/**
 * Telecharge une URL vers diskPath avec suivi de progression.
 * onProgress({ received, total, percent })
 */
async function downloadToFile(url, diskPath, onProgress, signal) {
  await fs.promises.mkdir(path.dirname(diskPath), { recursive: true });
  const { res } = await requestOnce(url, { signal }, MAX_REDIRECTS);
  const total = Number(res.headers['content-length'] || 0);
  let received = 0;
  let lastTick = Date.now();

  const out = fs.createWriteStream(diskPath);
  res.on('data', (chunk) => {
    received += chunk.length;
    const now = Date.now();
    if (now - lastTick >= 120 || received === total) {
      lastTick = now;
      onProgress?.({
        received,
        total,
        percent: total ? Math.min(100, (received / total) * 100) : 0,
      });
    }
  });

  try {
    await pipeline(res, out);
  } catch (err) {
    await fs.promises.rm(diskPath, { force: true });
    throw err;
  }
  if (!total) onProgress?.({ received, total: received, percent: 100 });
  return { path: diskPath, size: received };
}

/** Telecharge en memoire (JSON / texte court). */
async function fetchBuffer(url, { headers, signal, timeoutMs = 20000 } = {}) {
  const { res } = await requestOnce(url, { headers, signal, timeoutMs }, MAX_REDIRECTS);
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  await new Promise((resolve, reject) => {
    res.on('end', resolve);
    res.on('error', reject);
  });
  return Buffer.concat(chunks);
}

function safeFileName(name) {
  return String(name || 'download.bin')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

module.exports = { downloadToFile, fetchBuffer, safeFileName };
