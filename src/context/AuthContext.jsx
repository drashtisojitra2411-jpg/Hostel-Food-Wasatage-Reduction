import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (import.meta.env.DEV) {
            console.debug('[Auth] Provider mounted')
        }

        // Safety timeout: ensure loading state is cleared even if request hangs.
        const safetyTimeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn('[Auth] Session check timed out, continuing render')
                }
                return false
            })
        }, 5000)

        if (api.hasToken()) {
            api.get('/api/auth/me')
                .then((data) => {
                    setUser(data?.user || null)
                    setProfile(data?.profile || null)
                    setRole(data?.profile?.roles?.name?.toLowerCase() || 'student')
                })
                .catch((err) => {
                    console.error('Session validation error:', err)
                    api.setToken(null)
                })
                .finally(() => {
                    setLoading(false)
                })
        } else {
            setLoading(false)
        }

        return () => {
            clearTimeout(safetyTimeout)
        }
    }, [])

    async function fetchProfile() {
        try {
            const profileData = await api.get('/api/profile')
            if (profileData) {
                setProfile(profileData)
                setRole(profileData.roles?.name?.toLowerCase() || 'student')
            }
        } catch (error) {
            console.error('Profile fetch error:', error)
        }
    }

    async function signUp({ email, password, fullName, hostelId, roomNumber, dietaryPreference }) {
        return api.post('/api/auth/register', {
            email,
            password,
            fullName,
            hostelId,
            roomNumber,
            dietaryPreference
        })
    }

    async function signIn({ email, password }) {
        const data = await api.post('/api/login', {
            email,
            password
        })

        if (!data?.token) {
            throw new Error('Login failed: missing token in response')
        }

        applyLoginPayload(data)

        return data
    }

    function applyLoginPayload(data) {
        api.setToken(data?.token || null)
        setUser(data?.user || null)
        setProfile(data?.profile || null)
        const resolvedRole = data?.profile?.roles?.name?.toLowerCase() || 'student'
        setRole(resolvedRole)
        return resolvedRole
    }

    async function signOut() {
        try {
            api.setToken(null)
            setUser(null)
            setProfile(null)
            setRole(null)
        } catch (err) {
            console.error('Sign Out Exception:', err)
            api.setToken(null)
            setUser(null)
            setProfile(null)
            setRole(null)
        }
    }

    async function resetPassword(email) {
        await api.post('/api/auth/reset-password', { email })
    }

    async function updatePassword(newPassword) {
        await api.put('/api/auth/update-password', { password: newPassword })
    }

    async function updateProfile(updates) {
        if (!user) throw new Error('No user logged in')
        await api.put('/api/profile', updates)
        await fetchProfile()
    }

    const isAdmin = () => ['super_admin', 'hostel_admin', 'mess_manager'].includes(role)
    const isSuperAdmin = () => role === 'super_admin'
    const isHostelAdmin = () => role === 'hostel_admin'
    const isMessManager = () => role === 'mess_manager'
    const isStudent = () => role === 'student'
    const isChef = () => role === 'chef'
    const isNgo = () => role === 'ngo'

    const value = {
        user,
        profile,
        role,
        loading,
        signUp,
        signIn,
        applyLoginPayload,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        isAdmin,
        isSuperAdmin,
        isHostelAdmin,
        isMessManager,
        isStudent,
        isChef,
        isNgo
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
