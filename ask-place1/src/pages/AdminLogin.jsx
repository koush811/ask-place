import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function AdminLogin() {
  const { login, isConfigured, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    navigate('/admin', { replace: true })
    return null
  }

  if (!isConfigured) {
    return (
      <div className="admin-shell">
        <div className="admin-card">
          <h1>管理者ログイン</h1>
          <div className="admin-message error">
            Firebaseが設定されていません。環境変数(.env)を確認してください。
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-shell">
      <form className="admin-card" onSubmit={handleSubmit}>
        <h1>管理者ログイン</h1>
        <label className="admin-label">
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="admin-label">
          パスワード
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="admin-message error">{error}</div>}
        <button type="submit" className="admin-btn primary" disabled={submitting}>
          {submitting ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
