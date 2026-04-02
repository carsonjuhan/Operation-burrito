import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/contexts/StoreContext";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Operation Burrito",
  description: "Baby preparation tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">{children}</main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
