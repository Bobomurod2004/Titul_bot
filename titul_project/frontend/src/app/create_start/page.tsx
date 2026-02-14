"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CreateStartRedirectContent() {
     const router = useRouter();
     const searchParams = useSearchParams();

     useEffect(() => {
          const userId = searchParams.get("user_id") || searchParams.get("id") || "0";
          const name = searchParams.get("name") || "";
          const editId = searchParams.get("editId") || "";

          let target = `/create_start/${userId}`;
          const params = new URLSearchParams();
          if (name) params.set("name", name);
          if (editId) params.set("editId", editId);

          if (params.toString()) {
               target += `?${params.toString()}`;
          }

          router.replace(target);
     }, [router, searchParams]);

     return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
          </div>
     );
}

export default function CreateStartRedirect() {
     return (
          <Suspense fallback={
               <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
               </div>
          }>
               <CreateStartRedirectContent />
          </Suspense>
     );
}
