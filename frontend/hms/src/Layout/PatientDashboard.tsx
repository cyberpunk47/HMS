import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../Components/Layout/AppSidebar";
import AppHeader from "../Components/Layout/AppHeader";
import { Drawer } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

const PatientDashboard = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div className="flex min-h-screen bg-gray-50">
            {!isMobile && (
                <AppSidebar
                    role="patient"
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            )}

            {isMobile && (
                <Drawer
                    opened={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    padding={0}
                    size="auto"
                    withCloseButton={false}
                    overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
                >
                    <AppSidebar role="patient" />
                </Drawer>
            )}

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

export default PatientDashboard;