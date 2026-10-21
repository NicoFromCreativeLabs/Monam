"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { QrPhotoButton } from "@/components/panel/QrPhotoButton";

// Reads a QR code with the device camera (phone or the front desk's computer).
// Calls onDetect once with the text of the first QR it sees. If the camera is
// not available the person is told to type the code instead.
export function QrScanner({ onDetect, onClose }: { onDetect: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  // A picture that has no readable QR: say so without closing the live camera.
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        scan();
      } catch {
        setError("No se pudo abrir la cámara. Permite el acceso, sube una foto del QR o escribe el código.");
      }
    }

    function scan() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (found?.data) {
            stopped = true;
            onDetect(found.data);
            return;
          }
        }
      }
      timer = setTimeout(scan, 150);
    }

    start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // onDetect is called at most once; the scanner is remounted to scan again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/60 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-sm text-ciruela">Escanear QR de descuento</p>
          <button onClick={onClose} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
            ×
          </button>
        </div>
        {error ? (
          <p className="py-8 text-center font-body text-sm text-[#b3392f]">{error}</p>
        ) : (
          <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-lg bg-black object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="font-body text-xs text-ciruela/60">Apunta la cámara al QR, o sube una foto.</p>
          <QrPhotoButton onDetect={onDetect} onError={setPhotoError} />
        </div>
        {photoError && <p className="mt-2 font-body text-xs text-[#b3392f]">{photoError}</p>}
      </div>
    </div>
  );
}
