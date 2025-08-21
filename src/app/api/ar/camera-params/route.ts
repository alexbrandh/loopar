// Ensure this route always runs on Node.js and stays dynamic (no static optimization)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Prefer local file, then fall back to reliable URLs (GH Pages, Raw, jsDelivr)
const REMOTE_SOURCES = [
  // Jerome Etienne original hosting (widely used in AR.js examples)
  'https://jeromeetienne.github.io/AR.js/data/data/camera_para.dat',
  // Raw GitHub sources
  'https://raw.githubusercontent.com/jeromeetienne/AR.js/master/data/data/camera_para.dat',
  'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat',
  // jsDelivr GitHub fallbacks
  'https://cdn.jsdelivr.net/gh/jeromeetienne/AR.js@master/data/data/camera_para.dat',
  'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@master/data/data/camera_para.dat',
  // Unpkg (least reliable)
  'https://unpkg.com/@ar-js-org/ar.js@latest/three.js/data/camera_para.dat',
];

function okHeaders() {
  const out = new Headers();
  out.set('Content-Type', 'application/octet-stream');
  out.set('Cache-Control', 'public, max-age=31536000, immutable');
  return out;
}

export async function GET() {
  // 1) Try local copies on filesystem
  try {
    const { promises: fsp } = await import('fs');
    const { join } = await import('path');
    const cwd = process.cwd();
    const candidates = [
      join(cwd, 'public', 'ar', 'camera_para.dat'),
      join(cwd, 'node_modules', 'ar.js', 'data', 'data', 'camera_para.dat'),
    ];
    for (const p of candidates) {
      try {
        const buf = await fsp.readFile(p);
        // Accept files > 100 bytes (AR.js camera_para.dat is ~176 bytes)
        if (buf && buf.byteLength > 100) {
          // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer typing issues
          const ab = new ArrayBuffer(buf.byteLength);
          new Uint8Array(ab).set(buf);
          return new Response(ab, { status: 200, headers: okHeaders() });
        }
        if (buf && buf.byteLength > 0) {
          console.warn('[api/ar/camera-params] Local file is very small, will try remotes:', p, buf.byteLength, 'bytes');
        }
      } catch {}
    }
  } catch {}

  // 2) Fallback to remote sources
  const headers = {
    'User-Agent': 'Loopar-AR/1.0 (+https://localhost)'
  } as Record<string, string>;

  for (const url of REMOTE_SOURCES) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers });
      if (res.ok && res.body) {
        return new Response(res.body, { status: 200, headers: okHeaders() });
      }
      console.error(`[api/ar/camera-params] Upstream not OK from ${url}:`, res.status, res.statusText);
    } catch (err) {
      console.error(`[api/ar/camera-params] Fetch error from ${url}:`, err);
    }
  }

  // 3) Graceful degradation: if remote failed, serve whatever local file exists (>0 bytes)
  try {
    const { promises: fsp } = await import('fs');
    const { join } = await import('path');
    const cwd = process.cwd();
    const candidates = [
      join(cwd, 'public', 'ar', 'camera_para.dat'),
      join(cwd, 'node_modules', 'ar.js', 'data', 'data', 'camera_para.dat'),
    ];
    for (const p of candidates) {
      try {
        const buf = await fsp.readFile(p);
        if (buf && buf.byteLength > 0) {
          console.warn('[api/ar/camera-params] Falling back to local small file:', p, buf.byteLength, 'bytes');
          const ab = new ArrayBuffer(buf.byteLength);
          new Uint8Array(ab).set(buf);
          return new Response(ab, { status: 200, headers: okHeaders() });
        }
      } catch {}
    }
  } catch {}

  // 4) No local nor remote available
  return new Response('camera_para.dat unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

// HEAD just confirms availability; return 200 only if local file exists to avoid falsos positivos
export async function HEAD() {
  try {
    const { promises: fsp } = await import('fs');
    const { join } = await import('path');
    const cwd = process.cwd();
    const p1 = join(cwd, 'public', 'ar', 'camera_para.dat');
    const p2 = join(cwd, 'node_modules', 'ar.js', 'data', 'data', 'camera_para.dat');
    for (const p of [p1, p2]) {
      try {
        const stat = await fsp.stat(p);
        if (stat.isFile() && stat.size > 0) {
          return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
        }
      } catch {}
    }
  } catch {}
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
