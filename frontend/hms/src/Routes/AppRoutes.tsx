import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";

import AdminDashboard from "../Layout/AdminDashboard";
import PatientDashboard from "../Layout/PatientDashboard";
import DoctorDashboard from "../Layout/DoctorDashboard";

import LoginPage from "../Pages/LoginPage";
import RegisterPage from "../Pages/RegisterPage";

import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";

import NotFoundPage from "../Pages/Patient/NotFoundPage";

// Lazy pages
const AdminDashboardPage = lazy(() => import("../Pages/Admin/AdminDashboardPage"));
const AdminMedicinePage = lazy(() => import("../Pages/Admin/AdminMedicinePage"));
const AdminInventoryPage = lazy(() => import("../Pages/Admin/AdminInventoryPage"));
const AdminSalesPage = lazy(() => import("../Pages/Admin/AdminSalesPage"));
const AdminPatientPage = lazy(() => import("../Pages/Admin/AdminPatientPage"));
const AdminDoctorPage = lazy(() => import("../Pages/Admin/AdminDoctorPage"));

const DoctorDashboardPage = lazy(() => import("../Pages/Doctor/DoctorDashboardPage"));
const DoctorProfilePage = lazy(() => import("../Pages/Doctor/DoctorProfilePage"));
const DoctorPharmacyPage = lazy(() => import("../Pages/Doctor/DoctorPharmacyPage"));
const DoctorAppointmentPage = lazy(() => import("../Pages/Doctor/DoctorAppointmentPage"));
const DoctorAppointmentDetailsPage = lazy(
    () => import("../Pages/Doctor/DoctorAppointmentDetailsPage")
);
const DoctorPatientPage = lazy(() => import("../Pages/Doctor/DoctorPatientPage"));

const PatientDashboardPage = lazy(
    () => import("../Pages/Patient/PatientDashboardPage")
);
const PatientProfilePage = lazy(
    () => import("../Pages/Patient/PatientProfilePage")
);
const PatientAppointmentPage = lazy(
    () => import("../Pages/Patient/PatientAppointmentPage")
);

// const DashboardPage = lazy(() => import("@/testing"));

const RootRedirect = () => {
    const token = useSelector((state: any) => state.jwt);

    if (token) {
        try {
            const user: any = jwtDecode(token);

            return (
                <Navigate
                    to={`/${user?.role?.toLowerCase()}/dashboard`}
                    replace
                />
            );
        } catch (e) {
            return <Navigate to="/login" replace />;
        }
    }

    return <Navigate to="/login" replace />;
};

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Suspense
                fallback={
                    <div className="flex min-h-screen items-center justify-center">
                        Loading...
                    </div>
                }
            >
                <Routes>

                    <Route path="/" element={<RootRedirect />} />

                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <RegisterPage />
                            </PublicRoute>
                        }
                    />

                    {/* ADMIN */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            path="dashboard"
                            element={<AdminDashboardPage />}
                        />

                        <Route
                            path="medicine"
                            element={<AdminMedicinePage />}
                        />

                        <Route
                            path="inventory"
                            element={<AdminInventoryPage />}
                        />

                        <Route
                            path="sales"
                            element={<AdminSalesPage />}
                        />

                        <Route
                            path="patients"
                            element={<AdminPatientPage />}
                        />

                        <Route
                            path="doctors"
                            element={<AdminDoctorPage />}
                        />

                        {/* <Route
                            path="testing"
                            element={<DashboardPage />}
                        /> */}
                    </Route>

                    {/* DOCTOR */}
                    <Route
                        path="/doctor"
                        element={
                            <ProtectedRoute>
                                <DoctorDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            path="dashboard"
                            element={<DoctorDashboardPage />}
                        />

                        <Route
                            path="profile"
                            element={<DoctorProfilePage />}
                        />

                        <Route
                            path="pharmacy"
                            element={<DoctorPharmacyPage />}
                        />

                        <Route
                            path="appointments"
                            element={<DoctorAppointmentPage />}
                        />

                        <Route
                            path="appointments/:id"
                            element={<DoctorAppointmentDetailsPage />}
                        />

                        <Route
                            path="patients"
                            element={<DoctorPatientPage />}
                        />
                    </Route>

                    {/* PATIENT */}
                    <Route
                        path="/patient"
                        element={
                            <ProtectedRoute>
                                <PatientDashboard />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            path="dashboard"
                            element={<PatientDashboardPage />}
                        />

                        <Route
                            path="profile"
                            element={<PatientProfilePage />}
                        />

                        <Route
                            path="appointments"
                            element={<PatientAppointmentPage />}
                        />
                    </Route>

                    <Route
                        path="*"
                        element={<NotFoundPage />}
                    />

                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRoutes;