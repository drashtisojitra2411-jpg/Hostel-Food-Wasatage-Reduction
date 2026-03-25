import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import { useMeals } from '../../context/MealContext'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_LABELS = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner'
}

export default function StudentMenu() {
    const { finalizedMenu, loading, error } = useMeals()
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />

            <main className="lg:ml-72 pt-20 pb-24 px-4 sm:px-6 lg:px-10 lg:py-8">
                <div className="max-w-7xl mx-auto">
                    <header>
                        <p className="text-sm text-white/70">Student Menu</p>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Weekly Meal Schedule</h1>
                    </header>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-10 h-10 border-4 border-creative-lime/30 border-t-creative-lime rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <Card variant="glass" className="rounded-2xl p-6 mt-5" hover={false}>
                            <p className="text-red-300 text-sm">{error}</p>
                        </Card>
                    ) : (
                        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
                            {DAYS.map((day) => {
                                const isToday = day === today
                                return (
                                    <Card
                                        key={day}
                                        variant={isToday ? 'premium' : 'glass'}
                                        className={`rounded-2xl p-4 sm:p-5 ${isToday ? 'ring-2 ring-creative-lime/60' : ''}`}
                                        hover={false}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <h2 className="text-lg font-semibold capitalize">{day}</h2>
                                            {isToday && (
                                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-creative-lime text-black font-medium">
                                                    Today
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            {MEAL_TYPES.map((meal) => {
                                                const slot = finalizedMenu?.[`${day}_${meal}`]
                                                return (
                                                    <div key={meal} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
                                                        <p className="text-xs text-white/60">{MEAL_LABELS[meal]}</p>
                                                        <p className="text-sm font-medium mt-1 break-words">{slot?.name || 'Not scheduled'}</p>
                                                        {slot?.vote_count > 0 && (
                                                            <p className="text-xs text-creative-lime mt-1">Votes: {slot.vote_count}</p>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </Card>
                                )
                            })}
                        </section>
                    )}
                </div>
            </main>
        </div>
    )
}
