interface RequireAuthProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

// This component now just passes through children without any checks
export const RequireAuth = ({ children }: RequireAuthProps) => {
  return <>{children}</>;
};