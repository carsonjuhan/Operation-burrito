import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/contexts/StoreContext";
import { Sidebar } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Operation Burrito",
  description: "Baby preparation tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <StoreProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              {/* On mobile: full width. On desktop: offset by sidebar width */}
              <main className="flex-1 w-full md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
                {children}
              </main>
            </div>
          </StoreProvider>
        </AuthGate>
      </body>
    </html>
  );
}
