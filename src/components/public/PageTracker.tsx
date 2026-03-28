"use client";

import { useEffect } from "react";
import { trackPageView, trackScrollDepth } from "@/lib/analytics/tracker";

interface PageTrackerProps {
  articleId?: string;
}

export default function PageTracker({ articleId }: PageTrackerProps) {
  useEffect(() => {
    trackPageView(articleId);

    let cleanup: (() => void) | undefined;
    if (articleId) {
      cleanup = trackScrollDepth(articleId);
    }

    return () => {
      cleanup?.();
    };
  }, [articleId]);

  return null;
}
