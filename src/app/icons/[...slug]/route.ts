import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function contentTypeFor(ext: string) {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

async function readIconFile(relPath: string): Promise<{ data: Buffer; ct: string } | null> {
  const baseDir = path.join(process.cwd(), 'public', 'icons')
  const safeRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  const full = path.join(baseDir, safeRel)
  const normalized = path.normalize(full)
  if (!normalized.startsWith(baseDir)) return null
  try {
    const data = await fs.readFile(normalized)
    const ct = contentTypeFor(path.extname(normalized))
    return { data, ct }
  } catch {
    return null
  }
}

export async function GET(_req: Request, ctx: { params: { slug?: string[] } }) {
  const slugArr = ctx.params?.slug ?? []
  const rel = slugArr.join('/')
  const file = await readIconFile(rel)

  // Fallback: if requesting icon-512.png but missing, serve top-level 192
  if (!file && /(^|\/)icon-512\.png$/i.test(rel)) {
    try {
      const p192 = path.join(process.cwd(), 'public', 'icon-192.png')
      const data = await fs.readFile(p192)
      const body = new Uint8Array(data)
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {}
  }

  if (!file) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

  const body = new Uint8Array(file.data)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': file.ct,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export async function HEAD(req: Request, ctx: { params: { slug?: string[] } }) {
  try {
    const slugArr = ctx.params?.slug ?? []
    const rel = slugArr.join('/')
    const baseDir = path.join(process.cwd(), 'public', 'icons')
    const safeRel = rel.replace(/\\/g, '/').replace(/^\/+/, '')
    const full = path.join(baseDir, safeRel)
    const normalized = path.normalize(full)
    let p: string | null = null
    if (normalized.startsWith(baseDir)) {
      try { await fs.access(normalized); p = normalized } catch {}
    }
    if (!p && /(^|\/)icon-512\.png$/i.test(rel)) {
      const p192 = path.join(process.cwd(), 'public', 'icon-192.png')
      try { await fs.access(p192); p = p192 } catch {}
    }
    if (!p) {
      return new Response(null, { status: 404 })
    }
    const stats = await fs.stat(p)
    const ct = contentTypeFor(path.extname(p))
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(stats.size),
      },
    })
  } catch (err) {
    console.error('[icons/...slug] HEAD failed', err)
    return new Response(null, { status: 500 })
  }
}
