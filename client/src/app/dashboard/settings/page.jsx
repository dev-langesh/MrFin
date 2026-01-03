"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { Mail, Shield, User } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { userApi } from "@/api/userApi";
import { otpApi } from "@/api/otpApi";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { countries } from "@/constants/countries";
import { cn } from "@/lib/utils";

import { userInputSchema } from "@/schemas/user.schema";

export default function SettingsPage() {
  const { auth, updateAuthUser } = useAuth();
  const user = auth.user;
  const router = useRouter();

  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(userInputSchema.profileSchema),
    defaultValues: {
      name: "",
      country: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        country: user.country || "",
      });
      setLoading(false);
    }
  }, [user, reset]);

  const onUpdateProfile = async (data) => {
    try {
      const updatedUser = await userApi.updateProfile(data);
      updateAuthUser(updatedUser);
      toast.success("Profile updated successfully");
      reset({
        name: updatedUser.name,
        country: updatedUser.country,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsResetting(true);
      await otpApi.sendOtp({
        to: user.email,
        template: "auth/otp",
        notificationType: "email",
      });
      toast.success("OTP sent to your email");
      router.push(`/otp/verify?module=reset_password&email=${user.email}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate password reset");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your account profile and security settings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Card */}
        <Card className="flex flex-col h-fit w-full md:w-[450px] shadow-sm rounded-sm border-gray-200/60 px-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
              <User className="w-4 h-4 text-blue-600" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 ">
            {loading ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full rounded-sm" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-9 w-full rounded-sm" />
                </div>
                <Skeleton className="h-9 w-full md:w-[150px] md:mx-auto rounded-sm mt-2" />
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onUpdateProfile)}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <Input
                    label="Full Name"
                    placeholder="Your Name"
                    {...register("name")}
                    error={errors.name}
                    helperText={errors.name?.message}
                    className="h-9 rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Country
                  </label>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger
                          className={cn(
                            errors.country && "border-destructive",
                            "w-full h-9 rounded-sm"
                          )}
                        >
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="mr-2 text-lg">
                                {country.flag}
                              </span>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.country && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.country.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full mt-1"
                >
                  Save Changes
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="flex flex-col w-full md:w-[480px] shadow-sm rounded-sm border-gray-200/60">
          <CardHeader className="">
            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
              <Shield className="w-4 h-4 text-green-600" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {loading ? (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full rounded-sm" />
                  <Skeleton className="h-3 w-3/4 mt-1.5" />
                </div>
                <div className="pt-6 border-t mt-auto">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <div className="space-y-1 mb-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-9 w-full sm:w-[200px] rounded-sm" />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium leading-none">
                    Email Address
                  </label>
                  <div className="flex items-center h-9 w-full rounded-sm border border-input bg-zinc-50/50 px-3 py-1 text-sm shadow-sm transition-colors">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-gray-600 font-medium">
                      {user?.email || ""}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1.5">
                    Email address cannot be changed securely at this time.
                  </p>
                </div>

                <div className="pt-6 border-t mt-auto">
                  <h3 className="text-sm font-medium mb-1.5">Password</h3>
                  <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                    Securely reset your password by verifying your email
                    address. We'll send you a one-time code.
                  </p>

                  <Button
                    variant="outline"
                    onClick={handleResetPassword}
                    loading={isResetting}
                    className="w-full sm:w-[200px] font-medium rounded-sm h-9"
                  >
                    Reset Password
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
