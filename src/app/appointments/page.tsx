"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Appointments now live as a sub-tab of the Planner (/notes). Keep this route as
// a redirect so existing links and bookmarks still land in the right place.
export default function AppointmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/notes?tab=appointments");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-stone-400 text-sm">Redirecting…</div>
    </div>
  );
}
