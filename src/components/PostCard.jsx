import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tiempoRelativo } from '../lib/posts'

export default function PostCard({ post, userId, onDeleted }) {
  const [likes, setLikes] = useState(post.likes ?? [])
  const [commentCount, setCommentCount] = useState(post.comments?.length ?? 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [error, setError] = useState('')

  const liked = likes.some((l) => l.user_id === userId)
  const autor = post.author

  async function toggleLike() {
    setError('')
    if (liked) {
      const { error } = await supabase
        .from('likes').delete()
        .eq('post_id', post.id).eq('user_id', userId)
      if (error) return setError(error.message)
      setLikes(likes.filter((l) => l.user_id !== userId))
    } else {
      const { error } = await supabase
        .from('likes').insert({ post_id: post.id, user_id: userId })
      if (error) return setError(error.message)
      setLikes([...likes, { user_id: userId }])
    }
  }

  async function cargarComentarios() {
    setLoadingComments(true)
    const { data, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author_id, author:profiles!author_id(username, display_name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setLoadingComments(false)
    if (error) return setError(error.message)
    setComments(data ?? [])
  }

  function toggleComments() {
    const abrir = !showComments
    setShowComments(abrir)
    if (abrir) cargarComentarios()
  }

  async function comentar(e) {
    e.preventDefault()
    const texto = newComment.trim()
    if (!texto) return
    setError('')
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, author_id: userId, body: texto })
      .select('id, body, created_at, author_id, author:profiles!author_id(username, display_name)')
      .single()
    if (error) return setError(error.message)
    setComments([...comments, data])
    setCommentCount(commentCount + 1)
    setNewComment('')
  }

  async function borrarPost() {
    if (!confirm('¿Borrar esta publicación?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) return setError(error.message)
    onDeleted?.(post.id)
  }

  return (
    <article className="post">
      <div className="post-head">
        <Link to={`/u/${autor?.username}`}>
          <strong>{autor?.display_name}</strong> <span>@{autor?.username}</span>
        </Link>
        <span className="time">· {tiempoRelativo(post.created_at)}</span>
        {post.author_id === userId && (
          <button className="link-btn" onClick={borrarPost}>Borrar</button>
        )}
      </div>

      {post.body && <p>{post.body}</p>}
      {post.media_type === 'image' && <img src={post.media_url} alt="" loading="lazy" />}
      {post.media_type === 'video' && <video src={post.media_url} controls preload="metadata" />}

      <div className="actions">
        <button className={`link-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
          {liked ? '♥' : '♡'} {likes.length}
        </button>
        <button className="link-btn" onClick={toggleComments}>
          Comentarios ({commentCount})
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {loadingComments && <p className="muted">Cargando comentarios...</p>}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <Link to={`/u/${c.author?.username}`}>@{c.author?.username}</Link>
              <span> {c.body}</span>
            </div>
          ))}
          <form className="comment-form" onSubmit={comentar}>
            <input
              placeholder="Escribí un comentario"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={500}
            />
            <button type="submit">Enviar</button>
          </form>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </article>
  )
}
