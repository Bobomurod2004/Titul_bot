"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function MyTestsRedirectContent() {
     const router = useRouter();
     const searchParams = useSearchParams();

     useEffect(() => {
          const userId = searchParams.get("user_id") || searchParams.get("id") || "0";
          router.replace(`/my_tests/${userId}`);
     }, [router, searchParams]);

     return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
          </div>
     );
}

export default function MyTestsRedirect() {
     return (
          <Suspense fallback={
               <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
               </div>
          }>
               <MyTestsRedirectContent />
          </Suspense>
     );
}
