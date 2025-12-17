"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "../../../api/authApi";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import Loading from "@/components/ui/Loading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { countries } from "@/constants/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { getUserCountryCode } from "@/lib/location";
import { cn } from "@/lib/utils";

const countrySchema = z.object({
  country: z.string({ required_error: "Country is required" }),
  currency: z.string({ required_error: "Currency is required" }),
});

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const effectRan = useRef(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(countrySchema),
  });

  const selectedCountry = watch("country");

  useEffect(() => {
    async function detectLocation() {
      const code = await getUserCountryCode();
      if (code && isNewUser) {
        // Only auto-detect if in new user flow
        const supported = countries.find((c) => c.code === code);
        if (supported) {
          setValue("country", code);
        }
      }
    }
    if (isNewUser) {
      detectLocation();
    }
  }, [isNewUser, setValue]);

  useEffect(() => {
    if (selectedCountry) {
      const countryData = countries.find((c) => c.code === selectedCountry);
      if (countryData) {
        setValue("currency", countryData.currency);
      }
    }
  }, [selectedCountry, setValue]);

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
        const res = await authApi.googleLogin({ code });

        if (res.data.isNew) {
          setIsNewUser(true);
          setRegistrationToken(res.data.registrationToken);
          setGoogleUser(res.data.user);
          return;
        }

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

  const onCompleteRegistration = async (data) => {
    try {
      await authApi.completeGoogleLogin({
        registrationToken,
        country: data.country,
        currency: data.currency,
      });
      toast.success("Registration complete!");
      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to complete registration"
      );
    }
  };

  if (isNewUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Welcome {googleUser?.name}!</CardTitle>
            <CardDescription>
              Please select your country to complete registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onCompleteRegistration)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className={cn(
                          errors.country && "border-destructive",
                          "w-full"
                        )}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Completing Setup..." : "Complete Setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loading text="Authenticating..." className="flex-col gap-2" />
    </div>
  );
}
