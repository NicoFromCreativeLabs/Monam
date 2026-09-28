import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Node runtime (not the default Edge) so this can read the real monogram
// SVG off disk with fs, instead of redrawing a stand-in shape with CSS.
export const runtime = "nodejs";

export const alt = "MONÂM Skin Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const monogramSvg = readFileSync(
    join(process.cwd(), "public/brand/monam-monogram.svg"),
    "utf-8",
  );
  const monogramDataUri = `data:image/svg+xml;base64,${Buffer.from(monogramSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f1eae5",
          gap: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={monogramDataUri} width={168} height={168} alt="" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              fontSize: 54,
              color: "#3f0215",
              letterSpacing: 10,
            }}
          >
            MONÂM
          </div>
          <div style={{ fontSize: 26, color: "#3f0215", opacity: 0.6 }}>
            Wellness Hub · Skincare Studio
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
