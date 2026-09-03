import { useEffect } from "react";

import { startSupabaseSessionLifecycle } from "../../data/cloud/supabase";
import { initializeAnalytics, trackAnalyticsEvent } from "./service";

export function AnalyticsBootstrap() {
  useEffect(() => {
    const stopSessionLifecycle = startSupabaseSessionLifecycle();
    void initializeAnalytics().then((enabled) => {
      if (enabled) void trackAnalyticsEvent("app_open");
    });
    return stopSessionLifecycle;
  }, []);

  return null;
}
