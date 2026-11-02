import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { POST_SELECT } from '../lib/posts'
import { useAuth } from '../context/AuthContext'
import PostCard from '../components/PostCard'

// Página de una publicación individual: es el destino de los links compartidos
export default function PostPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let activo = true
    setLoading(true)
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        setPost(data ?? null)
        setLoading(false)
      })
    return () => { activo = false }
  }, [id])

  return (
    <main className="feed">
      <p><Link to="/">← Volver al inicio</Link></p>
      {loading && <p className="muted">Cargando...</p>}
      {!loading && !post && (
        <p className="muted">Esta publicación no existe o fue borrada.</p>
      )}
      {post && (
        <PostCard
          post={post}
          userId={user.id}
          startOpen
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </main>
  )
}
