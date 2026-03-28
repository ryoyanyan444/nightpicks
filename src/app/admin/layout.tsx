import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/Sidebar";

export const metadata = {
  title: "管理画面 | NIGHTPICKS",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page doesn't need the admin layout
  // This is handled by middleware, but double-check here
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <AdminSidebar userEmail={user.email || ""} />
      <main className="flex-1 ml-0 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
