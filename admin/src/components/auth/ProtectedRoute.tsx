import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}
