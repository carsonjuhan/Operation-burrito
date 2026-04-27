import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/contexts/StoreContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Sidebar } from "@/components/Sidebar";
import { ToastContainer } from "@/components/Toast";
import { AuthGate } from "@/components/AuthGate";
import { KeyboardShortcutProvider } from "@/components/KeyboardShortcutProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SyncQueueManager } from "@/components/SyncQueueManager";
import { InstallBanner } from "@/components/InstallBanner";
import { ReminderScheduler } from "@/components/ReminderScheduler";
import { I18nProvider } from "@/contexts/I18nContext";

const basePath = process.env.NODE_ENV === "production" ? "/Operation-burrito" : "";

export const viewport: Viewport = {
  themeColor: "#4d6b52",
};

export const metadata: Metadata = {
  title: "Operation Burrito",
  description: "Baby preparation tracker",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Operation Burrito",
  },
  icons: {
    apple: `${basePath}/icons/icon-180.svg`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AuthGate>
          <I18nProvider>
          <ToastProvider>
            <StoreProvider>
              {/* Skip-to-content link for keyboard/screen-reader users */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-sage-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
              >
                Skip to main content
              </a>
              <div className="flex min-h-screen flex-col">
                <OfflineBanner />
                <div className="flex flex-1">
                  <Sidebar />
                  {/* On mobile: full width. On desktop: offset by sidebar width */}
                  <main id="main-content" className="flex-1 w-full md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
                    {children}
                  </main>
                </div>
              </div>
              <ToastContainer />
              <KeyboardShortcutProvider />
              <ServiceWorkerRegistration />
              <SyncQueueManager />
              <InstallBanner />
              <ReminderScheduler />
            </StoreProvider>
          </ToastProvider>
          </I18nProvider>
        </AuthGate>
      </body>
    </html>
  );
}
