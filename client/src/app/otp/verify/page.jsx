"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { otpApi } from "../../../api/otpApi";
import { Card } from "@/components/ui/Card";
import OtpInput from "@/components/ui/OtpInput";
import { authApi } from "@/api/authApi";

export default function OtpVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const module = searchParams.get("module"); // verify_user_email | reset_password

  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const isExecuted = useRef(false);

  useEffect(() => {
    if (!email || !module) {
      toast.error("Invalid verification request.");
      router.push("/auth/login");
      return;
    }

    if (isExecuted.current) return;
    isExecuted.current = true;

    if (module === "verify_user_email") {
      sendOtpAndToast();
    }
  }, [email, module]);

  useEffect(() => {
    let countdown;
    if (timer > 0) {
      countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [timer]);

  const sendOtpAndToast = async () => {
    await sendOtp(false);
    toast.success("OTP sent to your email.");
  };

  const sendOtp = async (resend) => {
    try {
      if (resend) setIsResending(true);
      await otpApi.sendOtp({
        to: email,
        template: "auth/otp",
        notificationType: "email",
      });
      if (resend) toast.success("OTP sent to your email.");
      setTimer(60);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
      if (
        err.response?.data.errorCode === AuthErrorCodes.MAX_OTP_ATTEMPTS_REACHED
      ) {
        setLimitReached(true);
        setTimer(0);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // 1. Verify OTP generically
      const res = await otpApi.verifyOtp({ to: email, otp });
      const otpToken = res.data.token;

      // 2. Perform module specific action
      if (module === "verify_user_email") {
        await authApi.verifyEmail({ otpToken });
        toast.success("Email verified successfully");
        window.location.href = "/dashboard";
      } else if (module === "reset_password") {
        router.push(`/auth/reset-password?token=${otpToken}`);
      } else {
        toast.error("Unknown module");
      }
    } catch (err) {
    } finally {
      setLoading(false);
      setOtp("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col space-y-1 text-center ">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verification
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to
          </p>
          <p className="text-sm font-medium text-primary">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex justify-center py-4">
            <OtpInput digits={6} value={otp} onChange={setOtp} />
          </div>

          <Button
            disabled={loading}
            loading={loading}
            type="submit"
            className="w-full"
          >
            Verify Code
          </Button>

          <Button
            type="button"
            onClick={() => sendOtp(true)}
            disabled={timer > 0 || isResending || loading || limitReached}
            loading={isResending}
            variant="ghost"
            className="w-full text-xs"
          >
            {timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
