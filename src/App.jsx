import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/auth/Login'))
const ManagerLogin = lazy(() => import('./pages/auth/ManagerLogin'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const StudentDashboard = lazy(() => import('./pages/dashboards/StudentDashboard'))
const MessManagerDashboard = lazy(() => import('./pages/dashboards/MessManagerDashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const Vision = lazy(() => import('./pages/Vision'))

const MealBooking = lazy(() => import('./pages/meals/MealBooking'))
const InventoryManager = lazy(() => import('./pages/inventory/InventoryManager'))
const WastageLog = lazy(() => import('./pages/wastage/WastageLog'))
const MenuManager = lazy(() => import('./pages/menu/MenuManager'))
const Reports = lazy(() => import('./pages/mess-manager/Reports'))
const Donations = lazy(() => import('./pages/mess-manager/Donations'))
const AttendanceQR = lazy(() => import('./pages/mess-manager/AttendanceQR'))
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'))
const ChefDashboard = lazy(() => import('./pages/chef/ChefDashboard'))
const NGODashboard = lazy(() => import('./pages/ngo/NGODashboard'))

const Impact = lazy(() => import('./pages/student/Impact'))
const Feedback = lazy(() => import('./pages/student/Feedback'))
const Settings = lazy(() => import('./pages/student/Settings'))
const StudentMenu = lazy(() => import('./pages/student/StudentMenu'))
const History = lazy(() => import('./pages/student/History'))
const AttendanceHistory = lazy(() => import('./pages/student/AttendanceHistory'))
const MealSelection = lazy(() => import('./pages/student/MealSelection'))
const AttendanceScanner = lazy(() => import('./pages/student/AttendanceScanner'))

const FeedbackArchive = lazy(() => import('./pages/admin/FeedbackArchive'))
const Console = lazy(() => import('./pages/admin/Console'))
const Personnel = lazy(() => import('./pages/admin/Personnel'))
const Entities = lazy(() => import('./pages/admin/Entities'))
const WeekMenu = lazy(() => import('./pages/admin/WeekMenu'))
const Stock = lazy(() => import('./pages/admin/Stock'))
const Metrics = lazy(() => import('./pages/admin/Metrics'))
const Hatchery = lazy(() => import('./pages/admin/Hatchery'))
const System = lazy(() => import('./pages/admin/System'))

function AppFallback() {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
            <div className="text-center">
                <div className="mx-auto w-10 h-10 border-4 border-creative-lime/30 border-t-creative-lime rounded-full animate-spin" />
                <p className="mt-4 text-sm text-white/70">Loading application...</p>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <Suspense fallback={<AppFallback />}>
            <Routes>
                <Route path="/vision-protocol" element={<Vision />} />
                <Route path="/" element={<Home />} />

                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/manager/login" element={<PublicRoute><ManagerLogin /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/meal-booking" element={<ProtectedRoute allowedRoles={['student']}><MealBooking /></ProtectedRoute>} />
                <Route path="/impact" element={<ProtectedRoute allowedRoles={['student']}><Impact /></ProtectedRoute>} />
                <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={['student']}><Feedback /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['student']}><Settings /></ProtectedRoute>} />
                <Route path="/student/menu" element={<ProtectedRoute allowedRoles={['student']}><StudentMenu /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute allowedRoles={['student']}><History /></ProtectedRoute>} />
                <Route path="/attendance-history" element={<ProtectedRoute allowedRoles={['student']}><AttendanceHistory /></ProtectedRoute>} />
                <Route path="/meal-selection" element={<ProtectedRoute allowedRoles={['student', 'mess_manager', 'super_admin']}><MealSelection /></ProtectedRoute>} />
                <Route path="/attendance/scan" element={<ProtectedRoute allowedRoles={['student']}><AttendanceScanner /></ProtectedRoute>} />
                <Route path="/scan-attendance" element={<ProtectedRoute allowedRoles={['student']}><AttendanceScanner /></ProtectedRoute>} />

                <Route path="/mess-manager" element={<ProtectedRoute allowedRoles={['mess_manager', 'hostel_admin', 'super_admin']}><MessManagerDashboard /></ProtectedRoute>} />
                <Route path="/mess-manager/attendance" element={<ProtectedRoute allowedRoles={['mess_manager', 'hostel_admin', 'super_admin']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/chef" element={<ProtectedRoute allowedRoles={['chef', 'super_admin']}><ChefDashboard /></ProtectedRoute>} />
                <Route path="/ngo" element={<ProtectedRoute allowedRoles={['ngo', 'super_admin']}><NGODashboard /></ProtectedRoute>} />

                <Route path="/mess-manager/inventory" element={<ProtectedRoute allowedRoles={['mess_manager', 'super_admin']}><InventoryManager /></ProtectedRoute>} />
                <Route path="/mess-manager/wastage/log" element={<ProtectedRoute allowedRoles={['mess_manager', 'super_admin']}><WastageLog /></ProtectedRoute>} />
                <Route path="/mess-manager/menu" element={<ProtectedRoute allowedRoles={['mess_manager', 'super_admin']}><MenuManager /></ProtectedRoute>} />
                <Route path="/mess-manager/reports" element={<ProtectedRoute allowedRoles={['mess_manager', 'hostel_admin', 'super_admin']}><Reports /></ProtectedRoute>} />
                <Route path="/mess-manager/donations" element={<ProtectedRoute allowedRoles={['mess_manager', 'super_admin']}><Donations /></ProtectedRoute>} />
                <Route path="/mess-manager/attendance-qr" element={<ProtectedRoute allowedRoles={['mess_manager', 'hostel_admin']}><AttendanceQR /></ProtectedRoute>} />
                <Route path="/generate-qr" element={<ProtectedRoute allowedRoles={['mess_manager', 'hostel_admin']}><AttendanceQR /></ProtectedRoute>} />

                <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><Console /></ProtectedRoute>} />
                <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['super_admin', 'hostel_admin', 'mess_manager']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/admin/personnel" element={<ProtectedRoute allowedRoles={['super_admin']}><Personnel /></ProtectedRoute>} />
                <Route path="/admin/entities" element={<ProtectedRoute allowedRoles={['super_admin']}><Entities /></ProtectedRoute>} />
                <Route path="/admin/week-menu" element={<ProtectedRoute allowedRoles={['super_admin']}><WeekMenu /></ProtectedRoute>} />
                <Route path="/admin/stock" element={<ProtectedRoute allowedRoles={['super_admin']}><Stock /></ProtectedRoute>} />
                <Route path="/admin/metrics" element={<ProtectedRoute allowedRoles={['super_admin', 'hostel_admin']}><Metrics /></ProtectedRoute>} />
                <Route path="/admin/hatchery" element={<ProtectedRoute allowedRoles={['super_admin']}><Hatchery /></ProtectedRoute>} />
                <Route path="/admin/system" element={<ProtectedRoute allowedRoles={['super_admin']}><System /></ProtectedRoute>} />

                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><Personnel /></ProtectedRoute>} />
                <Route path="/admin/hostels" element={<ProtectedRoute allowedRoles={['super_admin']}><Entities /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['super_admin', 'hostel_admin']}><Metrics /></ProtectedRoute>} />
                <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['super_admin']}><Stock /></ProtectedRoute>} />
                <Route path="/admin/donations" element={<ProtectedRoute allowedRoles={['super_admin']}><Hatchery /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['super_admin']}><System /></ProtectedRoute>} />
                <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={['super_admin', 'mess_manager', 'hostel_admin', 'chef']}><FeedbackArchive /></ProtectedRoute>} />

                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    )
}
