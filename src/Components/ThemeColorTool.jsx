import React, { useState, useEffect } from "react";

const STORAGE_KEY = 'app-theme-v1';

const DEFAULT_VALUES = {
  accent: '#0284c7',
  // sidebar: '#011669',
  sidebar: '#01104e',
  appBg: '#f0f9ff'
};

const PRESETS = [
  { name: "Classic Corporate", accent: "#0284c7", sidebar: "#162f53", appBg: "#f0f9ff" },
  { name: "Emerald Forest", accent: "#059669", sidebar: "#052e16", appBg: "#f0fdf4" },
  { name: "Sunset Crimson", accent: "#dc2626", sidebar: "#450a0a", appBg: "#fff5f5" },
  { name: "Midnight Purple", accent: "#7c3aed", sidebar: "#1e0a3c", appBg: "#f5f3ff" },
  { name: "Ocean Breeze", accent: "#0284c7", sidebar: "#0c1a2e", appBg: "#f0f9ff" },
  { name: "Stone Amber", accent: "#d97706", sidebar: "#1c1917", appBg: "#fffbeb" }
];

function hexDarken(hex, amount) {
  const cleanHex = hex.replace("#", "");
  let r = parseInt(cleanHex.substring(0, 2), 16);
  let g = parseInt(cleanHex.substring(2, 4), 16);
  let b = parseInt(cleanHex.substring(4, 6), 16);


  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function hexLighten(hex, amount) {
  const cleanHex = hex.replace("#", "");
  let r = parseInt(cleanHex.substring(0, 2), 16);
  let g = parseInt(cleanHex.substring(2, 4), 16);
  let b = parseInt(cleanHex.substring(4, 6), 16);

  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-app-accent', theme.accent);
  root.style.setProperty('--color-app-accent-hover', hexDarken(theme.accent, 20));
  root.style.setProperty('--color-app-accent-light', hexLighten(theme.accent, 180));
  root.style.setProperty('--color-app-sidebar', theme.sidebar);
  root.style.setProperty('--color-app-bg', theme.appBg);
}

const ThemeColorTool = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [themeState, setThemeState] = useState(DEFAULT_VALUES);

  // Initialize theme from storage or defaults on mount
  useEffect(() => {
    const savedThemeStr = localStorage.getItem(STORAGE_KEY);
    if (savedThemeStr) {
      try {
        const savedTheme = JSON.parse(savedThemeStr);
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } catch (e) {
        applyTheme(DEFAULT_VALUES);
      }
    } else {
      applyTheme(DEFAULT_VALUES);
    }
  }, []);

  const handlePresetClick = (preset) => {
    setThemeState(preset);
    applyTheme(preset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  };

  const handleColorChange = (key, val) => {
    const updatedTheme = {
      ...themeState,
      [key]: val
    };
    setThemeState(updatedTheme);
    applyTheme(updatedTheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTheme));
  };

  const handleReset = () => {
    setThemeState(DEFAULT_VALUES);
    applyTheme(DEFAULT_VALUES);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 flex items-center justify-center bg-white text-gray-700 rounded-full shadow-lg border border-gray-200 cursor-pointer hover:bg-gray-50 hover:scale-105 transition-all"
        title="Theme Customizer"
        style={{
          boxShadow: "0 4px 14px 0 rgba(0, 0, 0, 0.1)"
        }}
      >
        <svg
          className="w-6 h-6 text-gray-600 animate-[spin_12s_linear_infinite]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.53 16.122l.75 3.128c.13.542.853.64 1.127.143l4.317-7.838M9.53 16.122a3 3 0 11-1.897-4.218l3.127-1.127m1.128-4.317c.5-.274 1.1-.018 1.25.5l.75 3.128m-2-3.628L15 12.5"
          />
        </svg>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 backdrop-blur-[0.5px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800">Theme Customizer</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Presets Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Presets</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESETS.map((p) => {
                const isActive =
                  themeState.bg === p.appBg &&
                  themeState.sidebar === p.sidebar &&
                  themeState.accent === p.accent;

                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePresetClick(p)}
                    className={`flex flex-col p-2.5 rounded-lg border text-left bg-white hover:border-gray-300 transition-all ${isActive ? "border-gray-800 ring-1 ring-gray-800" : "border-gray-200"
                      }`}
                  >
                    <span className="text-[11px] font-semibold text-gray-700 truncate w-full">{p.name}</span>
                    <div className="flex gap-1.5 mt-2">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-100"
                        style={{ backgroundColor: p.sidebar }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-gray-100"
                        style={{ backgroundColor: p.accent }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-gray-100"
                        style={{ backgroundColor: p.appBg }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Custom Colors Pickers */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Custom Colors</h4>

            {/* Accent Color */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              <span className="text-xs font-medium text-gray-700">Accent Color</span>
              <input
                type="color"
                value={themeState.accent}
                onChange={(e) => handleColorChange("accent", e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer overflow-hidden p-0 bg-transparent"
              />
            </div>

            {/* Sidebar Background */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              <span className="text-xs font-medium text-gray-700">Sidebar Background</span>
              <input
                type="color"
                value={themeState.sidebar}
                onChange={(e) => handleColorChange("sidebar", e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer overflow-hidden p-0 bg-transparent"
              />
            </div>

            {/* App Background */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
              <span className="text-xs font-medium text-gray-700">App Background</span>
              <input
                type="color"
                value={themeState.appBg}
                onChange={(e) => handleColorChange("appBg", e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer overflow-hidden p-0 bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </>
  );
};

export default ThemeColorTool;
