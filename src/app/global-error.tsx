"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-NP">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong | Purple Haze</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#130b1d",
          color: "#faf8ff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 440, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              color: "#d4af37",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Purple Haze
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 30 }}>
            The page could not load
          </h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#c9c2d4" }}>
            This is usually temporary. Try again, or return to the home page.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={() => retry()}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "11px 18px",
                background: "#6d28d9",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A full reload is intentional when the root tree has failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: 999,
                padding: "10px 18px",
                border: "1px solid #4b3d5e",
                color: "#faf8ff",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Home
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: 20, fontSize: 11, color: "#8f849d" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
