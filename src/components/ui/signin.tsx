import { forwardRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type VariantProps } from "class-variance-authority";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

export interface SignInButtonProps
  extends
    Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showIcon?: boolean;
  signInText?: string;
  signOutText?: string;
  loadingText?: string;
  asChild?: boolean;
}

export const SignInButton = forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      onClick,
      disabled,
      showIcon = true,
      signInText = "Sign In",
      signOutText = "Sign Out",
      loadingText,
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const navigate = useNavigate();
    const { isAuthenticated, signout, loading, user } = useAuth();

    useEffect(() => {
      if (!isAuthenticated && user === null) {
        return;
      }
    }, [isAuthenticated, user]);

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (isAuthenticated) {
          await signout();
          navigate("/login", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      },
      [isAuthenticated, navigate, onClick, signout],
    );

    const isDisabled = disabled || loading;
    const defaultLoadingText = isAuthenticated
      ? "Signing Out..."
      : "Redirecting...";
    const currentLoadingText = loadingText || defaultLoadingText;

    const buttonText = isDisabled
      ? currentLoadingText
      : isAuthenticated
        ? signOutText
        : signInText;

    const icon = isDisabled ? (
      <Loader2 className="size-4 animate-spin" />
    ) : isAuthenticated ? (
      <LogOut className="size-4" />
    ) : (
      <LogIn className="size-4" />
    );

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
        aria-label={
          isAuthenticated
            ? "Sign out of your account"
            : "Sign in to your account"
        }
        {...props}
      >
        {showIcon && icon}
        {buttonText}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
