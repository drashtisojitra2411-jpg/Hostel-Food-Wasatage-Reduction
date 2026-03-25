import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        hostelId: '',
        roomNumber: '',
        dietaryPreference: 'vegetarian'
    })
    const [hostels, setHostels] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'WEAK', color: 'bg-red-500' })
    const { signUp } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        fetchHostels()
    }, [])

    async function fetchHostels() {
        try {
            const data = await api.get('/api/hostels');
            console.log("Hostels loaded:", data);
            setHostels(data || []);
        } catch (error) {
            console.error('Error fetching hostels:', error);
            setError('Failed to load hostels. Please refresh the page.');
        }
    }

    function calculatePasswordStrength(pass) {
        let score = 0
        if (pass.length === 0) return { score: 0, label: 'EMPTY', color: 'bg-white/10' }
        if (pass.length >= 8) score++
        if (/[A-Z]/.test(pass)) score++
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++

        if (score === 0) return { score: 10, label: 'WEAK', color: 'bg-red-500' }
        if (score === 1) return { score: 33, label: 'WEAK', color: 'bg-red-500' }
        if (score === 2) return { score: 66, label: 'MEDIUM', color: 'bg-yellow-500' }
        if (score === 3) return { score: 100, label: 'STRONG', color: 'bg-creative-lime' }
        return { score: 0, label: 'EMPTY', color: 'bg-white/10' }
    }

    function handleChange(e) {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value))
        }
    }

    // JavaScript Validation for Step 1
    function validateStep1() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!formData.fullName.trim()) {
            setError('Full name is required')
            return false
        }
        if (formData.fullName.trim().length < 3) {
            setError('Name must be at least 3 characters long')
            return false
        }
        if (!formData.email.trim()) {
            setError('Email is required')
            return false
        }
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address')
            return false
        }
        if (!formData.password.trim()) {
            setError('Password is required')
            return false
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long')
            return false
        }
        if (passwordStrength.label === 'WEAK') {
            setError('Password is too weak. Include uppercase and special characters.')
            return false
        }
        if (!formData.confirmPassword.trim()) {
            setError('Please confirm your password')
            return false
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return false
        }
        setError('')
        return true
    }

    // JavaScript Validation for Step 2
    function validateStep2() {
        if (!formData.hostelId) {
            setError('Please select a hostel')
            return false
        }
        if (!formData.roomNumber.trim()) {
            setError('Room number is required')
            return false
        }
        if (!/^[A-Za-z0-9\-]+$/.test(formData.roomNumber.trim())) {
            setError('Room number can only contain letters, numbers, and hyphens')
            return false
        }
        setError('')
        return true
    }

    function handleNextStep() {
        if (validateStep1()) {
            setStep(2)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // Validate step 2 fields
        if (!validateStep2()) return

        setLoading(true)

        try {
            await signUp({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                hostelId: formData.hostelId,
                roomNumber: formData.roomNumber,
                dietaryPreference: formData.dietaryPreference
            })
            navigate('/login', { state: { message: 'Registration successful! You can now sign in.' } })
        } catch (err) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const dietaryOptions = [
        { value: 'vegetarian', label: 'VEG', icon: '🥦' },
        { value: 'non-vegetarian', label: 'NON-VEG', icon: '🍖' },
        { value: 'vegan', label: 'VEGAN', icon: '🌱' },
        { value: 'eggetarian', label: 'EGG', icon: '🥚' }
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black overflow-hidden relative">
            {/* Background Polish */}
            <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-creative-purple/10 blur-[150px] rounded-full -ml-[25vw] -mt-[25vw] animate-pulse-slow"></div>
            <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] bg-creative-lime/5 blur-[150px] rounded-full -mr-[25vw] -mb-[25vw]"></div>

            <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
                {/* Left Section - Identity/Stats */}
                <div className="w-full lg:w-1/2 p-12 lg:p-24 flex flex-col justify-between">
                    <div>
                        <Link to="/" className="inline-flex items-center gap-4 group">
                            <div className="w-16 h-16 rounded-2xl bg-creative-lime flex items-center justify-center text-creative-dark shadow-[0_0_30px_rgba(163,230,53,0.3)] transition-all group-hover:scale-110 group-hover:rotate-12">
                                <span className="text-3xl font-black">🌱</span>
                            </div>
                            <span className="text-4xl font-black tracking-tighter font-display italic">ZeroBite</span>
                        </Link>
                    </div>

                    <div className="mt-24 lg:mt-0">
                        <div className="inline-block px-4 py-2 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-8 animate-fade-in">
                            Strategic Enrollment Portal
                        </div>
                        <h1 className="text-6xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-8 italic">
                            JOIN THE <br />
                            <span className="text-creative-purple">ZEROBITE.</span>
                        </h1>
                        <p className="text-xl lg:text-3xl text-white/40 max-w-xl font-medium leading-tight mb-12">
                            Secure your place in the ecosystem. Your contribution is critical to the zero-waste directive.
                        </p>

                        <div className="grid grid-cols-2 gap-8 lg:gap-16 pt-12 border-t border-white/5">
                            <div>
                                <span className="block text-4xl font-black text-creative-lime mb-2 tracking-tighter">50K+</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Liters Saved</span>
                            </div>
                            <div>
                                <span className="block text-4xl font-black text-creative-purple mb-2 tracking-tighter">2K+</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Active Units</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Section - Onboarding Interface */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
                    <Card variant="premium" className="w-full max-w-xl p-12 lg:p-20 relative border-white/5">
                        <div className="absolute top-0 right-0 p-8">
                            <div className="text-xs font-black text-creative-lime tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                                STEP 0{step} / 02
                            </div>
                        </div>

                        <h2 className="text-4xl font-black tracking-tighter mb-4 italic uppercase">Account Setup</h2>
                        <p className="text-white/40 mb-12 font-medium">Please define your profile details to get started.</p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {error && (
                                <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-4 animate-shake">
                                    <span className="text-2xl">⚠️</span>
                                    {error}
                                </div>
                            )}

                            {step === 1 ? (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Codename (Full Name)</label>
                                        <input
                                            name="fullName"
                                            type="text"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none placeholder:text-white/10"
                                            placeholder="OPERATOR NAME"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Comms Link (Email)</label>
                                        <input
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none placeholder:text-white/10"
                                            placeholder="OPERATOR@SYSTEM.ORG"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center ml-4">
                                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Access Key</label>
                                                {formData.password && (
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${passwordStrength.color} text-black animate-pulse`}>
                                                        {passwordStrength.label}
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                name="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none placeholder:text-white/10"
                                                placeholder="••••••••"
                                                required
                                            />
                                            {formData.password && (
                                                <div className="mx-6 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${passwordStrength.color} transition-all duration-500`}
                                                        style={{ width: `${passwordStrength.score}%` }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Confirm Key</label>
                                            <input
                                                name="confirmPassword"
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none placeholder:text-white/10"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button type="button" size="xl" className="w-full" onClick={handleNextStep}>
                                        PROCEED TO DEPLOYMENT →
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Operational Hub (Hostel)</label>
                                        <select
                                            name="hostelId"
                                            value={formData.hostelId}
                                            onChange={handleChange}
                                            className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="" className="bg-black">SELECT HUB</option>
                                            {hostels.map(h => (
                                                <option key={h.id} value={h.id} className="bg-black">{h.name.toUpperCase()} ({h.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Entity Unit (Room #)</label>
                                        <input
                                            name="roomNumber"
                                            type="text"
                                            value={formData.roomNumber}
                                            onChange={handleChange}
                                            className="w-full px-8 py-6 rounded-[2rem] bg-white/5 border border-white/10 text-xl font-bold transition-all focus:border-creative-lime focus:ring-4 focus:ring-creative-lime/20 outline-none placeholder:text-white/10"
                                            placeholder="A-101"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Nutritional Protocol</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {dietaryOptions.map(option => (
                                                <label
                                                    key={option.value}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formData.dietaryPreference === option.value
                                                        ? 'border-creative-lime bg-creative-lime/10 shadow-[0_0_20px_rgba(163,230,53,0.2)]'
                                                        : 'border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="dietaryPreference"
                                                        value={option.value}
                                                        checked={formData.dietaryPreference === option.value}
                                                        onChange={handleChange}
                                                        className="sr-only"
                                                    />
                                                    <span className="text-3xl mb-2">{option.icon}</span>
                                                    <span className="text-[10px] font-black tracking-widest">{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Button type="button" variant="ghost" size="xl" className="flex-1" onClick={() => setStep(1)}>
                                            ← BACK
                                        </Button>
                                        <Button type="submit" size="xl" className="flex-[2]" isLoading={loading}>
                                            INITIALIZE DEPLOYMENT
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>

                        <div className="mt-12 text-center">
                            <p className="text-white/30 font-bold uppercase text-[10px] tracking-[0.3em]">
                                Already active? {' '}
                                <Link to="/login" className="text-creative-lime hover:underline">Auth Access</Link>
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div >
    )
}
