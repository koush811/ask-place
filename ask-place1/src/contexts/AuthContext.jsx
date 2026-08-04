import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, isConfigured } from '../firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured || !auth) {
      setAuthLoading(false)
      return undefined
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email, password) => {
    if (!isConfigured || !auth) {
      throw new Error('Firebaseが設定されていません(.envを確認してください)')
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    if (!auth) return
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の内側で使ってください')
  return ctx
}
