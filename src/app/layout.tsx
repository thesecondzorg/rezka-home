import "@/app/globals.css";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "RezkaStream",
  description: "A modern wrapper for hdrezka.name",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased text-white selection:bg-red-500/30">
        <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tighter">
                Rezka<span className="text-red-500">Stream</span>
              </span>
            </a>
            {/* The search component will be added here or inside the page */}
            <div className="text-sm font-medium text-gray-400">
              Next.js Wrapper
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
