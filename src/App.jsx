import React, { useState, useEffect, useCallback } from "react";
import { Zap, FileText, Volume2, Bell, Package, MapPin, AlertTriangle, MessageSquare, Mic, Search, Thermometer, Droplet, Loader, Play, CheckCircle, Sun, Moon, TrendingUp, Bot, MessageCircle, GitBranch, Shield, Globe, ArrowRight } from "lucide-react";
import silhouetteMask from './assets/silhouette-mask.png';
import allbg from "./assets/background0.jpeg";
import './index.css';
import CONTRACT_ABI from "./contracts/Immulink.json";
import { getContract } from "./blockchain/getContract.js";
import { ethers } from "ethers";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
import AnimatedBackground from "./AnimatedBackground";


console.log("Using contract:", CONTRACT_ADDRESS);

// --- GLOBAL CONFIGURATION & UTILITIES ---

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const API_KEY = "AIzaSyCMeoUOhasYrlp2uA2uyLiIhBP8OzEbd4g"; 

// --- THEME DEFINITIONS ---

    // New Dark Theme: Vibrant Deep Blue/Purple with Neon Accents (Based on User's Image)
    // --- THEME DEFINITIONS ---
const THEMES = {
    // New: Teal Dark Theme (Inspired by uploaded images)
    dark: {
  BACKGROUND:      "#0A0F1F",
  CARD_BG:         "#11172A",
  INPUT_BG:        "#0D1424",
  TEXT_PRIMARY:    "#EAF2FF",
  TEXT_MUTED:      "#8892B0",
  BORDER:          "#1E2A45",

  PRIMARY_ACCENT: '#8A4FFF',
  SECONDARY_ACCENT: '#28D8FF ',
  ALERT_ACCENT: '#FF4F6D',

  ALERT_BG: 'rgba(255, 79, 109, 0.12)',
  SUCCESS_BG: 'rgba(40, 216, 255, 0.12)',

  BG_OVERLAY: 'rgba(10,15,31,0.88)',   // darker overlay for readability
  SHADOW_FOCUS: '0 0 20px rgba(138,79,255,0.5)',
  SHADOW_DEFAULT: '0 8px 25px -8px rgba(0,0,0,0.75)',
  BG_GLASS: "transparent",
  GLASS_HIGHLIGHT: 'rgba(138,79,255,0.12)',

  // NEW 🔥 Background image
  BG_IMAGE: "/src/assets/bg-dark.png"
},

    // High-contrast Light Theme (Kept original colors)
light: {
  BACKGROUND: "#F3EAF8",
  CARD_BG: "#FFFFFF",
  INPUT_BG: "#EADCF7",
  TEXT_PRIMARY: "#2E2E2E",
  TEXT_MUTED: "#7A7A7A",
  BORDER: "#D7BDE2",

  PRIMARY_ACCENT: "#C39BD3",
  SECONDARY_ACCENT: "#D7BDE2",
  ALERT_ACCENT: "#F7C6C7",

  ALERT_BG: "rgba(247,198,199,0.2)",
  SUCCESS_BG: "rgba(215,189,226,0.2)",

  BG_OVERLAY: "rgba(255,255,255,0.15)",
  SHADOW_DEFAULT: "0 4px 12px rgba(0,0,0,0.08)",
  SHADOW_FOCUS: "0 0 20px rgba(0,0,0,0.12)",

  BG_GLASS: "transparent",
  GLASS_HIGHLIGHT: "rgba(195,155,211,0.12)",

  // NEW ✨ Background image
  BG_IMAGE: "/src/assets/bg-light.png"
}
  };


// Helper functions (PCM to WAV conversion and fetchWithRetry remain the same)
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const base64ToArrayBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const pcmToWav = (pcm16, sampleRate = 24000) => {
  const pcmData = pcm16.buffer;
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');
  
  // Format Chunk (PCM)
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits per sample

  // Data Chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);
  
  // Write PCM data
  const pcmBytes = new Uint8Array(pcmData);
  const dataOffset = 44;
  for (let i = 0; i < pcmData.byteLength; i++) {
    view.setUint8(dataOffset + i, pcmBytes[i]);
  }

  return new Blob([view], { type: 'audio/wav' });
};

const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Fetch failed after all retries:", error);
        throw error;
      }
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// --- SIMULATED BACKEND ---

const SHIPMENT_DATABASE = {
    "IMMULINK-VX-4521-A": {
        batchId: "IMMULINK-VX-4521-A",
        product: "Vaccine Batch A (COVID-X)",
        origin: "Chennai, IN (Manufacturing Hub)",
        destination: "New York, US (Distribution Center)",
        currentStatus: "CRITICAL: Temp Deviation Detected near London (LOW)",
        alerts: 2,
        timeSinceLastUpdate: "1 min ago",
        criticalThresholds: { tempMin: 2.0, tempMax: 8.0 },
        currentReadings: {
            temp: 1.5, // BELOW 2.0C threshold
            humidity: 65,
            blockchainVerified: true
        },
        history: [
            { id: 1, location: "Chennai", temp: 4.5, time: "2025-12-01 10:00", alert: false },
            { id: 2, location: "Dubai", temp: 3.1, time: "2025-12-02 02:00", alert: false },
            { id: 3, location: "London", temp: 1.9, time: "2025-12-02 18:00", alert: true },
            { id: 4, location: "London", temp: 1.5, time: "2025-12-02 20:00", alert: true },
            { id: 5, location: "London", temp: 1.5, time: "2025-12-02 20:01", alert: true },
        ]
    },
    "IMMULINK-VX-7890-B": {
        batchId: "IMMULINK-VX-7890-B",
        product: "Vaccine Batch B (FLU-2025)",
        origin: "Shanghai, CN (Factory)",
        destination: "Frankfurt, DE (Distribution Hub)",
        currentStatus: "In Transit: Scheduled Delivery on Time",
        alerts: 0,
        timeSinceLastUpdate: "5 min ago",
        criticalThresholds: { tempMin: 2.0, tempMax: 8.0 },
        currentReadings: {
            temp: 6.8, // Nominal
            humidity: 55,
            blockchainVerified: true
        },
        history: [
            { id: 1, location: "Shanghai", temp: 5.0, time: "2025-12-01 08:00", alert: false },
            { id: 2, location: "Frankfurt", temp: 6.2, time: "2025-12-02 14:30", alert: false },
            { id: 3, location: "Frankfurt", temp: 6.0, time: "2025-12-02 20:00", alert: false },
            { id: 4, location: "Berlin", temp: 7.1, time: "2025-12-03 04:00", alert: false },
        ]
    },
    "IMMULINK-VX-1111-Z": {
        batchId: "IMMULINK-VX-1111-Z",
        product: "Specialty Drug Z",
        origin: "London, UK",
        destination: "Tokyo, JP",
        currentStatus: "CRITICAL: Temperature Exceeded Max Threshold over Pacific",
        alerts: 1,
        timeSinceLastUpdate: "30 seconds ago",
        criticalThresholds: { tempMin: 2.0, tempMax: 8.0 },
        currentReadings: {
            temp: 9.5, // ABOVE 8.0C threshold
            humidity: 78,
            blockchainVerified: true
        },
        history: [
            { id: 1, location: "London", temp: 7.5, time: "2025-12-03 10:00", alert: false },
            { id: 2, location: "Siberia", temp: 8.1, time: "2025-12-03 23:00", alert: true }, // Alert start
            { id: 3, location: "Pacific Ocean", temp: 9.5, time: "2025-12-04 05:00", alert: true },
            { id: 4, location: "Pacific Ocean", temp: 9.5, time: "2025-12-04 05:30", alert: true },
        ]
    }
};

