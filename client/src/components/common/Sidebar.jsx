import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  FileText,
  LogOut,
  User,
  Banknote
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/dashboard/transactions", icon: Banknote },
  { name: "Revenue", href: "/dashboard/revenue", icon: TrendingUp },
  { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
];

export function Sidebar({ mobile = false }) {
  const { auth } = useAuth();
  const pathname = usePathname();

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    window.location.href = `/auth/login`;
  }

  return (
    <div className={`flex flex-col h-full ${mobile ? "p-6" : "p-6"}`}>
      <div className="flex items-center mb-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
            <span className="text-white font-bold text-sm">FM</span>
          </div>
          <span className="font-bold text-lg">FMAN</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2 rounded transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t pt-4 mt-4">
        <div className="flex items-center space-x-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {auth.user?.name || "Admin User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {auth.user?.email || "admin@example.com"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-gray-600 hover:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
