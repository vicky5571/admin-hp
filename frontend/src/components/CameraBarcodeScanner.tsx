"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  expectedCount?: number;
  currentCount?: number;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode / IMEI",
  subtitle = "Align the barcode or IMEI within the frame",
  expectedCount,
  currentCount,
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScanned, setLastScanned] = useState("");
  const [scanFeedback, setScanFeedback] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Play synthesized audio beep on scan
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 pitch
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, []);

  const handleDetectedCode = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;

      playBeep();
      setLastScanned(clean);
      setScanFeedback(true);
      setTimeout(() => setScanFeedback(false), 600);
      onScan(clean);
    },
    [onScan, playBeep]
  );

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setError("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser. Use manual entry.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = (track as any)?.getCapabilities?.() || {};
      setHasTorch(Boolean(capabilities.torch));

      // Start Barcode Detection Loop
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "qr_code",
            "data_matrix",
            "upc_a",
            "upc_e",
          ],
        });

        let isScanning = false;
        let lastDetectedTime = 0;

        const scanFrame = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          if (!isScanning && Date.now() - lastDetectedTime > 800) {
            isScanning = true;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  lastDetectedTime = Date.now();
                  handleDetectedCode(rawValue);
                }
              }
            } catch {
              // Ignore frame detection errors
            } finally {
              isScanning = false;
            }
          }

          animationFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access camera. Please allow camera permissions."
      );
    }
  }, [facingMode, handleDetectedCode, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      // Torch toggle not supported
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Counter Badge if expected count is provided */}
        {expectedCount !== undefined && currentCount !== undefined && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-blue-950/40 border-b border-blue-900/30 text-xs">
            <span className="font-semibold text-blue-300">Intake Progress:</span>
            <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
              {currentCount} / {expectedCount} Scanned
            </span>
          </div>
        )}

        {/* Viewfinder Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-rose-400 text-xs max-w-sm">
              <svg className="w-10 h-10 mx-auto mb-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-semibold">{error}</p>
              <p className="mt-2 text-slate-400">
                You can still enter barcodes manually using the input below.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover max-h-[340px]"
              />

              {/* Scanning Target Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div
                  className={`relative w-64 h-36 border-2 rounded-xl transition-all duration-200 ${
                    scanFeedback
                      ? "border-emerald-400 bg-emerald-500/20 scale-105 shadow-lg shadow-emerald-500/50"
                      : "border-blue-400/80 bg-transparent"
                  }`}
                >
                  {/* Reticle Corner Highlights */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-400 rounded-tl"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-400 rounded-tr"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-400 rounded-bl"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-400 rounded-br"></div>

                  {/* Animated Laser Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce top-1/2 -translate-y-1/2 opacity-80"></div>
                </div>
              </div>

              {/* Live Status Tag */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 backdrop-blur-md">
                  Point smartphone camera at barcode
                </span>
                {lastScanned && (
                  <span className="rounded-md bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-300">
                    Scanned: {lastScanned}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Switch Camera</span>
            </button>

            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  torchOn
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{torchOn ? "Flash ON" : "Flash OFF"}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Done Scanning
          </button>
        </div>

        {/* Manual Fallback Entry */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleDetectedCode(manualCode);
                setManualCode("");
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Or type/paste barcode or IMEI here..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
