// Vista previa de un post para los "bots" de WhatsApp, Telegram, X, etc.
// vercel.json envía acá los pedidos de /p/:id que hacen esos bots; las personas
// reciben la app normal. Lee un solo post con la función pública get_post_preview.

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`
  const pageUrl = `${origin}/p/${encodeURIComponent(id)}`

  let titulo = 'Red Social'
  let descripcion = 'Mirá esta publicación en Red Social.'
  let imagen = ''

  const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supaKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (supaUrl && supaKey && uuid.test(id)) {
    try {
      const r = await fetch(`${supaUrl}/rest/v1/rpc/get_post_preview`, {
        method: 'POST',
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_id: id }),
      })
      if (r.ok) {
        const filas = await r.json()
        const p = filas?.[0]
        if (p) {
          titulo = `${p.display_name} (@${p.username}) en Red Social`
          const cuerpo = (p.body || '').trim()
          if (cuerpo) {
            descripcion = cuerpo.length > 200 ? `${cuerpo.slice(0, 197)}...` : cuerpo
          } else if (p.media_type === 'video') {
            descripcion = 'Publicó un video.'
          } else if (p.media_type === 'image') {
            descripcion = 'Publicó una imagen.'
          }
          if (p.media_type === 'image' && p.media_url) imagen = p.media_url
        }
      }
    } catch {
      // Si falla, queda la vista previa genérica
    }
  }

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Red Social" />
<meta property="og:title" content="${esc(titulo)}" />
<meta property="og:description" content="${esc(descripcion)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
${imagen ? `<meta property="og:image" content="${esc(imagen)}" />` : ''}
<meta name="twitter:card" content="${imagen ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(titulo)}" />
<meta name="twitter:description" content="${esc(descripcion)}" />
${imagen ? `<meta name="twitter:image" content="${esc(imagen)}" />` : ''}
</head>
<body>
<p><a href="${esc(pageUrl)}">${esc(titulo)}</a></p>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(html)
}
