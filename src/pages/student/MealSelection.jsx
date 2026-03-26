import { useEffect, useMemo, useState } from 'react'
import Navigation from '../../components/layout/Navigation'
import api from '../../lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const fallbackMenu = {
    Monday: { breakfast: 'Poha', lunch: 'Dal Rice', dinner: 'Khichdi' },
    Tuesday: { breakfast: 'Upma', lunch: 'Paneer Roti', dinner: 'Pulao' },
    Wednesday: { breakfast: 'Sandwich', lunch: 'Rajma Rice', dinner: 'Chapati Sabji' },
    Thursday: { breakfast: 'Idli Sambar', lunch: 'Veg Biryani', dinner: 'Curd Rice' },
    Friday: { breakfast: 'Paratha', lunch: 'Sambar Rice', dinner: 'Lemon Rice' },
    Saturday: { breakfast: 'Dosa', lunch: 'Kadhi Chawal', dinner: 'Veg Noodles' },
    Sunday: { breakfast: 'Chole Bhature', lunch: 'Special Thali', dinner: 'Special Meal' }
}

const mealMeta = {
    breakfast: { icon: '🍳', title: 'BREAKFAST', time: '07:30 - 09:30' },
    lunch: { icon: '🍛', title: 'LUNCH', time: '12:30 - 14:30' },
    dinner: { icon: '🌙', title: 'DINNER', time: '19:30 - 21:30' }
}

export default function FinalMenu() {
    const [menu, setMenu] = useState(fallbackMenu)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    useEffect(() => {
        let mounted = true

        async function loadFinalMenu() {
            setLoading(true)
            setError('')
            try {
                const data = await api.get('/api/final-menu')

                if (mounted && data?.menu && typeof data.menu === 'object') {
                    setMenu({ ...fallbackMenu, ...data.menu })
                } else if (mounted) {
                    setMenu(fallbackMenu)
                    setError('Using fallback menu')
                }
            } catch (err) {
                if (mounted) {
                    console.error('Final menu fetch error:', err)
                    setMenu(fallbackMenu)
                    setError('Using fallback menu')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadFinalMenu()
        return () => {
            mounted = false
        }
    }, [])

    const cards = useMemo(() => DAYS.map((day) => ({ day, meals: menu?.[day] || fallbackMenu[day] })), [menu])

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black">
            <Navigation />

            <main className="lg:ml-72 min-h-screen pt-20 pb-24 lg:py-8 px-4 md:px-8 lg:px-10">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8">
                        <p className="text-sm text-white/60">Weekly Plan</p>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight italic uppercase">Finalized Menu</h1>
                        {error ? <p className="mt-2 text-sm text-amber-300">{error}</p> : null}
                    </header>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {DAYS.map((day) => (
                                <div key={day} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse h-72" />
                            ))}
                        </div>
                    ) : (
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cards.map(({ day, meals }) => {
                                const isToday = day === today
                                return (
                                    <article
                                        key={day}
                                        className={`rounded-2xl border p-5 bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-20px_rgba(255,255,255,0.28)] ${
                                            isToday
                                                ? 'border-creative-lime/60 shadow-[0_0_0_1px_rgba(163,230,53,0.35),0_0_40px_-18px_rgba(163,230,53,0.8)]'
                                                : 'border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-semibold">{day}</h2>
                                            <div className="flex items-center gap-2">
                                                {isToday ? (
                                                    <span className="rounded-full bg-creative-lime text-black text-[11px] font-semibold px-2.5 py-1">
                                                        Today
                                                    </span>
                                                ) : null}
                                                <span className="rounded-full border border-sky-300/40 bg-sky-300/10 text-sky-300 text-[11px] font-semibold px-2.5 py-1">
                                                    Final Menu
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {['breakfast', 'lunch', 'dinner'].map((mealKey) => (
                                                <div key={`${day}-${mealKey}`} className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-xs tracking-wider text-white/65 font-semibold">
                                                            {mealMeta[mealKey].icon} {mealMeta[mealKey].title}
                                                        </p>
                                                        <span className="text-[11px] text-white/45">{mealMeta[mealKey].time}</span>
                                                    </div>
                                                    <p className="text-base sm:text-lg font-semibold text-white mt-2 break-words">
                                                        {meals?.[mealKey] || fallbackMenu[day][mealKey]}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                )
                            })}
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}
