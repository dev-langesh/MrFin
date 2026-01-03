"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/api/authApi";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Transactions", href: "/dashboard/transactions" },
];

export function AppBar() {
  const { auth } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    window.location.href = `/auth/login`;
  }

  const NavLinks = ({ mobile = false }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => mobile && setIsMobileMenuOpen(false)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              isActive
                ? "bg-zinc-200 text-zinc-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-12 md:h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">MrFin</h1>
        </div>

        {/* Center/Right: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <NavLinks />
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-8 w-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <User className="h-4 w-4" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none truncate">
                  {auth.user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {auth.user?.email}
                </p>
              </div>
              <Separator className="my-2" />
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </PopoverContent>
          </Popover>
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col h-full py-6">
                <div className="flex items-center gap-2 mb-8 px-2">
                  <span className="text-lg font-bold">MrFin</span>
                </div>
                <nav className="flex flex-col space-y-2 flex-1">
                  <NavLinks mobile />
                </nav>
                <div className="border-t pt-4 mt-auto">
                  <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {auth.user?.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {auth.user?.email}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-600 hover:text-red-600"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
