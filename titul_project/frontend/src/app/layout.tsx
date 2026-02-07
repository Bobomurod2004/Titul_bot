import type { Metadata } from "next";
import "./globals.css";

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
                    <main className="min-h-screen">
                         {children}
                    </main>
               </body>
          </html>
     );
}
