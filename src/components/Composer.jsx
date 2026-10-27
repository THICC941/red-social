import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadMedia } from '../lib/posts'

export default function Composer({ userId, onPosted }) {
  const [body, setBody] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  function handleFile(e) {
    const f = e.target.files?.[0]
    setError('')
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function quitarArchivo() {
    setFile(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function publicar(e) {
    e.preventDefault()
    const texto = body.trim()
    if (!texto && !file) {
      setError('Escribí algo o subí una imagen o video.')
      return
    }
    if (texto.length > 500) {
      setError('El post no puede tener más de 500 caracteres.')
      return
    }

    setBusy(true)
    setError('')
    try {
      let media = { url: null, type: null }
      if (file) media = await uploadMedia(file, userId)

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        body: texto,
        media_url: media.url,
        media_type: media.type,
      })
      if (error) throw error

      setBody('')
      quitarArchivo()
      onPosted?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="composer" onSubmit={publicar}>
      <textarea
        placeholder="¿Qué está pasando?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={500}
        rows={3}
      />
      {preview && (
        <div className="preview">
          {file.type.startsWith('video/')
            ? <video src={preview} controls />
            : <img src={preview} alt="" />}
          <button type="button" className="secondary" onClick={quitarArchivo}>Quitar</button>
        </div>
      )}
      <div className="composer-actions">
        <label className="file-btn">
          📎 Imagen o video
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFile}
            hidden
          />
        </label>
        <span className="count">{body.length}/500</span>
        <button type="submit" disabled={busy}>{busy ? 'Publicando...' : 'Publicar'}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
