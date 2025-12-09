"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "../../../api/authApi";

import Loading from "@/components/ui/Loading";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current === true) return;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      effectRan.current = true;
      toast.error("Google authentication failed");
      router.push("/auth/login");
      return;
    }

    if (!code) {
      effectRan.current = true;
      toast.error("No authorization code found");
      router.push("/auth/login");
      return;
    }

    const loginWithGoogle = async () => {
      try {
        await authApi.googleLogin({ code });
        toast.success("Successfully authenticated with Google");
        window.location.href = "/dashboard";
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Authentication failed");

        router.push("/auth/login");
      }
    };

    effectRan.current = true;
    loginWithGoogle();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loading text="Authenticating..." className="flex-col gap-2" />
    </div>
  );
}