const useImmulinkData = (initialBatchId) => {
    const [batchId, setBatchId] = useState(initialBatchId);
    const [shipmentData, setShipmentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const normalizedId = id.toUpperCase();
            const data = SHIPMENT_DATABASE[normalizedId];

            if (!data) {
                 throw new Error("Batch ID not found in database.");
            }
            
            setShipmentData(data);
        } catch (err) {
            setError(err.message || "Failed to fetch shipment data. Please check the Batch ID.");
            setShipmentData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(batchId);
    }, [batchId, fetchData]);

    return { shipmentData, loading, error, setBatchId };
};


// --- Reusable Components ---

const ThemeToggle = ({ theme, toggleTheme, COLORS }) => {
    const Icon = theme === 'light' ? Moon : Sun;
    const nextTheme = theme === 'light' ? 'dark' : 'light';

    return (
        <button
            onClick={toggleTheme}
            className="p-3 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg border"
            style={{ 
                backgroundColor: COLORS.CARD_BG, 
                color: COLORS.TEXT_PRIMARY,
                borderColor: COLORS.BORDER,
                boxShadow: COLORS.SHADOW_DEFAULT,
                filter: 'brightness(1.1)'
            }}
            aria-label={`Switch to ${nextTheme} theme`}
        >
            <Icon size={20} style={{ color: COLORS.PRIMARY_ACCENT }} />
        </button>
    );
};

// --- Landing Page Component ---

const LandingPage = ({ COLORS, onAccess, isLandingPageActive }) => {
    const transitionClass = isLandingPageActive ? 'opacity-100' : 'opacity-0 pointer-events-none';

    return (
        <div 
            className={`fixed inset-0 flex items-center justify-center transition-opacity duration-1000 z-50 ${transitionClass}`}
            style={{ 
                backgroundColor: "#F7F9FB",
                overflow: "hidden"
            }}
        >

            {/* SHARP BACKGROUND IMAGE (NO BLUR) */}
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${allbg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

           <div className="absolute inset-0 flex items-center justify-center">
    
    {/* Glow wrapper */}
    <div
        className="animate-glowPulseViolet"
        style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 0 45px rgba(138, 43, 226, 0.95))", // Neon violet glow
        }}
    >
        {/* Masked gradient logo */}
        <div
            style={{
                width: "100%",
                height: "100%",
                WebkitMaskImage: `url(${silhouetteMask})`,
                maskImage: `url(${silhouetteMask})`,
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",

                background: "linear-gradient(135deg, #8A2BE2 0%, #C715FF 35%, #DA70D6 70%, #EE82EE 100%)", // Violet neon gradient
            }}
        />
    </div>
</div>



            {/* CENTER TEXT */}
            <div className="relative z-20 text-center px-6">
                <h1 
                    className="text-[110px] font-extrabold leading-none"
                    style={{
                        color: "#FFFFFF",
                        textShadow: "0 4px 40px rgba(0,0,0,0.75)",
                        letterSpacing: "4px"
                    }}
                >
                    IMMULINK
                </h1>

                <p 
                    className="text-3xl font-light mt-4 max-w-2xl mx-auto"
                    style={{ 
                        color: "#FFFFFF",
                        textShadow: "0 2px 20px rgba(0,0,0,0.55)"
                    }}
                >
                    Secure Cold Chain Monitoring & Predictive AI Analytics.
                </p>

                <button
                    onClick={onAccess}
                    className="mt-10 px-10 py-4 rounded-full text-xl font-bold tracking-wide transition-all hover:scale-105"
                    style={{ 
                        backgroundColor: "#8A4FFF",
                        color: "white",
                        boxShadow: "0 8px 20px rgba(138,79,255,0.4)"
                    }}
                >
                    ACCESS DASHBOARD →
                </button>
            </div>
        </div>
    );
};

