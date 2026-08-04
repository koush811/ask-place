import { Outlet } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { useFirebaseActivitiesSync } from './hooks/useFirebaseActivitiesSync.js'

function ActivitiesSync() {
  useFirebaseActivitiesSync()
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <ActivitiesSync />
      <div className="app-shell">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </AuthProvider>
  )
}
