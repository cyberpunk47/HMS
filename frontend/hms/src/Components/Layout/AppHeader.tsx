import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { removeJwt } from "../../Slices/JwtSlice";
import { removeUser } from "../../Slices/UserSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, Menu, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserProfile } from "../../Service/UserService";
import useProtectedImage from "../Utilities/Dropzone/useProtectedImage";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

const AppHeader = ({ onMobileMenuToggle, showMobileMenu }: AppHeaderProps) => {
  const dispatch = useDispatch();
  const jwt = useSelector((state: any) => state.jwt);
  const user = useSelector((state: any) => state.user);
  const [picId, setPicId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id)
      .then((data) => setPicId(data))
      .catch((error) => console.log(error));
  }, [user?.id]);

  const url = useProtectedImage(picId);

  const handleLogout = () => {
    dispatch(removeJwt());
    dispatch(removeUser());
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMobileMenuToggle}
            >
              <Menu size={20} />
            </Button>
          )}

          {/* Search */}
          <div className="relative w-48 md:w-80 hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-8 h-9 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {jwt ? (
            <>
              {/* Notification bell */}
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-500 hover:text-gray-700"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              {/* User info */}
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  {url ? (
                    <AvatarImage src={url} alt={user?.name} />
                  ) : null}
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  {user?.name}
                </span>
              </div>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 hidden md:flex"
              >
                <LogOut size={16} className="mr-1.5" />
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