const DataCard = ({ title, value, icon: Icon, color, alert = false, detail = '', COLORS }) => {
    const cardColor = alert ? COLORS.ALERT_ACCENT : color;

    return (
        <div className={`p-5 rounded-xl transition-all duration-300 transform hover:scale-[1.03] w-full cursor-pointer`} 
            style={{ 
                boxShadow: COLORS.SHADOW_DEFAULT,
                backgroundColor: COLORS.CARD_BG,
                borderLeft: `4px solid ${cardColor}`,
                color: COLORS.TEXT_PRIMARY,
                border: `1px solid ${COLORS.BORDER}`,
                transition: 'transform 0.3s, box-shadow 0.3s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `${COLORS.SHADOW_DEFAULT}, ${COLORS.SHADOW_FOCUS}`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = COLORS.SHADOW_DEFAULT}
        >
            <div className="flex items-center justify-between">
                <Icon size={24} className="p-1 rounded-md" style={{ color: cardColor, backgroundColor: `${cardColor}20` }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.TEXT_MUTED }}>{title}</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            {detail && <p className="text-sm mt-2" style={{ color: COLORS.TEXT_MUTED }}>{detail}</p>}
        </div>
    );
};

const BatchTracingInput = ({ batchInput, setBatchInput, handleTraceBatch, loading, COLORS }) => (
    <div className="p-6 rounded-xl shadow-lg w-full transition-shadow duration-300"
        style={{ 
            backgroundColor: COLORS.CARD_BG, 
            boxShadow: COLORS.SHADOW_DEFAULT, 
            border: `1px solid ${COLORS.BORDER}` 
        }}>
        <h3 className="text-xl font-bold flex items-center mb-4 border-b pb-3" style={{ color: COLORS.TEXT_PRIMARY, borderColor: COLORS.BORDER }}>
            <Search size={22} className="mr-3" style={{ color: COLORS.PRIMARY_ACCENT }} />
            <span className="text-2xl">Trace Shipment ID</span>
        </h3>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 items-stretch w-full">
            <input
                type="text"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="Enter Batch ID (e.g., IMMULINK-VX-7890-B)"
                className="flex-grow p-4 border rounded-xl focus:ring-4 text-base font-mono min-w-0 transition-colors duration-300 shadow-inner" 
                style={{ 
                    backgroundColor: COLORS.INPUT_BG, 
                    borderColor: COLORS.BORDER, 
                    color: COLORS.TEXT_PRIMARY,
                    '--tw-ring-color': `${COLORS.PRIMARY_ACCENT}80`
                }}
            />
            <button
                onClick={handleTraceBatch}
                disabled={loading}
                className="px-8 py-4 font-extrabold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: COLORS.PRIMARY_ACCENT, color: COLORS.CARD_BG, boxShadow: `0 4px 15px ${COLORS.PRIMARY_ACCENT}60` }}
            >
                {loading ? <Loader size={20} className="animate-spin" /> : 'FETCH'}
            </button>
        </div>
    </div>
);

const AiToolSelector = ({ activeTool, setActiveTool, COLORS }) => {
    const tools = [
        { name: 'Draft', label: 'Draft Customer Reply', icon: MessageSquare },
        { name: 'Risk', label: 'Predictive Risk Analysis', icon: AlertTriangle },
        { name: 'TTS', label: 'Generate Audio Alert', icon: Volume2 },
    ];
    return (
        <div className="flex justify-center p-4 border-b w-full" style={{ backgroundColor: COLORS.CARD_BG, borderColor: COLORS.BORDER }}>
            <div className="flex p-2 rounded-xl w-full sm:w-auto" style={{ backgroundColor: COLORS.INPUT_BG }}>
                {tools.map((tool) => (
                    <button
                        key={tool.name}
                        onClick={() => setActiveTool(tool.name)}
                        className={`flex items-center justify-center space-x-2 py-3 px-4 mx-1 rounded-xl transition-all duration-300 text-sm font-bold whitespace-nowrap w-1/3 text-center transform hover:scale-[1.02]
                            ${activeTool === tool.name 
                                ? 'shadow-lg text-white'
                                : ''
                            }`}
                        style={{ 
                            backgroundColor: activeTool === tool.name ? COLORS.PRIMARY_ACCENT : 'transparent',
                            color: activeTool === tool.name ? COLORS.CARD_BG : COLORS.TEXT_MUTED,
                            boxShadow: activeTool === tool.name ? `0 2px 10px ${COLORS.PRIMARY_ACCENT}60` : 'none'
                        }}
                    >
                        <tool.icon size={18} />
                        <span className="truncate">{tool.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const CurrentStatusBox = ({ shipmentData, COLORS, overallAlert, alertColor, operationalStatus }) => (
    <div className={`p-6 rounded-xl shadow-xl border-t-8 flex flex-col justify-start transition-shadow duration-300 h-full`}
        style={{ 
            backgroundColor: COLORS.CARD_BG,
            borderColor: alertColor,
            boxShadow: COLORS.SHADOW_DEFAULT,
            color: COLORS.TEXT_PRIMARY
        }}>
        <h3 className="text-xl font-extrabold flex items-center mb-3" style={{ color: alertColor }}>
            {overallAlert ? <AlertTriangle size={24} className="inline mr-2" /> : <CheckCircle size={24} className="inline mr-2" />}
            OPERATIONAL STATUS
        </h3>
        <p className="text-2xl mt-1 font-bold leading-tight" style={{ color: COLORS.TEXT_PRIMARY }}>
            {operationalStatus}
        </p>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: COLORS.BORDER }}>
            <p className="text-sm font-semibold" style={{ color: COLORS.TEXT_MUTED }}>Product: {shipmentData.product}</p>
            <p className="text-sm font-semibold" style={{ color: COLORS.TEXT_MUTED }}>Origin: {shipmentData.origin}</p>
        </div>
    </div>
);

const PredictiveHealthScoreCard = ({ score, COLORS }) => {
  const finalScore = score ?? 100;

  let statusText = "SECURE";
  let statusColor = COLORS.SECONDARY_ACCENT;

  if (finalScore < 70) {
    statusText = "MONITOR";
    statusColor = COLORS.PRIMARY_ACCENT;
  }
  if (finalScore < 50) {
    statusText = "CRITICAL";
    statusColor = COLORS.ALERT_ACCENT;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (finalScore / 100) * circumference;

  return (
    <div
      className="p-6 rounded-xl shadow-xl w-full flex flex-col items-center justify-center space-y-4 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
      style={{
        backgroundColor: COLORS.CARD_BG,
        boxShadow: COLORS.SHADOW_DEFAULT,
        border: `1px solid ${COLORS.BORDER}`,
      }}
      onMouseEnter={e =>
        (e.currentTarget.style.boxShadow = `${COLORS.SHADOW_DEFAULT}, ${COLORS.SHADOW_FOCUS}`)
      }
      onMouseLeave={e =>
        (e.currentTarget.style.boxShadow = COLORS.SHADOW_DEFAULT)
      }
    >
      <h3 className="text-lg font-bold flex items-center" style={{ color: COLORS.TEXT_PRIMARY }}>
        PREDICTIVE HEALTH SCORE
      </h3>

      <div className="relative flex items-center justify-center w-28 h-28">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth="10"
            fill="transparent"
            style={{ stroke: COLORS.INPUT_BG }}
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
            style={{ stroke: statusColor }}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold" style={{ color: statusColor }}>
            {finalScore}
          </span>
          <span className="text-xs font-semibold uppercase" style={{ color: COLORS.TEXT_MUTED }}>
            /100
          </span>
        </div>
      </div>

      <p
        className="text-sm font-bold tracking-widest p-1 px-3 rounded-full"
        style={{ backgroundColor: statusColor + "20", color: statusColor }}
      >
        {statusText}
      </p>
    </div>
  );
};


// --- IMAGE-DRIVEN MODULE COMPONENTS ---

// 1. Image Module for AI Suite (Lab/Synthesis theme)
const AiImageModule = ({ COLORS }) => (
    <div className="w-full h-48 rounded-t-xl overflow-hidden relative">
        <img 
            // Updated placeholder for new color scheme
            src="/src/assets/ai_bg.jpg" 
            alt="AI Synthesis Lab Background" 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/800x300/100C4D/FF0080?text=AI+Analysis+Center"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-4">
             <h2 className="text-3xl font-extrabold flex items-center space-x-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                <Bot size={32} style={{ color: COLORS.PRIMARY_ACCENT }}/>
                <span className="tracking-wider">AI INTELLIGENCE SUITE</span>
            </h2>
        </div>
    </div>
);

// 2. Image Module for Traceability (Global Logistics theme)
const TraceabilityImageModule = ({ shipmentData, COLORS }) => (
    <div className="p-6 rounded-xl shadow-xl relative flex flex-col w-full transition-shadow duration-300 h-full"
        style={{ 
            backgroundColor: COLORS.CARD_BG, 
            boxShadow: COLORS.SHADOW_DEFAULT, 
            border: `1px solid ${COLORS.BORDER}` 
        }}>
        <div className="w-full h-64 rounded-xl overflow-hidden relative shadow-lg">
            <img 
                // Updated placeholder for new color scheme
                src="/src/assets/world_map.jpg" 
                alt="Global Logistics Background" 
                className="w-full h-full object-cover" 
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1200x400/05031E/00D4FF?text=COLD+CHAIN+LOGISTICS"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                 <h2 className="text-3xl font-extrabold flex items-center space-x-3" style={{ color: COLORS.TEXT_PRIMARY }}>
                    <Globe size={32} style={{ color: COLORS.SECONDARY_ACCENT }}/>
                    <span className="tracking-wider">GLOBAL LOGISTICS & AUDIT</span>
                </h2>
            </div>
        </div>
        <div className="mt-6">
             <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: COLORS.BORDER }}>
                <h3 className="text-xl font-bold flex items-center" style={{ color: COLORS.TEXT_PRIMARY }}>
                    <MapPin size={24} className="mr-2" style={{ color: COLORS.PRIMARY_ACCENT }} /> LIVE COLD CHAIN ROUTE
                </h3>
                <div className="text-xs p-1 px-3 rounded-full font-bold shadow-md uppercase" 
                    style={{ color: COLORS.CARD_BG, backgroundColor: COLORS.PRIMARY_ACCENT }}>
                    {/* Accessing shipmentData.destination is now safe */}
                    {shipmentData.destination.split(',')[0]} 
                </div>
            </div>
            <div className="w-full rounded-lg border-2 shadow-inner h-[250px] overflow-hidden mt-4" style={{ borderColor: COLORS.PRIMARY_ACCENT }}>
                 <iframe
                    title="Shipment Route Map"
                    src="https://www.google.com/maps/embed?q=Chennai+to+London&z=3" 
                    className="w-full h-full"
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
            </div>
        </div>
    </div>
);


const ShipmentHistoryTable = ({ history, COLORS }) => (
    <div
  className="lg:col-span-2 w-full rounded-xl shadow-2xl overflow-hidden"
  style={{
    backgroundColor: COLORS.CARD_BG,
    boxShadow: COLORS.SHADOW_DEFAULT,
    border: `1px solid ${COLORS.BORDER}`,
  }}
>

        <h3 className="text-xl font-bold mb-4 flex items-center border-b pb-3" style={{ color: COLORS.TEXT_PRIMARY, borderColor: COLORS.BORDER }}>
            <GitBranch size={22} className="mr-3" style={{ color: COLORS.SECONDARY_ACCENT }} /> Full Blockchain Traceability Log
        </h3>
        <div className="overflow-y-auto overflow-x-auto rounded-lg border h-[300px] relative w-full" style={{ borderColor: COLORS.BORDER }}>
            <table className="min-w-full divide-y" style={{ borderColor: COLORS.BORDER }}>
                <thead style={{ backgroundColor: COLORS.INPUT_BG, position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>Temp (°C)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>Time (UTC)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>Status</th>
                    </tr>
                </thead>
                <tbody style={{ backgroundColor: COLORS.CARD_BG }}>
                    {history.map((item, index) => (
                        <tr key={item.id} className="transition-colors duration-150 border-t hover:brightness-110"
                            style={{ 
                                backgroundColor: item.alert ? COLORS.ALERT_BG : (index % 2 === 0 ? COLORS.CARD_BG : COLORS.INPUT_BG),
                                color: COLORS.TEXT_PRIMARY,
                                borderColor: COLORS.BORDER
                            }}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{item.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: COLORS.TEXT_MUTED }}>{item.location}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold" style={{ color: item.alert ? COLORS.ALERT_ACCENT : COLORS.TEXT_PRIMARY }}>{item.temp.toFixed(1)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: COLORS.TEXT_MUTED }}>{item.time.split(' ')[1]}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                {item.alert ? (
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-md" style={{ backgroundColor: COLORS.ALERT_ACCENT, color: COLORS.CARD_BG }}>CRITICAL</span>
                                ) : (
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-md" style={{ backgroundColor: COLORS.SECONDARY_ACCENT, color: COLORS.CARD_BG }}>OK</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <p className="text-xs mt-3 italic text-right" style={{ color: COLORS.TEXT_MUTED }}>Audit trail secured on distributed ledger.</p>
    </div>
);


// --- AI Tool Components ---

const RiskAnalysisTool = ({ shipmentData, COLORS }) => {
    const [riskResult, setRiskResult] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Prompt generation logic
    const currentTemp = realTemp ?? shipmentData.currentReadings.temp;
    const minTemp = shipmentData.criticalThresholds.tempMin;
    const maxTemp = shipmentData.criticalThresholds.tempMax;
    let tempStatus = currentTemp < minTemp ? "CRITICAL ALERT: Below minimum threshold (LOW)." : currentTemp > maxTemp ? "CRITICAL ALERT: Above maximum threshold (HIGH)." : "Nominal.";
    const prompt = `Analyze the cold chain data for Batch ID ${shipmentData.batchId}. Current Temperature: ${currentTemp}°C. Critical Range: ${minTemp}°C to ${maxTemp}°C. ${shipmentData.alerts} historical alert(s) logged. Status: ${tempStatus}. The shipment is currently near ${operationalStatus.split(':').pop().trim() || 'its last logged location'}. Provide a concise, professional risk assessment for management, focusing on potential product viability issues and logistical delays. Conclude with a clear risk score (HIGH, MEDIUM, LOW).`;
    
    const handleGenerateRisk = async () => {
        if (!API_KEY) {setRiskResult("ERROR: API Key is required to run AI analysis."); return;}
        setLoading(true); setRiskResult("Analyzing data and generating risk report...");
        const systemPrompt = "You are a senior supply chain risk analyst for a major pharmaceutical company. Provide a professional, single-paragraph risk summary based on the provided data and context, concluding with a clear risk score (HIGH, MEDIUM, or LOW).";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, tools: [{ "google_search": {} }]};

        try {
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setRiskResult(result.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed to generate content.");
        } catch (error) {
            setRiskResult("Error: Failed to connect to the AI service. Check API key and network connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 rounded-b-xl w-full" style={{ backgroundColor: COLORS.CARD_BG }}>
            <p className="text-sm p-4 rounded-xl border w-full font-medium shadow-inner" style={{ backgroundColor: COLORS.INPUT_BG, borderColor: COLORS.BORDER, color: COLORS.TEXT_PRIMARY }}>
                <span className="font-bold tracking-wider" style={{ color: COLORS.PRIMARY_ACCENT }}>Data Snapshot:</span> Temp: <span className="font-semibold">{realTemp ?? shipmentData.currentReadings.temp}°C</span>. Range: {shipmentData.criticalThresholds.tempMin}°C - {shipmentData.criticalThresholds.tempMax}°C.
            </p>
            <button
                onClick={handleGenerateRisk}
                disabled={loading}
                className="w-full font-extrabold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0"
                style={{ backgroundColor: COLORS.ALERT_ACCENT, color: COLORS.CARD_BG, boxShadow: `0 4px 15px ${COLORS.ALERT_ACCENT}60` }}
            >
                {loading ? (<><Loader size={20} className="animate-spin" /><span>Generating Report...</span></>) : (<><Zap size={20} /><span>Run Predictive Risk Analysis</span></>)}
            </button>
            <div className="mt-6 p-4 rounded-xl shadow-inner border-l-4 w-full" style={{ backgroundColor: COLORS.INPUT_BG, borderColor: COLORS.ALERT_ACCENT }}>
                <h4 className="font-bold text-base mb-2 flex items-center" style={{ color: COLORS.TEXT_PRIMARY }}>
                    <Bot size={18} className="mr-2" style={{ color: COLORS.ALERT_ACCENT }}/>
                    AI Risk Report:
                </h4>
                <div className="min-h-[140px] p-2 overflow-y-auto w-full min-w-0"> 
                    <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.TEXT_MUTED }}>{riskResult || "Click 'Run Predictive Risk Analysis' to generate a risk report based on the cold chain data."}</p>
                </div>
            </div>
        </div>
    );
};

const ResponseDraftingTool = ({ shipmentData, COLORS, realTemp, isTempCritical }) => {
    const initialFeedback = `The delivery was delayed, and the box felt warm when I picked it up. Please assure me that Batch ${shipmentData.batchId} is safe.`;
    const [consumerFeedback, setConsumerFeedback] = useState(initialFeedback);
    const [draftedResponse, setDraftedResponse] = useState("");
    const [loading, setLoading] = useState(false);

    const isAlert = isTempCritical;
    const alertDetail = isAlert ? `Historical temperature deviation(s) logged. Current temp is ${realTemp ?? shipmentData.currentReadings.temp}°C.` : "All temperature logs are nominal.";
    const prompt = `A consumer submitted feedback about Batch ID ${shipmentData.batchId} stating: "${consumerFeedback}". The cold chain record is: Current Temp: ${realTemp ?? shipmentData.currentReadings.temp}°C. ${alertDetail}. Draft a professional, reassuring, and compliance-focused response to the consumer.`;

    useEffect(() => {
        setConsumerFeedback(`The delivery was delayed, and the box felt warm when I picked it up. Please assure me that Batch ${shipmentData.batchId} is safe.`);
        setDraftedResponse('');
    }, [shipmentData.batchId]);

    const handleDraftResponse = async () => {
        if (!API_KEY) { setDraftedResponse("ERROR: API Key is required."); return; }
        setLoading(true); setDraftedResponse("Drafting professional response...");
        const systemPrompt = "You are a customer service specialist for a pharmaceutical logistics company. Draft a brief, empathetic, and professional response that confirms the product integrity check using the Immulink blockchain record. Reassure the customer about the continuous quality assurance process.";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };

        try {
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setDraftedResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "Response drafting failed.");
        } catch (error) {
            setDraftedResponse("Error: Failed to connect to the AI service. Check API key/network.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 rounded-b-xl w-full" style={{ backgroundColor: COLORS.CARD_BG }}>
            
            {/* Customer Message Bubble - Interactive Input */}
            <div className="p-4 rounded-xl rounded-bl-none shadow-xl w-full" style={{ backgroundColor: COLORS.INPUT_BG, color: COLORS.TEXT_PRIMARY }}>
                <p className="text-xs font-semibold flex items-center mb-2 uppercase tracking-widest" style={{ color: COLORS.ALERT_ACCENT }}>
                    <MessageCircle size={16} className="mr-1" style={{ color: COLORS.ALERT_ACCENT }}/>Incoming Customer Feedback:
                </p>
                <textarea
                    value={consumerFeedback}
                    onChange={(e) => setConsumerFeedback(e.target.value)}
                    rows="3" 
                    className="w-full p-2 border-none rounded-lg resize-none text-sm focus:ring-2 focus:outline-none transition-shadow duration-200" 
                    style={{ 
                        backgroundColor: COLORS.CARD_BG, 
                        color: COLORS.TEXT_PRIMARY,
                        '--tw-ring-color': `${COLORS.PRIMARY_ACCENT}80`,
                        boxShadow: `0 1px 3px ${COLORS.BORDER}`
                    }}
                    placeholder="Edit customer concern here..."
                ></textarea>
            </div>
            
            <div className="flex justify-end">
                 <button
                    onClick={handleDraftResponse}
                    disabled={loading}
                    className="font-extrabold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0 text-base"
                    style={{ backgroundColor: COLORS.PRIMARY_ACCENT, color: COLORS.CARD_BG, boxShadow: `0 4px 15px ${COLORS.PRIMARY_ACCENT}60` }}
                >
                    {loading ? (<><Loader size={20} className="animate-spin" /><span>Drafting...</span></>) : (<><FileText size={20} /><span>Generate AI Response</span></>)}
                </button>
            </div>


            {/* AI Draft Bubble - Output */}
            <div className="p-4 rounded-xl rounded-tr-none shadow-xl w-full border-l-4 mt-4" style={{ backgroundColor: COLORS.INPUT_BG, color: COLORS.TEXT_PRIMARY, borderColor: COLORS.SECONDARY_ACCENT }}>
                <h4 className="font-semibold text-xs mb-2 flex items-center uppercase tracking-widest" style={{ color: COLORS.SECONDARY_ACCENT }}>
                    <Bot size={16} className="mr-1" />
                    AI Drafted Reply:
                </h4>
                <div className="min-h-[100px] p-1 overflow-y-auto w-full min-w-0">
                    <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.TEXT_MUTED }}>{draftedResponse || "The AI will generate a draft, verifying the shipment logs to provide a transparent, reassuring reply to the customer."}</p>
                </div>
            </div>
        </div>
    );
};

const TTSTool = ({ shipmentData, COLORS }) => {
    const isCritical = isTempCritical || (realTemp ?? shipmentData.currentReadings.temp) < shipmentData.criticalThresholds.tempMin || (realTemp ?? shipmentData.currentReadings.temp) > shipmentData.criticalThresholds.tempMax;
    const defaultMessage = isCritical 
        ? `CRITICAL ALERT. Temperature deviation in Batch ${shipmentData.batchId} requires immediate action by the Logistics Manager.`
        : `Routine check passed. Batch ${shipmentData.batchId} is on schedule.`;

    const [ttsText, setTtsText] = useState(defaultMessage);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState("Ready");

    useEffect(() => {
        const isCriticalUpdate = isTempCritical || (realTemp ?? shipmentData.currentReadings.temp) < shipmentData.criticalThresholds.tempMin || (realTemp ?? shipmentData.currentReadings.temp) > shipmentData.criticalThresholds.tempMax;
        const updatedDefaultMessage = isCriticalUpdate ? `CRITICAL ALERT. Temperature deviation in Batch ${shipmentData.batchId} requires immediate action by the Logistics Manager.` : `Routine check passed. Batch ${shipmentData.batchId} is on schedule.`;
        
        setTtsText(updatedDefaultMessage);
        setAudioUrl(null);
        setPlaybackStatus("Ready");
    }, [shipmentData.batchId, shipmentData.alerts, shipmentData.currentReadings.temp, shipmentData.criticalThresholds.tempMin, shipmentData.criticalThresholds.tempMax]);

    const audio = audioUrl ? new Audio(audioUrl) : null;

    const handleGenerateTTS = async () => {
        if (!API_KEY) { setPlaybackStatus("ERROR: API Key is required."); return; }
        if (!ttsText.trim()) return;

        setLoading(true); setPlaybackStatus("Generating audio..."); setAudioUrl(null);

        const toneInstruction = isCritical ? "Say in a clear, authoritative, and urgent voice:" : "Say in a clear, calm, and professional voice:";
        const prompt = `${toneInstruction} ${ttsText}`;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;

        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } } };

        try {
            const result = await fetchWithRetry(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const base64Audio = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (base64Audio) {
                const sampleRate = 24000;
                const pcmData = base64ToArrayBuffer(base64Audio);
                const pcm16 = new Int16Array(pcmData);
                const wavBlob = pcmToWav(pcm16, sampleRate); 
                const url = URL.createObjectURL(wavBlob);
                setAudioUrl(url);
                setPlaybackStatus("Audio generated. Ready to play.");
            } else {
                 setPlaybackStatus("Generation failed: No audio data returned.");
            }

        } catch (error) {
            setPlaybackStatus("Error: Failed to generate audio.");
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = () => {
        if (audio) {
            setPlaybackStatus("Playing audio...");
            audio.play();
            audio.onended = () => setPlaybackStatus("Audio generated. Ready to play.");
            audio.onerror = (e) => setPlaybackStatus("Playback error.");
        }
    };

    return (
        <div className="space-y-6 p-6 rounded-b-xl w-full" style={{ backgroundColor: COLORS.CARD_BG }}>
            <label className="block text-sm font-semibold uppercase tracking-wider" style={{ color: COLORS.TEXT_PRIMARY }}>Alert Message Content:</label>
            <input
                type="text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                className="w-full p-4 border rounded-xl shadow-inner focus:ring-2 focus:outline-none transition-shadow duration-200"
                style={{ 
                    backgroundColor: COLORS.INPUT_BG, 
                    borderColor: COLORS.BORDER, 
                    color: COLORS.TEXT_PRIMARY,
                    '--tw-ring-color': `${COLORS.ALERT_ACCENT}80`
                }}
                placeholder="Enter alert text..."
            />

            <div className="flex space-x-4 mt-4 w-full">
                <button
                    onClick={handleGenerateTTS}
                    disabled={loading}
                    className="flex-grow font-extrabold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0"
                    style={{ backgroundColor: COLORS.PRIMARY_ACCENT, color: COLORS.CARD_BG, boxShadow: `0 4px 15px ${COLORS.PRIMARY_ACCENT}60` }}
                >
                    {loading ? (<><Loader size={20} className="animate-spin" /><span>Generating...</span></>) : (<><Mic size={20} /><span>Generate Audio File</span></>)}
                </button>
                <button
                    onClick={handlePlay}
                    disabled={!audioUrl || loading || playbackStatus.includes("Playing")}
                    className="w-20 font-bold py-4 rounded-xl shadow-xl transition-all duration-200 disabled:opacity-30 hover:shadow-2xl transform hover:scale-[1.05] active:scale-100"
                    style={{ backgroundColor: COLORS.ALERT_ACCENT, color: COLORS.CARD_BG, boxShadow: `0 4px 15px ${COLORS.ALERT_ACCENT}60` }}
                >
                    <Play size={20} className="mx-auto" />
                </button>
            </div>
            
            <div className="mt-6 p-4 rounded-xl shadow-inner text-sm text-center font-mono border min-h-[60px] flex items-center justify-center w-full" style={{ backgroundColor: COLORS.INPUT_BG, borderColor: COLORS.BORDER }}>
                <p className="font-semibold" style={{ color: playbackStatus.includes("Error") ? COLORS.ALERT_ACCENT : COLORS.TEXT_MUTED }}>Status: <span className="ml-1 font-bold" style={{ color: COLORS.TEXT_PRIMARY }}>{playbackStatus}</span></p>
            </div>
        </div>
    );
};


// --- Main Application Component ---

const App = () => {
    const defaultBatchId = "IMMULINK-VX-4521-A"; 
    const [theme, setTheme] = useState('dark'); // Default to dark theme
    const { shipmentData, loading, error, setBatchId } = useImmulinkData(defaultBatchId);
    const [batchInput, setBatchInput] = useState(defaultBatchId);
    const [activeTool, setActiveTool] = useState('Draft'); 
    const [isMounted, setIsMounted] = useState(false); 
    const [realTemp, setRealTemp] = useState(null);
    const [temperatureHistory, setTemperatureHistory] = useState([]);
    const [realHistory, setRealHistory] = useState([]);
    const [userAddress, setUserAddress] = useState(null);
const fallbackTemp =
  shipmentData?.currentReadings?.temp ?? null;

const effectiveTemp =
  realTemp !== null ? realTemp : fallbackTemp;

const effectiveHistory =
  realHistory.length
    ? realHistory
    : shipmentData?.history ?? [];

const isTempCritical =
  effectiveTemp !== null &&
  (effectiveTemp < 2 || effectiveTemp > 8);

  const operationalStatus = isTempCritical
  ? "CRITICAL: Temperature Out of Safe Range"
  : "SECURE: Cold Chain Within Limits";
const healthScore = (() => {
  if (effectiveTemp === null) return 100;

  if (effectiveTemp < 2 || effectiveTemp > 8) return 40;
  if (effectiveTemp < 3 || effectiveTemp > 7) return 70;

  return 95;
})();


const fetchTemperatureHistory = async () => {
    if (!userAddress) return;
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const count = await contract.getTemperatureCount(userAddress);
    const total = Number(count);

    if (total === 0) {
      setRealHistory([]);
      return;
    }

    const records = [];

    for (let i = 0; i < total; i++) {
      const rec = await contract.getTemperatureRecord(userAddress, i);
      records.push({
        id: i + 1,
        location: "On-chain Sensor",
        temp: Number(rec[1]),
        time: new Date(Number(rec[0]) * 1000).toLocaleTimeString(),
        alert: Number(rec[1]) < 2 || Number(rec[1]) > 8
      });
    }

    setRealHistory(records);
  } catch (err) {
    console.error("Failed to fetch temperature history", err);
  }
};
   
const fetchLatestTemperature = async () => {
    if (!userAddress) return;
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    const count = await contract.getTemperatureCount(userAddress);
    const total = Number(count);

    if (total === 0) return;

    const latest = await contract.getTemperatureRecord(userAddress, total - 1);
    setRealTemp(Number(latest[1]));
  } catch (err) {
    console.error("Fetch latest temp failed", err);
  }
};
const connectWallet = async () => {
  if (!window.ethereum) {
    alert("MetaMask not found");
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  setUserAddress(accounts[0]);
};
useEffect(() => {
  connectWallet();
}, []);

useEffect(() => {
  fetchLatestTemperature();
  fetchTemperatureHistory();
}, [userAddress]);




    const [isLandingPageActive, setIsLandingPageActive] = useState(true); // New state for landing page
    const COLORS = THEMES[theme];

    // Placeholder image URL for the overall background (Updated to new theme)
    const BG_IMAGE_URL = theme === 'dark' 
        ? 'https://placehold.co/1920x1080/05031E/FF0080?text=IMMULINK+COLD+CHAIN+DASHBOARD+%7C+NEON+NETWORK' 
        : 'https://placehold.co/1920x1080/FFFFFF/3B82F6?text=IMMULINK+COLD+CHAIN+DASHBOARD+%7C+LAB+MONITORING';


    useEffect(() => {
        // Only start mount transition for dashboard after landing page is gone
        if (!isLandingPageActive) {
            const timer = setTimeout(() => setIsMounted(true), 100); 
            return () => clearTimeout(timer);
        }
    }, [isLandingPageActive]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };
    
    const handleAccessDashboard = () => {
        setIsLandingPageActive(false);
    };

    const handleTraceBatch = () => {
        if (!batchInput.trim()) return;
        setBatchId(batchInput.trim());
    };

    const renderAITool = () => {
        if (!shipmentData) return <div className="p-6 text-center text-gray-500" style={{ color: COLORS.TEXT_MUTED }}>Load shipment data first to use AI tools.</div>;
        switch (activeTool) {
            case 'Risk':
                return <RiskAnalysisTool shipmentData={shipmentData} COLORS={COLORS} />;
            case 'Draft':
                return <ResponseDraftingTool shipmentData={shipmentData} COLORS={COLORS} realTemp={realTemp} isTempCritical={isTempCritical} />;
            case 'TTS':
                return <TTSTool shipmentData={shipmentData} COLORS={COLORS} />;
            default:
                return <ResponseDraftingTool shipmentData={shipmentData} COLORS={COLORS} realTemp={realTemp} isTempCritical={isTempCritical} />;
        }
    };
    
    // --- Render Landing Page or Dashboard ---
    if (isLandingPageActive) {
        return <LandingPage COLORS={COLORS} onAccess={handleAccessDashboard} isLandingPageActive={isLandingPageActive} />;
    }

    if (loading) {
        return (
             <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: COLORS.BACKGROUND, color: COLORS.TEXT_PRIMARY }}>
                <div className="text-center p-10 rounded-xl shadow-2xl" style={{ backgroundColor: COLORS.CARD_BG }}>
                    <Loader size={40} className="animate-spin mx-auto mb-4" style={{ color: COLORS.PRIMARY_ACCENT }} />
                    <p className="text-xl font-semibold">LOADING SHIPMENT DATA...</p>
                    <p className="text-sm mt-2" style={{ color: COLORS.TEXT_MUTED }}>Tracing Batch ID: {batchInput}</p>
                </div>
            </div>
        );
    }
    
    if (error || !shipmentData) {
        return (
             <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: COLORS.BACKGROUND, color: COLORS.TEXT_PRIMARY }}>
                <div className="text-center p-10 rounded-xl shadow-2xl border-l-8" style={{ backgroundColor: COLORS.CARD_BG, borderColor: COLORS.ALERT_ACCENT }}>
                    <AlertTriangle size={40} className="mx-auto mb-4" style={{ color: COLORS.ALERT_ACCENT }} />
                    <p className="text-xl font-bold">ERROR: TRACE FAILED</p>
                    <p className="text-base mt-2" style={{ color: COLORS.TEXT_MUTED }}>{error || "No shipment data available."}</p>
                    <button 
                        onClick={() => setBatchId(defaultBatchId)} 
                        className="mt-6 px-6 py-3 text-sm font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5" 
                        style={{ backgroundColor: COLORS.PRIMARY_ACCENT, color: COLORS.CARD_BG }}
                    >
                        Load Default Batch
                    </button>
                </div>
            </div>
        );
    }

    const overallAlert = isTempCritical || (realTemp ?? shipmentData.currentReadings.temp) < shipmentData.criticalThresholds.tempMin || (realTemp ?? shipmentData.currentReadings.temp) > shipmentData.criticalThresholds.tempMax;
    const alertColor = overallAlert ? COLORS.ALERT_ACCENT : COLORS.SECONDARY_ACCENT;

    // Fixed background for cinematic look (Image + heavy overlay for text contrast)
    const backgroundStyle = {
        backgroundImage: `url('${BG_IMAGE_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
    };

    // inside App component, where you currently have `return (`
return (
        <div
                className="min-h-screen w-full bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${COLORS.BG_IMAGE})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundBlendMode: "overlay",
                }}
        >
    <AnimatedBackground />
      <div className="max-w-screen-xl mx-auto w-full">
        {/* ...rest of your dashboard content stays unchanged... */}

                    
                    {/* 1. Project Mission Header & Control Bar (The 'Featured' Banner) */}
                    <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-10 p-6 rounded-xl shadow-2xl w-full transition-shadow duration-300 border-b-4`} 
                        style={{ 
                            backgroundColor: COLORS.CARD_BG, 
                            borderColor: COLORS.PRIMARY_ACCENT, 
                            boxShadow: COLORS.SHADOW_DEFAULT,
                            border: `1px solid ${COLORS.BORDER}`
                        }}>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-extrabold flex items-center space-x-2" style={{ color: COLORS.PRIMARY_ACCENT }}>
                                <Package size={32} />
                                <span className="tracking-wider">IMMULINK COLD CHAIN ASSURANCE</span>
                            </h1>
                            <p className="text-base font-medium pl-10 italic max-w-4xl" style={{ color: COLORS.TEXT_MUTED }}>
                                <span className="font-bold uppercase" style={{ color: alertColor }}>MISSION CRITICAL:</span> Securely trace sensitive biomedical shipments using immutable Blockchain records, real-time IoT sensors, and predictive AI analytics to guarantee viability from manufacturing to patient.
                            </p>
                        </div>
                        <div className="flex items-center space-x-4 mt-6 sm:mt-0">
                            <div className="text-right p-3 px-4 rounded-xl border shadow-inner text-sm transition-colors duration-300" style={{ backgroundColor: COLORS.INPUT_BG, borderColor: COLORS.BORDER, boxShadow: COLORS.SHADOW_DEFAULT }}>
                                <p className="font-bold text-lg" style={{ color: COLORS.TEXT_PRIMARY }}>{shipmentData.batchId}</p>
                                <p className="text-xs font-semibold" style={{ color: COLORS.TEXT_MUTED }}>Last Log: {shipmentData.timeSinceLastUpdate}</p>
                            </div>
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} COLORS={COLORS} />
                        </div>
                    </header>

                    {/* Main Grid Content (Smooth Fade Animation + Responsive Grid) */}
                    <div
                    className={`grid auto-rows-auto grid-cols-1 lg:grid-cols-[40%_60%] gap-10 w-full ${
                        isMounted ? "opacity-100" : "opacity-0"
                    }`}
                    >
               
                        {/* LEFT PANEL: AI Intelligence Suite (1/3 width) - Now includes image module */}
                        <div className="h-full w-full min-w-0 rounded-xl shadow-2xl overflow-hidden transition-shadow duration-300"
                            style={{ backgroundColor: COLORS.CARD_BG, boxShadow: COLORS.SHADOW_DEFAULT, border: `1px solid ${COLORS.BORDER}` }}
                        >
                            
                            <AiImageModule COLORS={COLORS} />

                            <AiToolSelector activeTool={activeTool} setActiveTool={setActiveTool} COLORS={COLORS} />

                            <div className="w-full">
                                {renderAITool()}
                            </div>
                        </div>
                        
                        {/* RIGHT PANEL: Data Dashboard (2/3 width) - The 'Metrics Grid' */}
                        <div className="grid grid-cols-1 gap-10">
                            
                            {/* Batch Tracing Input */}
                            <BatchTracingInput 
                                batchInput={batchInput}
                                setBatchInput={setBatchInput}
                                handleTraceBatch={handleTraceBatch}
                                loading={loading}
                                COLORS={COLORS}
                            />

                            {/* Section: Real-Time Sensor Metrics (Metrics Card Group) */}
                            <div className="w-full">
                                <h2 className="text-xl font-extrabold mb-4 flex items-center space-x-2" style={{ color: COLORS.TEXT_PRIMARY }}>
                                    <Shield size={24} style={{ color: COLORS.SECONDARY_ACCENT }}/>
                                    <span>REAL-TIME SENSOR METRICS</span>
                                </h2>
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                                    <DataCard title="Current Temp" value={`${effectiveTemp}°C`} icon={Thermometer} color={overallAlert ? COLORS.ALERT_ACCENT : COLORS.SECONDARY_ACCENT} alert={overallAlert} detail={`Threshold: ${shipmentData.criticalThresholds.tempMin}-${shipmentData.criticalThresholds.tempMax}°C`} COLORS={COLORS} />
                                    <DataCard title="Humidity" value={`${shipmentData.currentReadings.humidity}%`} icon={Droplet} color={COLORS.PRIMARY_ACCENT} detail={"Optimal levels"} COLORS={COLORS} />
                                    <DataCard title="Alerts Logged" value={isTempCritical ? 1 : 0} icon={Bell} color={COLORS.ALERT_ACCENT} alert={overallAlert} detail={overallAlert ? "Review Log NOW" : "All Clear"} COLORS={COLORS} />
                                    <DataCard title="Blockchain Ver." value={"Active"} icon={CheckCircle} color={COLORS.SECONDARY_ACCENT} detail={"Immutable Audit Trail"} COLORS={COLORS} />
                                </div>
                            </div>
                            

                          <div className="w-full">
                            {/* ensure this parent contains everything so backgrounds stay consistent */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full items-start">

                              {/* LEFT COLUMN (lg: 1 / 3) - Current Status + Predictive Score */}
                              <div className="space-y-6 lg:col-span-1 flex flex-col items-stretch">
                                {/* Current Status - small card */}
                                <div className="w-full h-full">
                                  <CurrentStatusBox
                                    shipmentData={shipmentData}
                                    COLORS={COLORS}
                                    overallAlert={overallAlert}
                                    alertColor={alertColor}
                                  />
                                </div>

                                {/* Predictive Health Score - small card (keeps same vertical flow) */}
                                <div className="w-full">
                                  <PredictiveHealthScoreCard
                                    score={healthScore}
                                    COLORS={COLORS}
                                  />
                                </div>
                              </div>

                              {/* MIDDLE/RIGHT area (lg: col-span-2) - Map + Traceability Table */}
                              <div className="md:col-span-1 lg:col-span-2 flex flex-col items-stretch space-y-6">
                                {/* Traceability Image / Map (top of right column) */}
                                <div className="w-full">
                                  {/* give the map a stable min-height to avoid layout shifts */}
                                  <div style={{ minHeight: 220 }} className="h-full">
                                    <TraceabilityImageModule
                                      shipmentData={shipmentData}
                                      COLORS={COLORS}
                                    />
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>

                    </div>
                    <div className="w-full mt-16">
                        <ShipmentHistoryTable
                            history={effectiveHistory}
                            COLORS={COLORS}
                        />

                        {/* subtle divider between table & footer */}
                        <div className="w-full h-px mt-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                </div>
            </div>
        
    );
};

export default App;