"use client";

interface PosOfflineSyncBannerProps {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncStatusMsg: string;
  onSyncNow: () => void;
}

export default function PosOfflineSyncBanner({
  isOnline,
  pendingSyncCount,
  isSyncing,
  syncStatusMsg,
  onSyncNow,
}: PosOfflineSyncBannerProps) {
  if (isOnline && pendingSyncCount === 0 && !syncStatusMsg) {
    return null;
  }

  return (
    <div
      className={`rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs transition-colors ${
        !isOnline
          ? "bg-amber-500 text-white border border-amber-600"
          : pendingSyncCount > 0
            ? "bg-blue-600 text-white border border-blue-700"
            : "bg-emerald-600 text-white border border-emerald-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-pulse"></span>
        <span>
          {!isOnline
            ? `⚠️ OFFLINE MODE: Network disconnected. Transactions are safely queued locally (${pendingSyncCount} pending).`
            : pendingSyncCount > 0
              ? `🔄 Back Online: ${pendingSyncCount} offline sale(s) waiting to sync to server.`
              : syncStatusMsg || "All sales synced with cloud."}
        </span>
      </div>

      {isOnline && pendingSyncCount > 0 && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-bold text-white transition-colors disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync Now ⟳"}
        </button>
      )}
    </div>
  );
}
