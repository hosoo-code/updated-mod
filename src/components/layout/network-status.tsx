"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-2 border-t border-amber-500/25 bg-amber-50 px-4 py-3 text-center text-xs font-medium text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-100 safe-pb">
      <WifiOff className="h-4 w-4 shrink-0" />
      Интернэт холболт тасарсан байна. Холболт сэргэтэл илгээх болон хадгалах үйлдэл боломжгүй.
    </div>
  );
}
