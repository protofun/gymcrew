import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { ApiError, isApiConfigured } from "../../lib/api";

export default function SignInForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password, needsTotp ? code : undefined);
      if (result.requiresTotp) {
        setNeedsTotp(true);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Check VITE_API_BASE_URL and your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Admin Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {needsTotp ? "Enter the 6-digit code from your authenticator app." : "GymCrew admin panel — authorized staff only."}
            </p>
            {!isApiConfigured && (
              <p className="mt-3 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-500 dark:bg-error-500/10">
                VITE_API_BASE_URL is not set — create admin/.env.local (see admin/.env.example) and rebuild.
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {needsTotp ? (
                <div>
                  <Label>
                    Authenticator Code <span className="text-error-500">*</span>
                  </Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
                </div>
              ) : (
                <>
                  <div>
                    <Label>
                      Email <span className="text-error-500">*</span>
                    </Label>
                    <Input type="email" placeholder="you@gymcrew.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>
                      Password <span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      >
                        {showPassword ? (
                          <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {error && <p className="text-sm text-error-500">{error}</p>}
              <div>
                <Button className="w-full" size="sm" disabled={submitting}>
                  {submitting ? "Signing in…" : needsTotp ? "Verify" : "Sign in"}
                </Button>
              </div>
              {needsTotp && (
                <button
                  type="button"
                  onClick={() => {
                    setNeedsTotp(false);
                    setCode("");
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:underline dark:text-gray-400"
                >
                  Back
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
