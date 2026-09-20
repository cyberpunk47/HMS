import type { JSX } from "react"
import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"


interface ProtectedRouteProps {
    children: JSX.Element
    // Role required for this section (ADMIN / DOCTOR / PATIENT). The backend enforces access on
    // every API call; this only keeps users out of screens that are not theirs.
    role?: string
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const token = useSelector((state: any) => state.jwt)
    if (!token) {
        return <Navigate to="/login" />
    }
    if (role) {
        try {
            const user: any = jwtDecode(token)
            if (user?.role !== role) {
                return <Navigate to={`/${String(user?.role || "").toLowerCase()}/dashboard`} replace />
            }
        } catch {
            return <Navigate to="/login" />
        }
    }
    return children;
}

export default ProtectedRoute;
