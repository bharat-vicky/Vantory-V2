import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { DashboardLayoutShell } from "@/components/shell/dashboard-layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
