import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../Components/Layout/AppSidebar";
import AppHeader from "../Components/Layout/AppHeader";
import { Drawer } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

const AdminDashboard = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Desktop sidebar */}
            {!isMobile && (
                <AppSidebar
                    role="admin"
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            )}

            {/* Mobile drawer */}
            {isMobile && (
                <Drawer
                    opened={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    padding={0}
                    size="auto"
                    withCloseButton={false}
                    overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
                >
                    <AppSidebar role="admin" />
                </Drawer>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                <AppHeader
                    showMobileMenu={isMobile}
                    onMobileMenuToggle={() => setMobileOpen(true)}
                />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;