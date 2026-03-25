import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navigation from '../../components/layout/Navigation'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import WeeklyMenu from '../../components/common/WeeklyMenu'
import WastageBarChart from '../../components/analytics/WastageBarChart'
import WastageTrendChart from '../../components/analytics/WastageTrendChart'
import ProgressRing from '../../components/analytics/ProgressRing'
import api from '../../lib/api'

export default function MessManagerDashboard() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState({ totalBookings: 0, expectedAttendance: 0, lowStockItems: 0, todayWastage: 0 })
    const [barData, setBarData] = useState([])
    const [trendData, setTrendData] = useState([])
    const [alerts, setAlerts] = useState([])

    useEffect(() => {
        fetchDashboardData()
    }, [])

    async function fetchDashboardData() {
        try {
            const [dashRes, analyticsRes] = await Promise.all([
                api.get('/api/mess-manager/dashboard'),
                api.get('/api/chef/analytics')
            ])
            setStats({
                totalBookings: dashRes?.stats?.total_bookings || 0,
                expectedAttendance: dashRes?.stats?.expected_attendance || 0,
                lowStockItems: dashRes?.stats?.low_stock_items || 0,
                todayWastage: dashRes?.stats?.today_wastage || 0
            })
            setAlerts(Array.isArray(dashRes?.alerts) ? dashRes.alerts : [])
            setBarData(Array.isArray(analyticsRes?.weekly_waste) ? analyticsRes.weekly_waste : [])
            setTrendData(Array.isArray(analyticsRes?.waste_trend) ? analyticsRes.waste_trend : [])
        } catch {
            setStats({ totalBookings: 0, expectedAttendance: 0, lowStockItems: 0, todayWastage: 0 })
            setAlerts([])
            setBarData([])
            setTrendData([])
        }
    }

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to terminate the current session?')) {
            await signOut()
            navigate('/login', { replace: true })
        }
    }

    const quickActions = [
        { icon: '📝', label: 'LOG WASTE', path: '/mess-manager/wastage/log' },
        { icon: '📦', label: 'INVENTORY', path: '/mess-manager/inventory' },
        { icon: '🍲', label: 'PROVISIONS', path: '/mess-manager/menu' },
        { icon: '📊', label: 'ANALYTICS', path: '/mess-manager/reports' }
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-creative-lime selection:text-black overflow-x-hidden">
            <Navigation />
            <main className="lg:ml-72 min-h-screen p-8 lg:p-12 relative">
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] italic">OPERATIONAL<br /><span className="text-creative-purple">LOGISTICS.</span></h1>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate('/', { replace: true })}>HOME</Button>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-500/30 text-red-500/60">LOGOUT</Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {[
                        { label: 'PROVISIONS SECURED', value: stats.totalBookings, icon: '📋', color: 'text-creative-lime' },
                        { label: 'EXPECTED UNITS', value: stats.expectedAttendance, icon: '👥', color: 'text-white' },
                        { label: 'STOCK CRITICAL', value: stats.lowStockItems, icon: '⚠️', color: 'text-red-500' },
                        { label: 'WASTE MEASURED', value: `${stats.todayWastage}KG`, icon: '🗑️', color: 'text-creative-purple' }
                    ].map((stat, i) => (
                        <Card key={i} variant="glass">
                            <div className="text-3xl mb-4">{stat.icon}</div>
                            <h3 className={`text-5xl font-black tracking-tighter mb-1 ${stat.color}`}>{stat.value}</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                        </Card>
                    ))}

                    <div className="lg:col-span-1 grid grid-cols-2 gap-4">
                        {quickActions.map((action) => (
                            <Link key={action.label} to={action.path}>
                                <Card variant="glass" className="h-full p-6 flex flex-col items-center justify-center text-center gap-3">
                                    <span className="text-3xl">{action.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{action.label}</span>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="lg:col-span-3">
                        <Card variant="glass" className="p-10">
                            <h2 className="text-3xl font-black tracking-tighter italic uppercase mb-10">Flux Analysis</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <WastageBarChart data={barData} />
                                <WastageTrendChart data={trendData} />
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <WeeklyMenu compact />
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="glass" className="h-full border-l-4 border-l-red-500/50">
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase mb-8">Priority Alerts</h2>
                            <div className="space-y-4">
                                {alerts.length === 0 ? <div className="text-sm text-white/40">No data available</div> : alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-black/40 border border-white/10">
                                            {alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm tracking-tight text-white">{alert.message}</p>
                                            <p className="text-[10px] font-black text-white/20 mt-1 uppercase tracking-widest">{alert.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card variant="premium" className="h-full flex flex-col justify-between">
                            <h2 className="text-2xl font-black tracking-tighter italic uppercase mb-8">Efficiency Metrics</h2>
                            <div className="flex flex-col md:flex-row justify-around items-center gap-12 py-6">
                                <div className="flex flex-col items-center">
                                    <ProgressRing progress={stats.expectedAttendance > 0 ? Math.min(100, Math.round((stats.totalBookings / stats.expectedAttendance) * 100)) : 0} size={160} color="#a3e635" />
                                    <span className="block text-3xl font-black tracking-tighter mt-4">{stats.expectedAttendance > 0 ? Math.min(100, Math.round((stats.totalBookings / stats.expectedAttendance) * 100)) : 0}%</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <ProgressRing progress={Math.max(0, 100 - Math.min(100, Math.round(stats.todayWastage)))} size={130} color="#8b5cf6" />
                                    <span className="block text-2xl font-black tracking-tighter mt-4">{Math.max(0, 100 - Math.min(100, Math.round(stats.todayWastage)))}%</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
