"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { authApi } from "../../../api/authApi";
import { authInputSchema } from "@/schemas/auth.schema";
import { Card } from "@/components/ui/Card";
import GoogleButton from "@/components/ui/GoogleButton";
import { countries } from "@/constants/countries";
import { getUserCountryCode } from "@/lib/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(authInputSchema.registerSchema),
  });

  const selectedCountry = watch("country");

  useEffect(() => {
    async function detectLocation() {
      const code = await getUserCountryCode();
      if (code) {
        // Verify checks if the detected code exists in our supported list
        const supported = countries.find((c) => c.code === code);
        if (supported) {
          setValue("country", code);
        }
      }
    }
    detectLocation();
  }, [setValue]);

  useEffect(() => {
    if (selectedCountry) {
      const countryData = countries.find((c) => c.code === selectedCountry);
      if (countryData) {
        setValue("currency", countryData.currency);
      }
    }
  }, [selectedCountry, setValue]);

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
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={
                      "w-full " + (errors.country && "border-destructive")
                    }
                  >
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="mr-2">{country.flag}</span>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.country && (
              <p className="text-xs text-destructive mt-[2px]">
                {errors.country.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              {...register("password")}
              error={errors.password}
              helperText={errors.password?.message}
              icon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-foreground focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              iconPlacement="right"
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
