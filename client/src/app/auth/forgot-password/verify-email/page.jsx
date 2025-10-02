"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { AuthErrorCodes } from "@/config/errorCodes/authErrorCodes";
import { authApi } from "../../api/authApi";
import OtpInput from "@/components/ui/OtpInput";
import { Card } from "@/components/ui/Card";

export default function OtpVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    let countdown;
    if (timer > 0) {
      countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [timer]);

  const sendOtp = async (resend) => {
    try {
      if (resend) setIsResending(true);
      await authApi.sendOtp({
        to: email,
        template: "auth/otp",
        notificationType: "email",
      });
      toast.success("OTP sent to your email.");
      setTimer(60); // Reset timer after resend
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP.");
      if (
        err.response?.data.errorCode === AuthErrorCodes.MAX_OTP_ATTEMPTS_REACHED
      ) {
        setLimitReached(true);
        setTimer(0); // Stop timer if limit reached
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authApi.verifyOtpToResetPassword({ to: email, otp });
      toast.success("OTP verified");
      router.push(`/auth/reset-password/?token=${res.data.token}`); // Redirect to reset password page
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
      setOtp(""); // Clear OTP input after verification
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black p-4">
      <Card className="py-12 px-8">
        <form
          onSubmit={handleVerify}
          className="space-y-4 flex items-center flex-col justify-center"
        >
          <h1 className="text-2xl font-bold text-zinc-800 text-center">
            Verify Your Email
          </h1>
          <p className="text-sm text-gray-500 text-center mb-4">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-medium">{email}</span>
          </p>

          <OtpInput digits={6} value={otp} onChange={setOtp} />

          <Button disabled={loading} type="submit" className="w-full">
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          <Button
            type="button"
            onClick={() => sendOtp(true)}
            disabled={timer > 0 || isResending || loading || limitReached}
            variant="outline"
            className="w-full"
          >
            {isResending
              ? "Resending..."
              : timer > 0
              ? `Resend OTP in ${timer}s`
              : "Resend OTP"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
