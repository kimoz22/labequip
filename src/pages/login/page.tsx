import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";

export default function LoginPage() {
  const { isAuthenticated, signin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: Location })?.from?.pathname || "/";

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await signin({ email: loginEmail, password: loginPassword });
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to sign in.");
      toast.error(message || "Failed to sign in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
          <FlaskConical className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-semibold">Welcome to LabStock</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your account.</p>

        <div className="mt-8 space-y-4">
          <form className="space-y-4 text-left" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
