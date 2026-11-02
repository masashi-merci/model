import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminSessionState } from '../lib/adminSession';

export default function AdminGuard({ auth, children }: { auth: AdminSessionState; children: ReactNode }) {
  // Keep the same child mounted while an unchanged, verified token is rechecked.
  if (auth.isAdmin) return children;
  if (auth.checking) return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Verifying administrator access">
      <div className="w-12 h-12 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return <Navigate to="/admin/login" replace />;
}
