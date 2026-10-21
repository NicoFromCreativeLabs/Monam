"use client";

import { useRef, useState } from "react";
import { decodeQrFromFile } from "@/lib/qr-image";

// "Subir foto": reads a QR from a picture (a photo or a screenshot) instead of
// the live camera. Calls onDetect with the QR's text.
export function QrPhotoButton({
  onDetect,
  onError,
  label = "Subir foto",
}: {
  onDetect: (text: string) => void;
  onError: (message: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function onFile(file: File) {
    setReading(true);
    try {
      const text = await decodeQrFromFile(file);
      if (text) onDetect(text);
      else onError("No encontramos un QR en esa imagen. Prueba con una foto más cercana y con buena luz.");
    } catch {
      onError("No se pudo leer la imagen. Intenta con otra.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={reading}
        className="shrink-0 rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso disabled:opacity-50"
      >
        {reading ? "Leyendo…" : label}
      </button>
    </>
  );
}
