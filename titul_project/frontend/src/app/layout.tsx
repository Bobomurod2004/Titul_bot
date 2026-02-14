import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
     title: "Titul Test Platformasi",
     description: "Senior darajadagi professional DTM uslubidagi test yaratish va topshirish platformasi",
};

export default function RootLayout({
     children,
}: Readonly<{
     children: React.ReactNode;
}>) {
     return (
          <html lang="uz">
               <body className="antialiased">
                    <Toaster position="top-center" />
                    <main className="min-h-screen">
                         {children}
                    </main>
               </body>
          </html>
     );
}
