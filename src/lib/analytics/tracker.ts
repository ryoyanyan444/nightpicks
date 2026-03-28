"use client";

import { nanoid } from "nanoid";

const SESSION_KEY = "np_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = nanoid();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    worker_id: params.get("wid") || "",
  };
}

export async function trackPageView(articleId?: string) {
  if (typeof window === "undefined") return;

  const utm = getUtmParams();

  const data = {
    article_id: articleId || null,
    path: window.location.pathname,
    referrer: document.referrer || null,
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    worker_id: utm.worker_id || null,
    user_agent: navigator.userAgent,
    device_type: getDeviceType(),
    session_id: getSessionId(),
  };

  // Use Beacon API for reliable tracking
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/track",
      new Blob([JSON.stringify(data)], { type: "application/json" })
    );
  } else {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackScrollDepth(articleId: string) {
  if (typeof window === "undefined") return;

  let maxDepth = 0;

  const observer = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const depth = Math.min(Math.round((scrollTop / docHeight) * 100) / 100, 1);
    maxDepth = Math.max(maxDepth, depth);
  };

  window.addEventListener("scroll", observer, { passive: true });

  // Send on page leave
  const sendDepth = () => {
    if (maxDepth > 0) {
      const data = {
        article_id: articleId,
        scroll_depth: maxDepth,
        session_id: getSessionId(),
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track?type=scroll",
          new Blob([JSON.stringify(data)], { type: "application/json" })
        );
      }
    }
  };

  window.addEventListener("beforeunload", sendDepth);

  return () => {
    window.removeEventListener("scroll", observer);
    window.removeEventListener("beforeunload", sendDepth);
  };
}

export function trackShare(articleId: string, platform: string) {
  fetch("/api/track?type=share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article_id: articleId, platform }),
    keepalive: true,
  }).catch(() => {});
}
