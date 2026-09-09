import { createContext, useContext, useState } from 'react'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('adminSession') || 'null'))

  const login = (token, user) => {
    const nextSession = { token, user }
    localStorage.setItem('adminSession', JSON.stringify(nextSession))
    setSession(nextSession)
  }

  const logout = () => {
    localStorage.removeItem('adminSession')
    setSession(null)
  }

  return <AdminContext.Provider value={{ session, login, logout }}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) throw new Error('useAdmin must be used within AdminProvider')
  return context
}
