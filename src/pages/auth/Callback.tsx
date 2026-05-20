import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { XCircle } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const navigateHome = () => navigate("/", { replace: true });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <Empty>
        <EmptyHeader>
          <EmptyContent>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
            <EmptyTitle>Authentication callback not used</EmptyTitle>
            <EmptyDescription>
              This app is no longer using external Hercules authentication.
            </EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
      <Button className="mt-4 cursor-pointer" onClick={navigateHome}>
        Return home
      </Button>
    </div>
  );
}
