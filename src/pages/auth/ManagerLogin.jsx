import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDashboardPath } from '../../components/ProtectedRoute'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function ManagerLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const from = location.state?.from?.pathname

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // JavaScript Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.trim()) {
            return setError('Operator identifier is required')
        }
        if (!emailRegex.test(email)) {
            return setError('Please enter a valid operator email address')
        }
        if (!password.trim()) {
            return setError('Security vector is required')
        }
        if (password.length < 6) {
            return setError('Security vector must be at least 6 characters')
        }

        setLoading(true)

        try {
            const data = await signIn({ email, password })
            const nextPath = from || getDashboardPath(data?.profile?.roles?.name?.toLowerCase())
            navigate(nextPath, { replace: true })
        } catch (err) {
            setError(err.message || 'Failed to authorize command')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-purple selection:text-white overflow-hidden relative">
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>

            {/* Command Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-creative-purple/10 blur-[200px] rounded-full pointer-events-none animate-pulse-slow"></div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
                {/* Header - Tactical Display */}
                <div className="text-center mb-16 animate-fade-in">
                    <div className="inline-block px-4 py-1.5 border border-creative-purple/30 bg-creative-purple/5 rounded-full text-[9px] font-black uppercase tracking-[0.5em] mb-8 text-creative-purple">
                        MANAGERIAL CLEARANCE REQUIRED
                    </div>
                    <h1 className="text-7xl lg:text-[10vw] font-black tracking-[-0.08em] leading-[0.8] italic uppercase">
                        COMMAND<br />
                        <span className="text-creative-purple">ACCESS.</span>
                    </h1>
                </div>

                <div className="w-full max-w-2xl animate-slide-up">
                    <Card variant="premium" className="p-12 lg:p-20 border-white/5 backdrop-blur-3xl overflow-visible">
                        {/* Decorative UI elements */}
                        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-creative-purple/40"></div>
                        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-creative-purple/40"></div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter italic uppercase text-creative-purple mb-2">
                                    Identity Verification
                                </h2>
                                <p className="text-[10px] font-black text-white/30 tracking-widest uppercase">Input Command Credentials Below</p>
                            </div>
                            <div className="text-[9px] font-black text-white/20 tracking-widest uppercase text-right">
                                Sector: Central_Ops<br />
                                Node: HQ-01
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-12">
                            {error && (
                                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-shake">
                                    <span className="text-xl">!</span>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-6 relative group/input">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-creative-purple animate-pulse"></span>
                                    Operator Identifier
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-10 py-8 rounded-[2rem] bg-black/40 border-2 border-white/5 text-xl font-black tracking-widest uppercase transition-all focus:border-creative-purple focus:bg-black/80 outline-none placeholder:text-white/5"
                                    placeholder="OPERATOR // MAIL"
                                    required
                                />
                                <div className="absolute top-0 left-0 w-1.5 h-0 group-focus-within/input:h-full bg-creative-purple transition-all duration-500 rounded-full -ml-4 mt-12" />
                            </div>

                            <div className="space-y-6 relative group/input">
                                <div className="flex justify-between items-center ml-4 mr-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-creative-purple animate-pulse"></span>
                                        Security Vector
                                    </label>
                                    <Link to="/forgot-password" className="text-creative-purple hover:underline text-[9px] font-black tracking-widest uppercase">RECOVER</Link>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-10 py-8 rounded-[2rem] bg-black/40 border-2 border-white/5 text-xl font-black tracking-widest uppercase transition-all focus:border-creative-purple focus:bg-black/80 outline-none placeholder:text-white/5"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <div className="absolute top-0 left-0 w-1.5 h-0 group-focus-within/input:h-full bg-creative-purple transition-all duration-500 rounded-full -ml-4 mt-12" />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full py-10 text-xs tracking-[0.5em] font-black bg-creative-purple shadow-glow-purple"
                                isLoading={loading}
                            >
                                AUTHORIZE SYSTEM ACCESS
                            </Button>
                        </form>

                        <div className="mt-16 pt-12 border-t border-white/5 flex justify-between items-center text-[9px] font-black tracking-[0.3em] text-white/20 uppercase">
                            <span>ENCRYPTION: ACTIVE</span>
                            <span className="text-creative-purple/40">SECURE LINK ESTABLISHED</span>
                        </div>
                    </Card>

                    <div className="mt-12 text-center animate-fade-in animation-delay-500">
                        <Link to="/login" className="text-[10px] font-black text-white/30 hover:text-white transition-colors tracking-[0.4em] uppercase">
                            Return to Student Portal →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
