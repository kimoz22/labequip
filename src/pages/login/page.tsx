import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export default function LoginPage() {
  const { isAuthenticated, signin, signup, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sendPasswordReset = useMutation(api.users.sendPasswordReset);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await signup({ name: signupName, email: signupEmail, password: signupPassword });
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to sign up.");
      toast.error(message || "Failed to sign up.");
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      const result = await sendPasswordReset({ email: resetEmail.trim() });
      toast.success(result.message);
      setForgotPasswordOpen(false);
      setResetEmail("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || "Failed to send password reset");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-10 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
          <FlaskConical className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-semibold">Welcome to LabStock</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your account or create a new one.
        </p>

        <Tabs defaultValue="login" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
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
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form className="space-y-4 text-left" onSubmit={handleSignup}>
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  required
                />
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>

    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you your password.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForgotPasswordOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleForgotPassword} disabled={resetLoading}>
            {resetLoading ? "Sending..." : "Send Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
