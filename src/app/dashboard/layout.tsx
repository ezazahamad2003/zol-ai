import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
