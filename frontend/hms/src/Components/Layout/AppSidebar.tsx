import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { removeJwt } from "../../Slices/JwtSlice";
import { removeUser } from "../../Slices/UserSlice";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Pill,
  Package,
  Receipt,
  LogOut,
  Calendar,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

interface SidebarLink {
  name: string;
  url: string;
  icon: React.ReactNode;
}

const adminLinks: SidebarLink[] = [
  { name: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
  { name: "Patients", url: "/admin/patients", icon: <Users size={20} /> },
  { name: "Doctors", url: "/admin/doctors", icon: <Stethoscope size={20} /> },
  { name: "Medicine", url: "/admin/medicine", icon: <Pill size={20} /> },
  { name: "Inventory", url: "/admin/inventory", icon: <Package size={20} /> },
  { name: "Sales", url: "/admin/sales", icon: <Receipt size={20} /> },
];

const doctorLinks: SidebarLink[] = [
  { name: "Dashboard", url: "/doctor/dashboard", icon: <LayoutDashboard size={20} /> },
  { name: "Profile", url: "/doctor/profile", icon: <User size={20} /> },
  { name: "Patients", url: "/doctor/patients", icon: <Users size={20} /> },
  { name: "Appointments", url: "/doctor/appointments", icon: <Calendar size={20} /> },
  { name: "Pharmacy", url: "/doctor/pharmacy", icon: <Pill size={20} /> },
];

const patientLinks: SidebarLink[] = [
  { name: "Dashboard", url: "/patient/dashboard", icon: <LayoutDashboard size={20} /> },
  { name: "Profile", url: "/patient/profile", icon: <User size={20} /> },
  { name: "Appointments", url: "/patient/appointments", icon: <Calendar size={20} /> },
];

const linksByRole: Record<string, SidebarLink[]> = {
  admin: adminLinks,
  doctor: doctorLinks,
  patient: patientLinks,
};

interface AppSidebarProps {
  role: "admin" | "doctor" | "patient";
  collapsed?: boolean;
  onToggle?: () => void;
}

const AppSidebar = ({ role, collapsed = false, onToggle }: AppSidebarProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const links = linksByRole[role] || [];

  const handleLogout = () => {
    dispatch(removeJwt());
    dispatch(removeUser());
    navigate("/login");
  };

  return (
    <>
      {/* Spacer div to push content */}
      <div
        className="shrink-0 transition-all duration-300"
        style={{ width: collapsed ? "68px" : "256px" }}
      />

      {/* Fixed sidebar */}
      <aside
        className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-40 transition-all duration-300"
        style={{ width: collapsed ? "68px" : "256px" }}
      >
        {/* Brand */}
        <div className="p-4 flex items-center gap-2 border-b border-gray-100">
          <div className="h-9 w-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <HeartPulse className="h-5 w-5 text-teal-600" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-teal-600 transition-opacity duration-200">
              Pulse
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.url}
              to={link.url}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? link.name : undefined}
            >
              <span className="shrink-0">{link.icon}</span>
              {!collapsed && <span>{link.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          {/* Collapse toggle */}
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={`w-full gap-2 text-gray-500 hover:text-gray-700 ${
                collapsed ? "justify-center" : "justify-start"
              }`}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!collapsed && <span>Collapse</span>}
            </Button>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`w-full gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 ${
              collapsed ? "justify-center" : "justify-start"
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
