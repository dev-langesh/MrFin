"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { authApi } from "../../../api/authApi";
import { authInputSchema } from "@/schemas/auth.schema";
import { Card } from "@/components/ui/Card";
import GoogleButton from "@/components/ui/GoogleButton";

export default function Register() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authInputSchema.registerSchema),
  });

  const onSubmit = async (formData) => {
    try {
      await authApi.register(formData);
      toast.success("Registration successful");
      router.push(`/auth/verify-email?email=${formData.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col space-y-1 text-center mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to create your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Full Name"
              {...register("name")}
              error={errors.name}
              helperText={errors.name?.message}
            />
          </div>

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
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Create account
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

          <GoogleButton text="Sign up with Google" />

          <p className="px-8 text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
