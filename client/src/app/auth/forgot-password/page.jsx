"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { otpApi } from "../../../api/otpApi";
import { AuthErrorCodes } from "@/config/errorCodes/authErrorCodes";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      await otpApi.sendOtp({
        to: email,
        template: "auth/otp",
        notificationType: "email",
      });

      toast.success("OTP sent to your email.");
      router.push(`/otp/verify?module=reset_password&email=${email}`);
    } catch (err) {
      const errorCode = err.response?.data?.errorCode;
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col space-y-2 text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a verification code
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Send Code
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
