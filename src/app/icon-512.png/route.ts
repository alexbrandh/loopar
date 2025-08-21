import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readFileIfExists(p: string) {
  try {
    const data = await fs.readFile(p)
    return data
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const icon512 = path.join(process.cwd(), 'public', 'icons', 'icon-512.png')
    const icon192 = path.join(process.cwd(), 'public', 'icon-192.png')
  
    let data = await readFileIfExists(icon512)
    const ct = 'image/png'
  
    if (!data) {
      data = await readFileIfExists(icon192)
    }
  
    if (!data) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 })
    }
  
    // Use Uint8Array to satisfy BodyInit across environments
    const body = new Uint8Array(data)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(data.byteLength),
      },
    })
  } catch (err) {
    console.error('[icon-512] GET failed', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function HEAD() {
  try {
    const icon512 = path.join(process.cwd(), 'public', 'icons', 'icon-512.png')
    const icon192 = path.join(process.cwd(), 'public', 'icon-192.png')
    let p: string | null = null
    try { await fs.access(icon512); p = icon512 } catch {}
    if (!p) {
      try { await fs.access(icon192); p = icon192 } catch {}
    }
    if (!p) {
      return new Response(null, { status: 404 })
    }
    const stats = await fs.stat(p)
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(stats.size),
      },
    })
  } catch (err) {
    console.error('[icon-512] HEAD failed', err)
    return new Response(null, { status: 500 })
  }
}
