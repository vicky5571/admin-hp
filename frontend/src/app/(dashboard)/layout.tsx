"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/pos", label: "POS / Checkout", icon: "🛒" },
  { href: "/products", label: "Products", icon: "📦" },
  { href: "/inventory", label: "Inventory", icon: "🏭" },
  { href: "/sales", label: "Sales", icon: "💰" },
  { href: "/returns", label: "Returns", icon: "↩️" },
  { href: "/reports", label: "Reports", icon: "📈" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 text-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white">SmartStore</h1>
          <p className="text-xs text-gray-400">POS & Inventory</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 px-3 py-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white">{user.fullName}</p>
            <p className="text-xs text-gray-400">
              {user.role}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-red-600 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
