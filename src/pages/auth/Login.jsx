import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDashboardPath } from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { applyLoginPayload } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.trim()) return setError('Email is required')
        if (!emailRegex.test(email)) return setError('Please enter a valid email address')
        if (!password.trim()) return setError('Password is required')
        if (password.length < 6) return setError('Password must be at least 6 characters long')

        setLoading(true)
        try {
            const baseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
            console.log('[Login] Request URL:', `${baseUrl}/api/login`)
            const response = await fetch(`${baseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json().catch(() => ({}))
            console.log('[Login] API status:', response.status)
            console.log('[Login] API response:', data)
            if (!response.ok) {
                throw new Error(data?.error || data?.message || `Login failed (${response.status})`)
            }

            if (!data?.token) {
                throw new Error('Login failed: missing token in response')
            }

            const resolvedRole = applyLoginPayload(data) || data?.profile?.roles?.name?.toLowerCase() || 'student'
            const nextPath = from || getDashboardPath(resolvedRole)
            console.log('[Login] Resolved role:', resolvedRole)
            console.log('[Login] Navigate to:', nextPath)
            navigate(nextPath, { replace: true })
        } catch (err) {
            console.error('[Login] Error:', err)
            setError(err.message || 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white px-4 py-6 md:px-8 lg:px-16">
            <div className="mx-auto max-w-sm md:max-w-2xl lg:max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
                    <section className="hidden lg:flex rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-10 flex-col justify-between">
                        <div>
                            <Link to="/" className="inline-flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-creative-lime text-black flex items-center justify-center text-sm font-black">ZB</div>
                                <span className="text-2xl font-semibold tracking-tight">ZeroBite</span>
                            </Link>
                            <h1 className="mt-10 text-4xl xl:text-5xl font-semibold leading-tight tracking-tight">
                                Smart attendance and meal management for hostels.
                            </h1>
                            <p className="mt-4 text-white/70 text-base max-w-md">
                                Scan QR, mark attendance in seconds, and track menu and rewards without friction.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                <p className="text-xs text-white/60">Mobile Ready</p>
                                <p className="mt-1 text-lg font-semibold">QR Scan Fast</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                <p className="text-xs text-white/60">Live Tracking</p>
                                <p className="mt-1 text-lg font-semibold">Rewards & Fees</p>
                            </div>
                        </div>
                    </section>

                    <section className="flex items-center">
                        <Card variant="glass" className="w-full rounded-3xl p-5 sm:p-7 md:p-8" hover={false}>
                            <div className="lg:hidden mb-5">
                                <Link to="/" className="inline-flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-creative-lime text-black flex items-center justify-center text-xs font-black">ZB</div>
                                    <span className="text-lg font-semibold">ZeroBite</span>
                                </Link>
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sign in</h2>
                            <p className="mt-2 text-sm text-white/65">Continue to your dashboard.</p>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                {error && (
                                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="email" className="block text-sm text-white/80 mb-1.5">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-creative-lime/70"
                                        placeholder="student@example.com"
                                        autoComplete="email"
                                        inputMode="email"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label htmlFor="password" className="text-sm text-white/80">Password</label>
                                        <Link to="/forgot-password" className="text-sm text-creative-lime hover:underline">Forgot?</Link>
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-creative-lime/70"
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>

                                <Button type="submit" size="md" className="w-full !text-sm !min-h-[48px]" isLoading={loading}>
                                    Sign In
                                </Button>
                            </form>

                            <p className="mt-4 text-center text-sm text-white/60">
                                New user? <Link to="/register" className="text-creative-lime hover:underline">Create account</Link>
                            </p>
                        </Card>
                    </section>
                </div>
            </div>
        </div>
    )
}
