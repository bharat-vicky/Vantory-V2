import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth/authorization";
import {DashboardLayoutShell} from "@/components/shell/dashboard-layout-shell";
export default async function ReviewLayout({children}:{children:React.ReactNode}){const user=await getCurrentUser();if(!user)redirect("/login");if(!["INSTITUTE_ADMIN","SUPER_ADMIN"].includes(user.role))redirect("/dashboard");return <DashboardLayoutShell>{children}</DashboardLayoutShell>;}
