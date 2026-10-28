import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TITULO_BASE = 'Red Social'
const DURACION_TOAST = 8000

// Avisos de mensajes nuevos, solicitudes de amistad y solicitudes aceptadas.
// - Dentro de la página: ventana emergente (toast).
// - Con la pestaña en segundo plano: notificación del sistema y contador en el título.
export default function Notifier() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [toasts, setToasts] = useState([])
  const [permiso, setPermiso] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [pendientes, setPendientes] = useState(0)
  const rutaRef = useRef(location.pathname)
  rutaRef.current = location.pathname

  function quitar(id) {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }

  function avisar({ clave, titulo, cuerpo, destino }) {
    const id = `${clave}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((ts) => [...ts.slice(-3), { id, titulo, cuerpo, destino }])
    setTimeout(() => quitar(id), DURACION_TOAST)

    if (document.hidden) {
      setPendientes((n) => n + 1)
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(titulo, { body: cuerpo, tag: clave })
        n.onclick = () => {
          window.focus()
          navigate(destino)
          n.close()
        }
      }
    }
  }

  useEffect(() => {
    if (!user) return

    async function nombreDe(id) {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', id)
        .maybeSingle()
      return data?.display_name || data?.username || 'Alguien'
    }

    const canal = supabase
      .channel(`avisos-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async ({ new: m }) => {
          if (m.sender_id === user.id) return
          // Si ya estás mirando ese chat, no hace falta avisar
          if (rutaRef.current === `/mensajes/${m.conversation_id}`) return
          const de = await nombreDe(m.sender_id)
          const texto = m.body
            ? m.body
            : m.media_type === 'image' ? 'Te mandó una imagen'
            : m.media_type === 'video' ? 'Te mandó un video'
            : 'Mensaje nuevo'
          avisar({
            clave: `msg-${m.conversation_id}`,
            titulo: `Mensaje de ${de}`,
            cuerpo: texto.slice(0, 120),
            destino: `/mensajes/${m.conversation_id}`,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships' },
        async ({ new: f }) => {
          if (f.addressee_id !== user.id || f.status !== 'pending') return
          const de = await nombreDe(f.requester_id)
          avisar({
            clave: `fr-${f.id}`,
            titulo: 'Solicitud de amistad',
            cuerpo: `${de} quiere ser tu amigo`,
            destino: '/amigos',
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships' },
        async ({ new: f }) => {
          if (f.requester_id !== user.id || f.status !== 'accepted') return
          const de = await nombreDe(f.addressee_id)
          avisar({
            clave: `acc-${f.id}`,
            titulo: 'Solicitud aceptada',
            cuerpo: `${de} aceptó tu solicitud`,
            destino: '/amigos',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Al volver a la pestaña, se limpia el contador del título
  useEffect(() => {
    function alVolver() {
      if (!document.hidden) setPendientes(0)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  useEffect(() => {
    document.title = pendientes > 0 ? `(${pendientes}) ${TITULO_BASE}` : TITULO_BASE
  }, [pendientes])

  async function pedirPermiso() {
    const r = await Notification.requestPermission()
    setPermiso(r)
  }

  return (
    <>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="status">
            <strong>{t.titulo}</strong>
            <p>{t.cuerpo}</p>
            <div className="toast-actions">
              <button onClick={() => { navigate(t.destino); quitar(t.id) }}>Ver</button>
              <button className="secondary" onClick={() => quitar(t.id)}>Cerrar</button>
            </div>
          </div>
        ))}
      </div>

      {permiso === 'default' && (
        <button className="notif-enable secondary" onClick={pedirPermiso}>
          Activar avisos del navegador
        </button>
      )}
    </>
  )
}
