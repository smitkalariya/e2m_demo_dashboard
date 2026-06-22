"use client";

import { IS_MOCK_MODE } from "@/lib/mock/config";
import { resetMockData } from "@/lib/mock/store";

export function DemoModeBanner() {
  if (!IS_MOCK_MODE) return null;

  const handleReset = () => {
    resetMockData();
    window.location.reload();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      <span>
        <strong>Demo mode</strong> — running on mock data, no backend required. Any email/password signs you in.
      </span>
      <button
        type="button"
        onClick={handleReset}
        className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-50"
      >
        Reset demo data
      </button>
    </div>
  );
}
