/**
 * BarcodeScanner.jsx — COMPLETE FIXED VERSION
 * Removed local product lookup - just passes barcode to parent
 */

import React, { useRef, useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({
  products,  // kept for compatibility but NOT used
  onProductFound,
  showScanner,
  setShowScanner,
  disabled,
  showManualInput = true,
}) => {
  const barcodeRef = useRef(null);
  const scannerRef = useRef(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [flash, setFlash] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Focus barcode scanner on load
  useEffect(() => {
    if (showManualInput && barcodeRef.current && !showScanner) {
      barcodeRef.current.focus();
    }
  }, [showScanner, showManualInput]);

  // Simple beep function
  const playBeep = (success) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) { }
  };

  // Simple vibration
  const vibrate = (success) => {
    try {
      navigator.vibrate?.(success ? [80, 40, 80] : [260]);
    } catch (_) { }
  };

  // Handle flash effect
  const triggerFlash = (type) => {
    setFlash(type);
    setTimeout(() => setFlash(null), 400);
  };

  // Webcam Scanner Effect - FIXED VERSION
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      setIsScanning(true);

      const readerElement = document.getElementById('reader');
      if (!readerElement) return;

      readerElement.innerHTML = '';

      const scanner = new Html5QrcodeScanner('reader', {
        fps: 30,
        qrbox: { width: 500, height: 250 },
        aspectRatio: 1.777778,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }, false);

      scanner.render(
        (result) => {
          // Success callback - immediately process the result
          if (!scannerRef.current) return;
          
          // Clean up scanner first
          if (scannerRef.current) {
            scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
            scannerRef.current = null;
          }
          
          setIsScanning(false);
          setShowScanner(false);
          triggerFlash('success');
          playBeep(true);
          vibrate(true);
          
          // DIRECTLY PASS THE RAW BARCODE - NO LOCAL LOOKUP
          onProductFound(result);
        },
        (error) => {
          // Ignore parsing errors silently
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
          scannerRef.current = null;
        }
        setIsScanning(false);
      };
    } else if (!showScanner && scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, [showScanner, onProductFound, setShowScanner]);

  // Handle manual barcode input - FIXED VERSION
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    playBeep(true);
    vibrate(true);
    triggerFlash('success');
    
    // DIRECTLY PASS THE BARCODE - NO LOCAL LOOKUP
    onProductFound(barcodeInput.trim());
    setBarcodeInput('');
  };

  return (
    <>
      <style>
        {`
          @keyframes scanPulse {
            0% { opacity: 0; }
            50% { opacity: 0.6; }
            100% { opacity: 0; }
          }
        `}
      </style>

      {/* Barcode Scanner Input */}
      <div className={showManualInput ? "mb-4" : "mb-2"}>
        {showManualInput && (
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">⌨️</span>
              </div>
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Type barcode & Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full min-w-0 pl-10 pr-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg font-mono text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 shadow-inner"
                disabled={disabled || showScanner}
              />
            </div>
            <button
              type="submit"
              disabled={disabled || showScanner}
              className="shrink-0 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}

        <button
          onClick={() => setShowScanner(!showScanner)}
          className={`w-full py-2 border rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${showScanner
              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
            }`}
        >
          <span>📷</span>
          {showScanner ? "Close Webcam Scanner" : "Scan via Webcam"}
        </button>

        {showScanner && (
          <div className="mt-3 relative">
            <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 shadow-inner relative">
              <div id="reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[250px]"></div>

              {flash && (
                <div
                  className={`absolute inset-0 rounded-lg pointer-events-none transition-all duration-300 ${flash === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  style={{
                    animation: 'scanPulse 0.4s ease-out',
                    opacity: 0
                  }}
                />
              )}

              {isScanning && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-75 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Scanning...
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-2">
              Position barcode clearly in frame • Closes automatically after successful scan
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default BarcodeScanner;