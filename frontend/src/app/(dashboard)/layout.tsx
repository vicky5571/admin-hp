"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
  badgeType?: "success" | "neutral" | "accent";
  keywords: string[];
  icon: (props: { className?: string }) => React.ReactNode;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    id: "main",
    title: "Core Operations",
    items: [
      {
        href: "/",
        label: "Dashboard",
        keywords: ["overview", "analytics", "home", "stats", "metrics"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
      },
      {
        href: "/pos",
        label: "POS Terminal",
        badge: "Live",
        badgeType: "success",
        keywords: [
          "checkout",
          "cashier",
          "register",
          "terminal",
          "sell",
          "billing",
        ],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        href: "/warranty",
        label: "Warranty Lookup",
        badge: "Digital",
        badgeType: "accent",
        keywords: [
          "warranty",
          "claim",
          "imei",
          "serial",
          "guarantee",
          "service",
          "status",
        ],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory & Purchasing",
    items: [
      {
        href: "/products",
        label: "Products Catalog",
        keywords: ["catalog", "items", "sku", "pricing", "barcodes"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        ),
      },
      {
        href: "/inventory",
        label: "Stock Levels",
        keywords: [
          "warehouse",
          "adjustments",
          "quantity",
          "stocktake",
          "on hand",
        ],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
        ),
      },
      {
        href: "/purchase-orders",
        label: "Purchase Orders",
        keywords: ["procurement", "suppliers", "po", "orders", "vendors"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        href: "/goods-receipts",
        label: "Goods Receipts",
        keywords: ["receiving", "inbound", "grn", "warehouse delivery"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"
            />
          </svg>
        ),
      },
      {
        href: "/imei",
        label: "IMEI & Serials",
        badge: "Serial",
        badgeType: "neutral",
        keywords: ["phones", "serials", "tracking", "imei", "devices"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    id: "finance",
    title: "Sales & Finance",
    items: [
      {
        href: "/sales",
        label: "Sales History",
        keywords: ["transactions", "invoices", "receipts", "revenue", "orders"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        href: "/shifts",
        label: "Cashier Shifts",
        keywords: ["drawers", "registers", "reconciliation", "closing", "cash"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        href: "/returns",
        label: "Returns & Refunds",
        keywords: ["exchanges", "refunds", "rma", "credit notes"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M16 15v-1a4 4 0 00-4-4H4m0 0l3-3m-3 3l3 3m5 4v1a4 4 0 004 4h8m0 0l-3-3m3 3l-3 3"
            />
          </svg>
        ),
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      {
        href: "/reports",
        label: "Analytics & Reports",
        keywords: ["profit", "trends", "financials", "export", "insights"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
        ),
      },
      {
        href: "/users",
        label: "Users & Roles",
        keywords: ["team", "employees", "permissions", "access control"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        href: "/audit-logs",
        label: "Audit Logs",
        keywords: ["history", "activity", "security", "changes", "events"],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        href: "/settings",
        label: "Store Settings",
        keywords: [
          "configuration",
          "store info",
          "tax",
          "printers",
          "preferences",
        ],
        icon: ({ className }) => (
          <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        ),
      },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("smartstore_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smartstore_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("sidebar-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return navigationGroups;
    const q = searchQuery.toLowerCase().trim();
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const currentPageInfo = useMemo(() => {
    for (const group of navigationGroups) {
      for (const item of group.items) {
        if (
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        ) {
          return { group: group.title, item: item.label };
        }
      }
    }
    return { group: "Operations", item: "Dashboard" };
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F9FF]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-sky-400/20 blur-xs animate-pulse"></div>
            <div className="h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-xs font-medium tracking-wide text-slate-600">
            Initializing SmartStore ERP...
          </span>
        </div>
      </div>
    );
  }

  const userInitials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const roleTheme =
    {
      ADMIN: "bg-sky-50 text-sky-700 border-sky-200",
      MANAGER: "bg-amber-50 text-amber-700 border-amber-200/90",
      CASHIER: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
    }[user.role.toUpperCase()] || "bg-sky-50 text-sky-700 border-sky-200";

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-900 font-sans antialiased flex">
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white text-slate-700 border-r border-sky-100 transition-all duration-300 ease-in-out lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-[76px]" : "lg:w-[268px]"} w-[268px] shadow-xl lg:shadow-none shrink-0 select-none`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sky-100 bg-white">
          <Link
            href="/"
            className="flex items-center gap-3 group overflow-hidden focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg outline-none"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md shadow-sky-400/25 transition-transform duration-200 group-hover:scale-105">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"></div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-sky-500 transition-colors">
                    SmartStore
                  </span>
                  <span className="rounded bg-sky-50 px-1 py-0.2 text-[9px] font-bold tracking-wider text-sky-600 border border-sky-200">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400 truncate">
                  Retail & Inventory ERP
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={handleToggleCollapse}
            aria-label={
              isCollapsed
                ? "Expand sidebar navigation"
                : "Collapse sidebar navigation"
            }
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 outline-none"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!isCollapsed ? (
          <div className="px-3 pt-3.5 pb-1">
            <div className="flex items-center justify-between rounded-xl bg-sky-50/70 px-3 py-2 border border-sky-100 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-sky-500 border border-sky-200/70 shadow-2xs">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-900 truncate">
                    Central Branch #01
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-sky-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>POS Terminal Online</span>
                  </div>
                </div>
              </div>
              <div className="flex h-5 items-center px-1.5 rounded text-[9px] font-bold bg-white text-sky-600 border border-sky-200 shadow-2xs">
                HQ
              </div>
            </div>
          </div>
        ) : (
          <div className="px-2 pt-3 pb-1 flex justify-center">
            <div
              className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100 text-sky-500"
              title="Central Branch #01 (Online)"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        )}

        {!isCollapsed ? (
          <div className="px-3 py-2">
            <div className="relative">
              <input
                id="sidebar-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick jump..."
                className="w-full h-8.5 rounded-lg bg-sky-50/40 hover:bg-sky-50/80 focus:bg-white pl-8 pr-12 text-xs text-slate-900 placeholder-slate-400 border border-sky-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/25 outline-none transition-all"
              />
              <svg
                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-sky-500"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              ) : (
                <span className="absolute right-2 top-2 px-1 rounded text-[9px] font-mono text-slate-400 bg-white border border-sky-100 pointer-events-none">
                  ⌘K
                </span>
              )}
            </div>
          </div>
        ) : null}

        <nav
          className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5 scrollbar-thin scrollbar-thumb-sky-100"
          aria-label="Sidebar Navigation"
        >
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              <p>No navigation match for</p>
              <p className="font-semibold text-slate-700 mt-1">
                &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-[11px] text-sky-500 hover:underline font-medium"
              >
                Clear filter
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    {group.title}
                  </div>
                )}
                {isCollapsed && (
                  <div
                    className="h-px bg-sky-100/60 my-2 mx-1"
                    aria-hidden="true"
                  />
                )}

                {group.items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <div key={item.href} className="relative group">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-150 relative focus-visible:ring-2 focus-visible:ring-sky-400 outline-none ${
                          active
                            ? "bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold shadow-md shadow-sky-400/25"
                            : "text-slate-600 hover:bg-sky-50 hover:text-sky-600"
                        } ${isCollapsed ? "justify-center px-0 h-10 w-full" : ""}`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            active
                              ? "text-white"
                              : "text-slate-400 group-hover:text-sky-500"
                          }`}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                        </span>

                        {!isCollapsed && (
                          <div className="flex flex-1 items-center justify-between min-w-0">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide border uppercase ${
                                  active
                                    ? "bg-white/25 text-white border-white/30"
                                    : item.badgeType === "success"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-sky-50 text-sky-600 border border-sky-200"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>

                      {isCollapsed && (
                        <div className="fixed left-[84px] z-50 hidden rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl border border-slate-800 group-hover:flex items-center gap-2 whitespace-nowrap pointer-events-none">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="rounded bg-sky-500/40 px-1 py-0.2 text-[9px] text-sky-200 font-semibold uppercase">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        <div className="p-3 border-t border-sky-100 bg-sky-50/40">
          <div
            className={`flex items-center gap-2.5 rounded-xl p-1.5 transition-colors ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-xs font-bold text-white shadow-xs">
                {userInitials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"></span>
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {user.fullName || user.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${roleTheme}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <Link
                  href="/settings"
                  title="Settings"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-sky-100/70 hover:text-sky-600 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 outline-none"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  aria-label="Sign out of system"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F0F9FF]">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-600 lg:hidden transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 outline-none"
              aria-label="Open mobile navigation menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-400 hidden sm:inline">
                {currentPageInfo.group}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900">
                {currentPageInfo.item}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {pathname !== "/pos" && (
              <Link
                href="/pos"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-400/25 transition-all hover:scale-[1.02]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>POS Register</span>
              </Link>
            )}

            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200/80">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="hidden md:inline">Store Active</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
