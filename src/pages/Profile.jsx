import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { POST_SELECT } from '../lib/posts'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [posts, setPosts] = useState([])
  const [siguiendo, setSiguiendo] = useState(false)
  const [seguidores, setSeguidores] = useState(0)
  const [siguiendoCount, setSiguiendoCount] = useState(0)
  const [estado, setEstado] = useState('cargando') // cargando | ok | no-existe
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setEstado('cargando')
    const { data: p } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, created_at')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (!p) {
      setEstado('no-existe')
      return
    }
    setPerfil(p)

    const [postsRes, followRes, seguidoresRes, siguiendoRes] = await Promise.all([
      supabase.from('posts').select(POST_SELECT)
        .eq('author_id', p.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('follows').select('follower_id')
        .eq('follower_id', user.id).eq('following_id', p.id).maybeSingle(),
      supabase.from('follows').select('*', { count: 'exact', head: true })
        .eq('following_id', p.id),
      supabase.from('follows').select('*', { count: 'exact', head: true })
        .eq('follower_id', p.id),
    ])

    setPosts(postsRes.data ?? [])
    setSiguiendo(!!followRes.data)
    setSeguidores(seguidoresRes.count ?? 0)
    setSiguiendoCount(siguiendoRes.count ?? 0)
    setEstado('ok')
  }, [username, user.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function toggleSeguir() {
    setError('')
    if (siguiendo) {
      const { error } = await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', perfil.id)
      if (error) return setError(error.message)
      setSiguiendo(false)
      setSeguidores(seguidores - 1)
    } else {
      const { error } = await supabase.from('follows')
        .insert({ follower_id: user.id, following_id: perfil.id })
      if (error) return setError(error.message)
      setSiguiendo(true)
      setSeguidores(seguidores + 1)
    }
  }

  if (estado === 'cargando') return <main><p className="muted">Cargando...</p></main>
  if (estado === 'no-existe') return <main><h1>Usuario no encontrado</h1></main>

  const esMio = perfil.id === user.id

  return (
    <main className="feed">
      <header className="profile-head">
        <div>
          <h1>{perfil.display_name}</h1>
          <p className="muted">@{perfil.username}</p>
          {perfil.bio && <p>{perfil.bio}</p>}
          <p className="muted">
            <strong>{siguiendoCount}</strong> siguiendo · <strong>{seguidores}</strong> seguidores
          </p>
        </div>
        {!esMio && (
          <button className={siguiendo ? 'secondary' : ''} onClick={toggleSeguir}>
            {siguiendo ? 'Dejar de seguir' : 'Seguir'}
          </button>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      {posts.length === 0 && <p className="muted">Todavía no publicó nada.</p>}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          userId={user.id}
          onDeleted={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
        />
      ))}
    </main>
  )
}
