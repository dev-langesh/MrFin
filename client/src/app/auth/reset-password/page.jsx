"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { authApi } from "../../../api/authApi";
import { authInputSchema } from "@/schemas/auth.schema";
import { Card } from "@/components/ui/Card";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authInputSchema.resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    try {
      await authApi.resetPassword({ otpToken: token, password: data.password });
      toast.success("Password reset successful.");
      router.push("/auth/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="New Password"
              {...register("password")}
              error={errors.password}
              helperText={errors.password?.message}
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Confirm Password"
              {...register("confirmPassword")}
              error={errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Reset Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
