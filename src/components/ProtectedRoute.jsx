import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Loading Spinner Component
function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
        </div>
    )
}

// Protect routes that require authentication
export function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, role, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <LoadingSpinner />
    }

    // Not logged in
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Role check (if roles specified)
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />
    }

    return children
}

// Redirect authenticated users away from auth pages
export function PublicRoute({ children }) {
    const { user, role, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <LoadingSpinner />
    }

    if (user) {
        // Redirect to appropriate dashboard
        const from = location.state?.from?.pathname || getDashboardPath(role)
        return <Navigate to={from} replace />
    }

    return children
}

// Get dashboard path based on role
export function getDashboardPath(role) {
    switch (role) {
        case 'super_admin':
            return '/admin'
        case 'hostel_admin':
            return '/mess-manager'
        case 'mess_manager':
            return '/mess-manager'
        case 'chef':
            return '/chef'
        case 'ngo':
            return '/ngo'
        case 'student':
        default:
            return '/dashboard'
    }
}

export default ProtectedRoute
