import { useEffect, useRef, useState } from 'react'

// Link público de una publicación: /p/:id
export function urlDePost(postId) {
  return `${window.location.origin}/p/${postId}`
}

function textoParaCompartir(post) {
  const autor = post.author?.display_name || post.author?.username || 'alguien'
  const cuerpo = (post.body || '').trim()
  const resumen = cuerpo.length > 120 ? `${cuerpo.slice(0, 117)}...` : cuerpo
  return resumen ? `${autor}: ${resumen}` : `Mirá esta publicación de ${autor}`
}

export default function ShareButton({ post }) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const raiz = useRef(null)

  const url = urlDePost(post.id)
  const texto = textoParaCompartir(post)

  // Cierra el menú al tocar afuera o con Escape
  useEffect(() => {
    if (!abierto) return
    function afuera(e) {
      if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false)
    }
    function tecla(e) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', afuera)
    document.addEventListener('touchstart', afuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', afuera)
      document.removeEventListener('touchstart', afuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Navegadores viejos: copia con un campo temporal
      const t = document.createElement('textarea')
      t.value = url
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      document.body.removeChild(t)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function onClick() {
    // En celulares abre el menú nativo (WhatsApp, Instagram, Telegram, etc.),
    // igual que al compartir un TikTok.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Red Social', text: texto, url })
      } catch (e) {
        // AbortError = el usuario cerró el menú; no es un error
        if (e?.name !== 'AbortError') setAbierto(true)
      }
      return
    }
    setAbierto((a) => !a)
  }

  const u = encodeURIComponent(url)
  const t = encodeURIComponent(texto)
  const t_u = encodeURIComponent(`${texto} ${url}`)
  const opciones = [
    { nombre: 'WhatsApp', href: `https://wa.me/?text=${t_u}` },
    { nombre: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { nombre: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { nombre: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { nombre: 'Email', href: `mailto:?subject=${encodeURIComponent('Mirá esta publicación')}&body=${t_u}` },
  ]

  return (
    <span className="share" ref={raiz}>
      <button className="link-btn" onClick={onClick} aria-haspopup="menu" aria-expanded={abierto}>
        Compartir
      </button>
      {abierto && (
        <div className="share-menu" role="menu">
          {opciones.map((o) => (
            <a key={o.nombre} role="menuitem" href={o.href} target="_blank" rel="noopener noreferrer"
              onClick={() => setAbierto(false)}>
              {o.nombre}
            </a>
          ))}
          <button role="menuitem" className="secondary small" onClick={copiar}>
            {copiado ? '¡Link copiado!' : 'Copiar link'}
          </button>
        </div>
      )}
    </span>
  )
}
