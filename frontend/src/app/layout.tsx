import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartStore POS",
  description: "Inventory & Cashier Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body
        className={`${poppins.className} min-h-full flex flex-col bg-[#F0F9FF] text-slate-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
