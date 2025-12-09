"use client";

import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { authApi } from "@/api/authApi";
import Link from "next/link";

export default function Header() {
  const { auth } = useAuth();

  const isAuthenticated = auth?.isAuthenticated;
  const user = auth?.user;

  async function logout() {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    window.location.href = `/auth/login`;
  }

  return (
    <nav className="bg-white w-full h-[45px] flex items-center justify-between px-4 md:px-6 shadow-sm">
      <Link href="/" className="font-semibold">
        DIM
      </Link>

      {!isAuthenticated && (
        <div className="flex gap-3">
          <Link href="/auth/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm">Register</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
