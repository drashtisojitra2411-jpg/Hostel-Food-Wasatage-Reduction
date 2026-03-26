import { useEffect, useMemo, useState } from 'react'
import Navigation from '../../components/layout/Navigation'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

export default function StudentMenu() {
    const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [weekStart, setWeekStart] = useState('')
    const [menuOptions, setMenuOptions] = useState({})
    const [myVotes, setMyVotes] = useState({})
    const [selectedVotes, setSelectedVotes] = useState({})
    const [finalMenu, setFinalMenu] = useState({})

    const now = new Date()
    const isVotingTime = now.getDay() === 4 && now.getHours() >= 6 && now.getHours() < 20

    function getAuthHeaders() {
        const token = localStorage.getItem('auth_token')
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    async function fetchMenuData() {
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            const [optionsRes, finalRes] = await Promise.all([
                fetch(`${API_URL}/api/menu-options`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    }
                }),
                fetch(`${API_URL}/api/final-menu`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    }
                })
            ])

            const optionsData = await optionsRes.json().catch(() => ({}))
            const finalData = await finalRes.json().catch(() => ({}))

            if (!optionsRes.ok) {
                throw new Error(optionsData?.error || optionsData?.message || `menu-options failed (${optionsRes.status})`)
            }
            if (!finalRes.ok) {
                throw new Error(finalData?.error || finalData?.message || `final-menu failed (${finalRes.status})`)
            }

            setWeekStart(optionsData?.week_start || '')
            setMenuOptions(optionsData?.options || {})
            setMyVotes(optionsData?.my_votes || {})
            setSelectedVotes(optionsData?.my_votes || {})
            setFinalMenu(finalData?.menu || {})
        } catch (fetchError) {
            console.error('Menu page fetch error:', fetchError)
            setError(fetchError.message || 'Failed to load menu')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMenuData()
    }, [API_URL])

    const totalSelected = useMemo(() => Object.keys(selectedVotes).length, [selectedVotes])

    function handleSelect(day, mealType, option) {
        const key = `${day}_${mealType}`
        setSelectedVotes((prev) => ({
            ...prev,
            [key]: option
        }))
    }

    async function submitVotes() {
        if (!isVotingTime) return
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const entries = Object.entries(selectedVotes)
            if (!entries.length) {
                throw new Error('Please select at least one option before submitting')
            }

            for (const [key, selectedOption] of entries) {
                const [day, mealType] = key.split('_')
                const response = await fetch(`${API_URL}/api/vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        day,
                        mealType,
                        selectedOption,
                        weekStart
                    })
                })
                const data = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(data?.error || data?.message || `Vote failed (${response.status})`)
                }
            }

            setSuccess('Votes submitted successfully')
            await fetchMenuData()
        } catch (voteError) {
            console.error('Vote submit error:', voteError)
            setError(voteError.message || 'Failed to submit votes')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />
            <main className="lg:ml-72 pt-20 pb-24 px-4 sm:px-6 lg:px-10 lg:py-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-6 sm:mb-8">
                        <p className="text-sm text-white/60">Weekly Menu Voting</p>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Choose One Option Per Meal</h1>
                        <p className="mt-2 text-sm text-white/60">
                            {isVotingTime ? 'Voting Open: Thursday, 6 AM - 8 PM' : 'Voting closed. Final menu shown below.'}
                        </p>
                        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
                        {success ? <p className="mt-2 text-sm text-emerald-300">{success}</p> : null}
                    </header>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {DAYS.map((day) => (
                                <div key={day} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse h-44" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {DAYS.map((day) => (
                                    <article key={day} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-lg font-semibold">{day}</h2>
                                            <span className={`text-[11px] px-2 py-1 rounded-full border ${isVotingTime ? 'border-creative-lime/40 text-creative-lime' : 'border-sky-300/40 text-sky-300'}`}>
                                                {isVotingTime ? 'Voting Open' : 'Final Menu'}
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {MEAL_TYPES.map((mealType) => {
                                                const options = menuOptions?.[day]?.[mealType] || []
                                                const selected = selectedVotes?.[`${day}_${mealType}`] || ''
                                                const voted = myVotes?.[`${day}_${mealType}`]
                                                const finalItem = finalMenu?.[day]?.[mealType] || options[0] || 'Not available'

                                                return (
                                                    <div key={`${day}-${mealType}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-sm font-semibold capitalize">{mealType}</p>
                                                            {voted ? <span className="text-[10px] text-emerald-300">Voted</span> : null}
                                                        </div>

                                                        {isVotingTime ? (
                                                            <select
                                                                value={selected}
                                                                onChange={(e) => handleSelect(day, mealType, e.target.value)}
                                                                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-creative-lime"
                                                            >
                                                                <option value="" className="bg-black text-white">
                                                                    Select an option
                                                                </option>
                                                                {options.map((option) => (
                                                                    <option key={option} value={option} className="bg-black text-white">
                                                                        {option}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <p className="text-sm text-white/85">{finalItem}</p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </article>
                                ))}
                            </section>

                            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-sm text-white/70">Selected votes: {totalSelected}</p>
                                <button
                                    type="button"
                                    disabled={!isVotingTime || saving}
                                    onClick={submitVotes}
                                    className="w-full sm:w-auto rounded-xl px-5 py-3 text-sm font-semibold bg-creative-lime text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Submitting...' : 'Submit Votes'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
