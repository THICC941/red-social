import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tiempoRelativo } from '../lib/posts'

const MAX_MEDIA_BYTES = 50 * 1024 * 1024
const MAX_BODY = 2000

export default function Chat() {
  const { id: convId } = useParams()
  const { user } = useAuth()
  const [otro, setOtro] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [urls, setUrls] = useState({}) // path -> URL firmada temporal
  const [texto, setTexto] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const finRef = useRef(null)

  // Genera URLs temporales para los archivos del chat (el bucket es privado)
  async function firmar(paths) {
    const nuevos = paths.filter((p) => p && !urls[p])
    if (nuevos.length === 0) return
    const { data } = await supabase.storage.from('chat-media').createSignedUrls(nuevos, 3600)
    if (!data) return
    setUrls((prev) => {
      const copia = { ...prev }
      data.forEach((d) => { if (d.signedUrl) copia[d.path] = d.signedUrl })
      return copia
    })
  }

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const { data: miembros } = await supabase
        .from('conversation_members')
        .select('user_id, profile:profiles!user_id(username, display_name)')
        .eq('conversation_id', convId)
        .neq('user_id', user.id)
        .maybeSingle()
      if (!cancelado) setOtro(miembros?.profile ?? null)

      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, body, media_url, media_type, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(200)
      if (cancelado) return
      if (error) return setError(error.message)
      setMensajes(data ?? [])
      firmar((data ?? []).map((m) => m.media_url))
    }
    cargar()

    // Mensajes nuevos en tiempo real
    const canal = supabase
      .channel(`chat-${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const nuevo = payload.new
          setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]))
          firmar([nuevo.media_url])
        }
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, user.id])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  async function enviar(e) {
    e.preventDefault()
    const body = texto.trim()
    if (!body && !file) return
    if (body.length > MAX_BODY) return setError(`El mensaje no puede tener más de ${MAX_BODY} caracteres.`)

    setBusy(true)
    setError('')
    try {
      let media = { path: null, type: null }
      if (file) {
        const isImage = file.type.startsWith('image/')
        const isVideo = file.type.startsWith('video/')
        if (!isImage && !isVideo) throw new Error('Solo se pueden enviar imágenes o videos.')
        if (file.size > MAX_MEDIA_BYTES) throw new Error('El archivo supera los 50 MB.')

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${convId}/${Date.now()}-${safeName}`
        const { error: upErr } = await supabase.storage
          .from('chat-media')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw upErr
        media = { path, type: isImage ? 'image' : 'video' }
      }

      const { error: insErr } = await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        body,
        media_url: media.path,
        media_type: media.type,
      })
      if (insErr) throw insErr

      setTexto('')
      setFile(null)
      firmar([media.path])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="chat">
      <header className="chat-head">
        <Link to="/mensajes">← Volver</Link>
        <strong>{otro?.display_name ?? 'Chat'}</strong>
        {otro && <span className="muted">@{otro.username}</span>}
      </header>

      <div className="chat-log">
        {mensajes.length === 0 && <p className="muted">Todavía no hay mensajes. Escribí el primero.</p>}
        {mensajes.map((m) => {
          const propio = m.sender_id === user.id
          return (
            <div key={m.id} className={`bubble-row ${propio ? 'mine' : ''}`}>
              <div className={`bubble ${propio ? 'mine' : ''}`}>
                {m.body && <p>{m.body}</p>}
                {m.media_type === 'image' && urls[m.media_url] && <img src={urls[m.media_url]} alt="" />}
                {m.media_type === 'video' && urls[m.media_url] && <video src={urls[m.media_url]} controls preload="metadata" />}
                <span className="time">{tiempoRelativo(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={finRef} />
      </div>

      <form className="chat-input" onSubmit={enviar}>
        {file && (
          <div className="chat-file">
            <span>📎 {file.name}</span>
            <button type="button" className="link-btn" onClick={() => setFile(null)}>Quitar</button>
          </div>
        )}
        <div className="chat-input-row">
          <label className="file-btn">
            📎
            <input type="file" accept="image/*,video/*" hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <input
            placeholder="Escribí un mensaje"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={MAX_BODY}
          />
          <button type="submit" disabled={busy}>{busy ? '...' : 'Enviar'}</button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  )
}
