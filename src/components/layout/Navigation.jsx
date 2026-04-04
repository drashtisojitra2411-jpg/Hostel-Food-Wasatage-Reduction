import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const studentLinks = [
    { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home' },
    { path: '/student/menu', label: 'Menu', shortLabel: 'Menu' },
    { path: '/student/feedback', label: 'Feedback', shortLabel: 'Feedback' },
    { path: '/meal-booking', label: 'Meal Booking', shortLabel: 'Book' },
    { path: '/scan-attendance', label: 'Scan Attendance', shortLabel: 'Scan' },
    { path: '/history', label: 'History', shortLabel: 'History' },
    { path: '/impact', label: 'My Impact', shortLabel: 'Impact' },
    { path: '/settings', label: 'Profile', shortLabel: 'Profile' }
]

const messManagerLinks = [
    { path: '/mess-manager', label: 'Dashboard', shortLabel: 'Home' },
    { path: '/admin/feedback', label: 'Feedback', shortLabel: 'Feedback' },
    { path: '/mess-manager/attendance', label: 'Attendance', shortLabel: 'Attendance' },
    { path: '/mess-manager/inventory', label: 'Inventory', shortLabel: 'Inventory' },
    { path: '/mess-manager/menu', label: 'Menu Manager', shortLabel: 'Menu' },
    { path: '/generate-qr', label: 'Generate QR', shortLabel: 'QR' },
    { path: '/meal-selection', label: 'Week Menu', shortLabel: 'Week' },
    { path: '/mess-manager/wastage/log', label: 'Wastage Log', shortLabel: 'Wastage' },
    { path: '/mess-manager/donations', label: 'Donations', shortLabel: 'Donations' },
    { path: '/mess-manager/reports', label: 'Reports', shortLabel: 'Reports' }
]

const hostelAdminLinks = [
    { path: '/mess-manager', label: 'Dashboard', shortLabel: 'Home' },
    { path: '/admin/feedback', label: 'Feedback', shortLabel: 'Feedback' },
    { path: '/admin/attendance', label: 'Attendance', shortLabel: 'Attendance' },
    { path: '/generate-qr', label: 'Generate QR', shortLabel: 'QR' },
    { path: '/admin/metrics', label: 'Attendance Metrics', shortLabel: 'Metrics' },
    { path: '/mess-manager/reports', label: 'Reports', shortLabel: 'Reports' }
]

const adminLinks = [
    { path: '/admin', label: 'Console', shortLabel: 'Console' },
    { path: '/admin/feedback', label: 'Feedback', shortLabel: 'Feedback' },
    { path: '/admin/attendance', label: 'Attendance', shortLabel: 'Attendance' },
    { path: '/admin/personnel', label: 'Personnel', shortLabel: 'Personnel' },
    { path: '/admin/entities', label: 'Entities', shortLabel: 'Entities' },
    { path: '/admin/week-menu', label: 'Week Menu', shortLabel: 'Week' },
    { path: '/admin/stock', label: 'Stock', shortLabel: 'Stock' },
    { path: '/admin/metrics', label: 'Metrics', shortLabel: 'Metrics' },
    { path: '/admin/hatchery', label: 'Hatchery', shortLabel: 'Hatchery' },
    { path: '/admin/system', label: 'System', shortLabel: 'System' }
]

const chefLinks = [
    { path: '/chef', label: 'Kitchen Dashboard', shortLabel: 'Kitchen' },
    { path: '/admin/feedback', label: 'Feedback Archive', shortLabel: 'Feedback' }
]

const ngoLinks = [
    { path: '/ngo', label: 'Rescue Hub', shortLabel: 'Rescue' }
]

const studentBottomLinks = [
    { path: '/student/menu', label: 'Menu' },
    { path: '/student/feedback', label: 'Feedback' },
    { path: '/settings', label: 'Profile' }
]

export default function Navigation({ customLinks = null, activeItem = '', onItemSelect = null }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { profile, role, isMessManager, isHostelAdmin, isSuperAdmin, isChef, isNgo, isStudent, signOut } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const isSectionNav = typeof onItemSelect === 'function' && Array.isArray(customLinks) && customLinks.length > 0

    const links = useMemo(() => {
        if (Array.isArray(customLinks) && customLinks.length > 0) {
            return customLinks
        }

        if (isSuperAdmin()) return adminLinks
        if (isChef()) return chefLinks
        if (isNgo()) return ngoLinks
        if (isHostelAdmin()) return hostelAdminLinks
        if (isMessManager()) return messManagerLinks
        return studentLinks
    }, [customLinks, isSuperAdmin, isChef, isNgo, isMessManager, isHostelAdmin])

    const isStudentRole = isStudent()

    const isLinkActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard'
        }
        return location.pathname === path || location.pathname.startsWith(`${path}/`)
    }

    async function handleLogout() {
        await signOut()
        navigate('/login', { replace: true })
    }

    return (
        <>
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-black/90 backdrop-blur-xl border-b border-white/10 safe-top">
                <div className="h-full px-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-creative-lime text-creative-dark flex items-center justify-center text-xs font-black">ZB</div>
                        <span className="text-white font-semibold tracking-tight truncate">ZeroBite</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-white/20 text-white text-sm"
                        aria-label="Toggle navigation menu"
                    >
                        Menu
                    </button>
                </div>
            </header>

            {isMobileMenuOpen && (
                <button
                    type="button"
                    className="lg:hidden fixed inset-0 bg-black/70 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close menu overlay"
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 h-full w-[82vw] max-w-72 lg:w-72 bg-black border-r border-white/10 transform transition-transform duration-300 ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="h-full flex flex-col">
                    <div className="px-5 pt-5 pb-4 border-b border-white/10">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Signed In</p>
                        <p className="mt-2 text-white font-semibold truncate">{profile?.full_name || 'Student User'}</p>
                        <p className="text-xs text-white/50 truncate">{profile?.email || 'No email available'}</p>
                        <p className="text-[11px] mt-2 text-creative-lime uppercase tracking-wide">{role || 'unknown'}</p>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4">
                        <ul className="space-y-2">
                            {links.map((link, index) => {
                                const key = link.key || `${link.path || 'section'}-${link.label}-${index}`
                                const active = isSectionNav
                                    ? activeItem === link.key
                                    : isLinkActive(link.path)

                                const baseClasses = `w-full min-h-[44px] rounded-xl px-3 py-3 text-left transition-colors ${
                                    active ? 'bg-creative-lime text-black font-semibold' : 'text-white/85 hover:bg-white/10'
                                }`

                                if (isSectionNav) {
                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onItemSelect(link.key)
                                                    setIsMobileMenuOpen(false)
                                                }}
                                                className={baseClasses}
                                            >
                                                {link.label}
                                            </button>
                                        </li>
                                    )
                                }

                                return (
                                    <li key={key}>
                                        <Link to={link.path} onClick={() => setIsMobileMenuOpen(false)} className={`block ${baseClasses}`}>
                                            {link.label}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>

                    <div className="p-3 border-t border-white/10">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full min-h-[44px] rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {isStudentRole && !isSectionNav && (
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-white/10 safe-bottom">
                    <ul className="grid grid-cols-3 gap-1 px-2 py-2">
                        {studentBottomLinks.map((link) => {
                            const active = isLinkActive(link.path)
                            return (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className={`min-h-[48px] rounded-xl flex items-center justify-center text-sm ${
                                            active ? 'bg-creative-lime text-black font-semibold' : 'text-white/70'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            )}
        </>
    )
}
