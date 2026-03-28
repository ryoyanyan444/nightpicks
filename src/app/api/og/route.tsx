import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "NIGHTPICKS";
  const category = searchParams.get("category") || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px",
          background: "linear-gradient(135deg, #1a0a3e 0%, #0a0e1a 50%, #172033 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(124, 58, 237, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "100px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.08)",
          }}
        />

        {/* Category badge */}
        {category && (
          <div
            style={{
              display: "flex",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                padding: "8px 20px",
                borderRadius: "30px",
                background: "rgba(124, 58, 237, 0.3)",
                color: "#c4b5fd",
                fontSize: "20px",
              }}
            >
              {category}
            </span>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 30 ? "48px" : "56px",
            fontWeight: "bold",
            color: "#ffffff",
            lineHeight: 1.3,
            maxWidth: "900px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>

        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "40px",
          }}
        >
          <span
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #a78bfa, #f59e0b)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            NIGHTPICKS
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
