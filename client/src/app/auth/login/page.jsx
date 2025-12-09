"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { authApi } from "../../../api/authApi";
import { AuthErrorCodes } from "@/config/errorCodes/authErrorCodes";
import { authInputSchema } from "@/schemas/auth.schema";
import { Card } from "@/components/ui/Card";
import GoogleButton from "@/components/ui/GoogleButton";

export default function Login() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authInputSchema.loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      await authApi.login(data);
      toast.success("Login successful");
      window.location.href = "/";
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
      if (err.response?.data.errorCode === AuthErrorCodes.USER_NOT_VERIFIED) {
        router.push(`/auth/verify-email?email=${data.email}`);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col space-y-1 text-center mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Email"
              {...register("email")}
              error={errors.email}
              helperText={errors.email?.message}
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              {...register("password")}
              error={errors.password}
              helperText={errors.password?.message}
            />
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign In
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <GoogleButton text="Sign in with Google" />

          <p className="px-8 text-center text-sm text-muted-foreground mt-4">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
