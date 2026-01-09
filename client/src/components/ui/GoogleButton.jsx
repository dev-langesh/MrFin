import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function GoogleButton({ text = "Sign in with Google" }) {
  const handleGoogleLogin = async () => {
    const { generateCodeVerifier, generateCodeChallenge } = await import(
      "@/lib/pkce"
    );

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // store codeVerifier in sessionStorage
    sessionStorage.setItem("google_code_verifier", codeVerifier);

    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri:
        process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/auth/callback",
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    };

    const qs = new URLSearchParams(options);
    window.location.href = `${rootUrl}?${qs.toString()}`;
  };

  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-4"
      onClick={handleGoogleLogin}
      type="button"
    >
      <Image src="/auth/google.png" width={15} height={15} alt="Google" />
      <span>{text}</span>
    </Button>
  );
}
