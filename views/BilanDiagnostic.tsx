
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Assessment } from '../types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { exportEvaluationToPDF } from '../src/utils/pdfExport';
import { FileDown } from 'lucide-react';

// Silhouette SVG de base pour le fallback immédiat
const SVG_BODY_SILHOUETTE = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="white"/>
  <!-- Face -->
  <g transform="translate(100, 50) scale(0.8)">
    <circle cx="100" cy="40" r="25" fill="none" stroke="#cbd5e1" stroke-width="2"/>
    <path d="M100 65 L100 180 M70 80 L130 80 M100 180 L70 280 M100 180 L130 280" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <path d="M70 80 L60 160 M130 80 L140 160" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <text x="100" y="320" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#94a3b8">FACE</text>
  </g>
  <!-- Dos -->
  <g transform="translate(350, 50) scale(0.8)">
    <circle cx="100" cy="40" r="25" fill="none" stroke="#cbd5e1" stroke-width="2"/>
    <path d="M100 65 L100 180 M70 80 L130 80 M100 180 L70 280 M100 180 L130 280" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <path d="M70 80 L60 160 M130 80 L140 160" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <text x="100" y="320" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#94a3b8">DOS</text>
  </g>
  <!-- Profil -->
  <g transform="translate(600, 50) scale(0.8)">
    <circle cx="100" cy="40" r="25" fill="none" stroke="#cbd5e1" stroke-width="2"/>
    <path d="M100 65 L100 180 M100 80 L100 80 M100 180 L90 280" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <path d="M100 80 L110 160" stroke="#cbd5e1" stroke-width="2" fill="none"/>
    <text x="100" y="320" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#94a3b8">PROFIL</text>
  </g>
</svg>
`)}`;

const DEFAULT_ANATOMICAL_IMAGE = SVG_BODY_SILHOUETTE;
const FALLBACK_IMAGE = SVG_BODY_SILHOUETTE;

const PAIN_TYPES = ['Mécanique', 'Inflammatoire', 'Neuropathique', 'Mixte'] as const;
const FREQUENCIES = ['Intermittente', 'Constante'] as const;

const JOINT_MOVEMENTS: Record<string, string[]> = {
  'Épaule': ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Rotation Interne', 'Rotation Externe'],
  'Coude': ['Flexion', 'Extension', 'Pronation', 'Supination'],
  'Poignet': ['Flexion', 'Extension', 'Inclinaison Radiale', 'Inclinaison Ulnaire'],
  'Hanche': ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Rotation Interne', 'Rotation Externe'],
  'Genou': ['Flexion', 'Extension', 'Rotation Interne', 'Rotation Externe'],
  'Cheville': ['Flexion Dorsale', 'Flexion Plantaire', 'Inversion', 'Eversion'],
  'Rachis Cervical': ['Flexion', 'Extension', 'Inclinaison Latérale', 'Rotation'],
  'Rachis Dorsal': ['Flexion', 'Extension', 'Inclinaison Latérale', 'Rotation'],
  'Rachis Lombaire': ['Flexion', 'Extension', 'Inclinaison Latérale', 'Rotation'],
};

export interface DrawingCanvasHandle {
  getDataURL: () => string | undefined;
}

export interface BodyChartHandle {
  getDrawingData: () => string | undefined;
}

const DrawingCanvas = React.forwardRef<DrawingCanvasHandle, { bgUrl: string }>(({ bgUrl }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  React.useImperativeHandle(ref, () => ({
    getDataURL: () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) return undefined;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return undefined;

      tempCtx.drawImage(maskCanvas, 0, 0);
      tempCtx.drawImage(canvas, 0, 0);
      return tempCanvas.toDataURL('image/png');
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    setIsImageLoaded(false);

    const img = new Image();
    // On évite no-referrer car certains serveurs bloquent les requêtes sans referrer
    img.src = bgUrl;
    
    img.onload = () => {
      const updateCanvas = () => {
        const container = containerRef.current;
        if (!container) return;

        const w = container.clientWidth || 800;
        const h = container.clientHeight || 500;
        
        if (w === 0 || h === 0) {
          requestAnimationFrame(updateCanvas);
          return;
        }

        canvas.width = maskCanvas.width = w;
        canvas.height = maskCanvas.height = h;

        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let drawW, drawH, drawX, drawY;

        if (imgRatio > canvasRatio) {
          drawW = w;
          drawH = w / imgRatio;
          drawX = 0;
          drawY = (h - drawH) / 2;
        } else {
          drawH = h;
          drawW = h * imgRatio;
          drawX = (w - drawW) / 2;
          drawY = 0;
        }
        
        maskCtx.clearRect(0, 0, w, h);
        maskCtx.drawImage(img, drawX, drawY, drawW, drawH);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setIsImageLoaded(true);
      };

      updateCanvas();
    };

    img.onerror = () => {
      console.warn("Erreur lors du chargement de l'image anatomique principale, tentative avec le fallback...");
      if (img.src !== FALLBACK_IMAGE) {
        img.src = FALLBACK_IMAGE;
      } else {
        setIsImageLoaded(true);
      }
    };
  }, [bgUrl]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // The transform is applied to the wrapper div.
    // We need to map screen coordinates back to the canvas internal coordinates.
    // The canvas is centered in the wrapper.
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    
    return { x, y };
  };

  const startAction = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'pan') {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setStartPan({ x: clientX - offset.x, y: clientY - offset.y });
    } else {
      setIsDrawing(true);
      const { x, y } = getCoordinates(e);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const stopAction = () => {
    setIsDrawing(false);
    setIsPanning(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning && tool === 'pan') {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setOffset({
        x: clientX - startPan.x,
        y: clientY - startPan.y
      });
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = brushSize / zoom;
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'; // Rouge clinique
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 1), 6));
    if (zoom <= 1.1) setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-inner" ref={containerRef}>
      {!isImageLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chargement du BodyChart 3D...</p>
        </div>
      )}
      
      {/* Transformation Layer */}
      <div 
        className="w-full h-full transition-transform duration-200 ease-out flex items-center justify-center"
        style={{ 
          transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
          transformOrigin: 'center center'
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
            {/* BodyChart Fixe de fond */}
            <canvas ref={maskCanvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            
            {/* Calque de Dessin Interactif */}
            <canvas
                ref={canvasRef}
                onMouseDown={startAction}
                onMouseUp={stopAction}
                onMouseMove={handleMove}
                onMouseLeave={stopAction}
                onTouchStart={startAction}
                onTouchEnd={stopAction}
                onTouchMove={handleMove}
                className={`absolute inset-0 w-full h-full touch-none ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            />
        </div>
      </div>
      
      {/* Contrôles de Zoom */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-30">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 p-1.5 rounded-2xl shadow-xl flex flex-col gap-1">
          <button type="button" onClick={() => handleZoom(0.5)} className="p-2.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
          </button>
          <button type="button" onClick={() => handleZoom(-0.5)} className="p-2.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
          </button>
          {zoom > 1 && (
             <button type="button" onClick={() => { setZoom(1); setOffset({x:0, y:0}); }} className="mt-1 py-1 bg-sky-50 text-sky-600 rounded-lg transition-all text-[9px] font-black uppercase text-center">Reset</button>
          )}
        </div>
      </div>

      {/* Barre d'outils Thérapeutique */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-2xl border border-slate-200 p-2 rounded-[2rem] shadow-2xl flex items-center gap-2 z-30">
        <button 
          type="button"
          onClick={() => setTool('pen')}
          className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${tool === 'pen' ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M7 13c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v2H7v-2z"/><path d="M9 15v5"/><path d="M15 15v5"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Localiser Douleur</span>
        </button>
        <button 
          type="button"
          onClick={() => setTool('pan')}
          className={`p-4 rounded-2xl transition-all flex items-center gap-2 ${tool === 'pan' ? 'bg-sky-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12h6m-3-3v6M3 12h6m-3-3v6m3-3v6"/><circle cx="12" cy="12" r="9"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Déplacer</span>
        </button>
        <button 
          type="button"
          onClick={() => setTool('eraser')}
          className={`p-4 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.4 4.4c1 1 1 2.5 0 3.4l-4.4 4.4"/></svg>
        </button>
        <div className="w-px h-8 bg-slate-200 mx-2"></div>
        <div className="px-4 flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase">Taille</span>
            <input 
                type="range" 
                min="5" max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 accent-red-500 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
            />
        </div>
        <div className="w-px h-8 bg-slate-200 mx-2"></div>
        <button 
          type="button"
          onClick={() => {
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          }}
          className="p-4 hover:bg-red-50 text-red-500 rounded-2xl transition-colors"
          title="Effacer tout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
});

const BodyChart = React.forwardRef<BodyChartHandle, {}>((props, ref) => {
  const { showToast } = useStore();
  const [anatomicalImage, setAnatomicalImage] = useState(DEFAULT_ANATOMICAL_IMAGE);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const hasGeneratedRef = useRef(false);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  React.useImperativeHandle(ref, () => ({
    getDrawingData: () => canvasRef.current?.getDataURL()
  }));

  const handleGenerateAIImage = async () => {
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'Medical illustration of a human body silhouette for pain mapping, front, back, and side views, minimalist clean 2D vector style, light grey outlines on a pure white background, high resolution, anatomical proportions, no shadows, no textures, professional clinical aesthetic.',
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              setAnatomicalImage(`data:image/png;base64,${part.inlineData.data}`);
              showToast("Planche anatomique générée par IA (NanoBanan)");
              return; // Exit both loops
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      showToast("Erreur lors de la génération IA");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Auto-génération au montage pour s'assurer que l'image apparaît
  useEffect(() => {
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      handleGenerateAIImage();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[16/9] mx-auto bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <DrawingCanvas ref={canvasRef} bgUrl={anatomicalImage} />
        {isGeneratingImage && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[11px] font-black text-sky-900 uppercase tracking-widest animate-pulse">Génération de la planche anatomique (IA)...</p>
            <p className="text-[10px] text-sky-600/70 font-bold uppercase tracking-tight mt-2">Utilisation de Gemini NanoBanan</p>
          </div>
        )}
      </div>
      
      <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-sky-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M7 13c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v2H7v-2z"/><path d="M9 15v5"/><path d="M15 15v5"/></svg>
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-black text-sky-900 uppercase tracking-widest">Cartographie Clinique IA (NanoBanan)</p>
          <p className="text-[10px] text-sky-600/70 font-bold uppercase tracking-tight">Illustration générée dynamiquement pour éviter les erreurs de chargement réseau.</p>
        </div>
        <button 
          type="button"
          onClick={handleGenerateAIImage}
          disabled={isGeneratingImage}
          className="px-4 py-2 bg-white border border-sky-100 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-50 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          Régénérer
        </button>
      </div>
    </div>
  );
});

const BilanDiagnostic: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { assessments, addAssessment, deleteAssessment, currentUser, patients, showToast } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const bodyChartRef = useRef<BodyChartHandle>(null);

  const patient = patients.find(p => p.id === patientId);

  const [selectedPainType, setSelectedPainType] = useState<typeof PAIN_TYPES[number]>('Mécanique');
  const [selectedFreq, setSelectedFreq] = useState<typeof FREQUENCIES[number]>('Intermittente');
  const [evaValue, setEvaValue] = useState(3);
  const [impactValue, setImpactValue] = useState(3);
  
  // Functional Evaluation State
  const [upperLimbScores, setUpperLimbScores] = useState({
    mainBouche: 2,
    mainNuque: 2,
    mainDos: 2,
    prehension: 2,
    boutonnage: 2
  });
  const [lowerLimbState, setLowerLimbState] = useState<Assessment['functional']['lowerLimb']>({
    transfert: 'Facile',
    tugTest: 10,
    appuiUnipodal: { droit: true, gauche: true },
    vitesseMarche: 1.0,
    escaliers: 'Alterné'
  });
  const [conclusionState, setConclusionState] = useState<Assessment['functional']['conclusion']>({
    autonomie: 'Indépendant',
    risqueChute: 'Faible'
  });

  const [muscleTests, setMuscleTests] = useState<Omit<Assessment['muscleTests'][0], 'id'>[]>([
    { muscle: '', side: 'Bilatéral', force: 3, contracture: false }
  ]);

  const [jointTests, setJointTests] = useState<Omit<Assessment['jointTests'][0], 'id'>[]>([
    { joint: 'Genou', side: 'Droite', movement: 'Amplitude', value: 90, activeAmplitude: 90, passiveAmplitude: 95, mobilityQuality: 'Normal', reference: 140 }
  ]);

  const [enabledSections, setEnabledSections] = useState({
    pain: true,
    painBodyChart: true,
    painEVA: true,
    painNature: true,
    painFactors: true,
    muscle: true,
    joint: true,
    functional: true,
    functionalUpperLimb: true,
    functionalLowerLimb: true,
    functionalTransfert: true,
    functionalTug: true,
    functionalAppui: true,
    functionalVitesse: true,
    functionalEscaliers: true,
    functionalConclusion: true,
    functionalAutonomie: true,
    functionalRisqueChute: true,
    functionalScoreGlobal: true,
  });

  const SectionToggle = ({ id, label, checked, onChange, small = false }: { id: string, label: string, checked: boolean, onChange: (val: boolean) => void, small?: boolean }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 transition-all ${checked ? 'text-slate-900' : 'text-slate-300'}`}
    >
      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white border-slate-200'}`}>
        {checked && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <span className={`${small ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-widest`}>
        {checked ? 'Activé' : 'Désactivé'}
      </span>
    </button>
  );

  const addMuscleTest = () => {
    setMuscleTests([...muscleTests, { muscle: '', side: 'Bilatéral', force: 3, contracture: false }]);
  };

  const removeMuscleTest = (index: number) => {
    setMuscleTests(muscleTests.filter((_, i) => i !== index));
  };

  const updateMuscleTest = (index: number, field: keyof typeof muscleTests[0], value: any) => {
    const newTests = [...muscleTests];
    newTests[index] = { ...newTests[index], [field]: value };
    setMuscleTests(newTests);
  };

  const addJointTest = () => {
    setJointTests([...jointTests, { joint: 'Genou', side: 'Droite', movement: 'Flexion', value: 90, activeAmplitude: 90, passiveAmplitude: 95, mobilityQuality: 'Normal', reference: 140 }]);
  };

  const removeJointTest = (index: number) => {
    setJointTests(jointTests.filter((_, i) => i !== index));
  };

  const updateJointTest = (index: number, field: keyof typeof jointTests[0], value: any) => {
    const newTests = [...jointTests];
    newTests[index] = { ...newTests[index], [field]: value };
    if (field === 'joint') {
      newTests[index].movement = JOINT_MOVEMENTS[value as string]?.[0] || 'Flexion';
    }
    if (field === 'activeAmplitude') {
      newTests[index].value = value;
    }
    setJointTests(newTests);
  };

  const patientAssessments = assessments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const initialBilan = patientAssessments.find(a => a.type === 'Initial');
  const finalBilan = patientAssessments.find(a => a.type === 'Final') || patientAssessments[patientAssessments.length - 1];

  const handleExportPDF = () => {
    if (!patient || !finalBilan) {
      showToast("Données insuffisantes pour l'export PDF");
      return;
    }
    exportEvaluationToPDF(patient, finalBilan);
    showToast("PDF généré avec succès");
  };

  const getGlobalScore = (bilan: Assessment) => {
    const painScore = (10 - bilan.pain.eva) * 10;
    const muscleScore = bilan.muscleTests.length > 0 
      ? (bilan.muscleTests.reduce((acc, m) => acc + m.force, 0) / (bilan.muscleTests.length * 5)) * 100 
      : 0;
    const jointScore = bilan.jointTests.length > 0
      ? (bilan.jointTests.reduce((acc, j) => acc + (j.activeAmplitude || j.value), 0) / (bilan.jointTests.length * 180)) * 100
      : 0;
    const functionalScore = bilan.functional.score;
    const autonomyScore = (bilan.functional.upperLimb.total * 10);
    return ((painScore * 0.2 + (muscleScore || 0) * 0.2 + (jointScore || 0) * 0.2 + functionalScore * 0.2 + autonomyScore * 0.2)).toFixed(0);
  };

  const getMuscleScore = (bilan?: Assessment) => {
    if (!bilan || bilan.muscleTests.length === 0) return 0;
    return (bilan.muscleTests.reduce((acc, m) => acc + m.force, 0) / (bilan.muscleTests.length * 5)) * 100;
  };

  const getJointScore = (bilan?: Assessment) => {
    if (!bilan || bilan.jointTests.length === 0) return 0;
    return (bilan.jointTests.reduce((acc, j) => acc + (j.activeAmplitude || j.value), 0) / (bilan.jointTests.length * 180)) * 100;
  };

  const radarData = [
    { subject: 'Douleur', A: initialBilan ? (10 - initialBilan.pain.eva) * 10 : 0, B: finalBilan ? (10 - finalBilan.pain.eva) * 10 : 0, fullMark: 100, enabled: (initialBilan?.enabledSections?.pain !== false) || (finalBilan?.enabledSections?.pain !== false) },
    { subject: 'Musculaire', A: getMuscleScore(initialBilan), B: getMuscleScore(finalBilan), fullMark: 100, enabled: (initialBilan?.enabledSections?.muscle !== false) || (finalBilan?.enabledSections?.muscle !== false) },
    { subject: 'Articulaire', A: getJointScore(initialBilan), B: getJointScore(finalBilan), fullMark: 100, enabled: (initialBilan?.enabledSections?.joint !== false) || (finalBilan?.enabledSections?.joint !== false) },
    { subject: 'Fonctionnel', A: initialBilan ? (initialBilan.functional.score) : 0, B: finalBilan ? (finalBilan.functional.score) : 0, fullMark: 100, enabled: (initialBilan?.enabledSections?.functional !== false) || (finalBilan?.enabledSections?.functional !== false) },
    { subject: 'Autonomie', A: initialBilan ? (initialBilan.functional.upperLimb.total * 10) : 0, B: finalBilan ? (finalBilan.functional.upperLimb.total * 10) : 0, fullMark: 100, enabled: (initialBilan?.enabledSections?.functionalUpperLimb !== false) || (finalBilan?.enabledSections?.functionalUpperLimb !== false) },
  ].filter(d => d.enabled);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const drawingData = bodyChartRef.current?.getDrawingData();
    
    const newBilan: Omit<Assessment, 'id'> = {
      patientId,
      therapistId: currentUser?.id,
      date: new Date().toISOString().split('T')[0],
      type: isFinal ? 'Final' : 'Initial',
      enabledSections,
      pain: enabledSections.pain ? {
        eva: enabledSections.painEVA ? evaValue : 0,
        type: enabledSections.painNature ? selectedPainType : 'Mécanique',
        impact: impactValue,
        localisation: enabledSections.painBodyChart ? (drawingData ? [drawingData] : ['BODYCHART_DRAWING_3D_HD']) : [],
        frequency: selectedFreq,
        aggravatingFactors: enabledSections.painFactors ? (formData.get('aggravating') as string) : '',
        relievingFactors: enabledSections.painFactors ? (formData.get('relieving') as string) : '',
      } : {
        eva: 0,
        type: 'Mécanique',
        impact: 0,
        localisation: [],
        frequency: 'Intermittente',
        aggravatingFactors: '',
        relievingFactors: '',
      },
      muscleTests: enabledSections.muscle ? muscleTests.map(t => ({ ...t, muscle: t.muscle || 'Non spécifié' })) : [],
      jointTests: enabledSections.joint ? jointTests.map(t => ({ ...t })) : [],
      functional: enabledSections.functional ? {
        score: enabledSections.functionalScoreGlobal ? Number(formData.get('f_score')) : 0,
        upperLimb: enabledSections.functionalUpperLimb ? {
          ...upperLimbScores,
          total: (Object.values(upperLimbScores) as number[]).reduce((a, b) => a + b, 0)
        } : { mainBouche: 2, mainNuque: 2, mainDos: 2, prehension: 2, boutonnage: 2, total: 10 },
        lowerLimb: {
          transfert: enabledSections.functionalTransfert ? lowerLimbState.transfert : 'Facile',
          tugTest: enabledSections.functionalTug ? lowerLimbState.tugTest : 10,
          appuiUnipodal: enabledSections.functionalAppui ? lowerLimbState.appuiUnipodal : { droit: true, gauche: true },
          vitesseMarche: enabledSections.functionalVitesse ? lowerLimbState.vitesseMarche : 1.0,
          escaliers: enabledSections.functionalEscaliers ? lowerLimbState.escaliers : 'Alterné',
        },
        conclusion: {
          autonomie: enabledSections.functionalAutonomie ? conclusionState.autonomie : 'Indépendant',
          risqueChute: enabledSections.functionalRisqueChute ? conclusionState.risqueChute : 'Faible',
        }
      } : {
        score: 0,
        upperLimb: { mainBouche: 2, mainNuque: 2, mainDos: 2, prehension: 2, boutonnage: 2, total: 10 },
        lowerLimb: { transfert: 'Facile', tugTest: 10, appuiUnipodal: { droit: true, gauche: true }, vitesseMarche: 1.0, escaliers: 'Alterné' },
        conclusion: { autonomie: 'Indépendant', risqueChute: 'Faible' }
      }
    };

    addAssessment(newBilan);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            Dossier de Bilans
          </h3>
          <p className="text-sm text-slate-400 font-medium italic">Cartographie clinique haute fidélité (Face, Dos, Profil).</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => { setShowForm(true); setIsFinal(patientAssessments.length > 0); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            {patientAssessments.length > 0 ? 'Faire le Bilan de Sortie' : 'Nouveau Bilan Initial'}
          </button>
        )}
      </header>

      {/* Historique des Bilans */}
      {!showForm && patientAssessments.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historique des Bilans</h4>
            <span className="text-xs font-bold text-slate-400">{patientAssessments.length} bilan(s) enregistré(s)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientAssessments.map(bilan => (
              <div key={bilan.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-black text-sky-600 uppercase tracking-widest">{bilan.type}</p>
                    <p className="text-[10px] font-bold text-slate-400">{bilan.date}</p>
                  </div>
                  <button 
                    onClick={() => deleteAssessment(bilan.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Supprimer ce bilan"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">EVA</p>
                    <p className="text-sm font-black text-red-600">{bilan.pain.eva}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Score</p>
                    <p className="text-sm font-black text-slate-900">{getGlobalScore(bilan)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl space-y-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center border-b border-slate-100 pb-6">
            <div>
              <h4 className="font-black text-3xl text-slate-900 tracking-tight">Saisie Clinique • {isFinal ? 'Bilan Final' : 'Bilan Initial'}</h4>
              <p className="text-sm text-slate-400 mt-1">Utilisez les outils de dessin sur le BodyChart 3D ci-dessous.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="space-y-16">
            {enabledSections.pain && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-6">
                <SectionToggle 
                  id="pain" 
                  label="Douleur" 
                  checked={enabledSections.pain} 
                  onChange={(val) => setEnabledSections(prev => ({ ...prev, pain: val }))} 
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-red-100">1</div>
                  <div>
                    <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Topographie & Symptômes</h5>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Marquez précisément les zones de douleur.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <SectionToggle 
                    id="painBodyChart" 
                    label="BodyChart" 
                    checked={enabledSections.painBodyChart} 
                    onChange={(val) => setEnabledSections(prev => ({ ...prev, painBodyChart: val }))} 
                    small
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localisation 3D</span>
                </div>
                {enabledSections.painBodyChart && <BodyChart ref={bodyChartRef} />}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100/50">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <SectionToggle 
                        id="painEVA" 
                        label="EVA" 
                        checked={enabledSections.painEVA} 
                        onChange={(val) => setEnabledSections(prev => ({ ...prev, painEVA: val }))} 
                        small
                      />
                      <label className="text-sm font-black text-slate-700 flex justify-between items-end flex-1">
                        <span className="uppercase tracking-widest">Intensité (EVA)</span>
                        {enabledSections.painEVA && <span className="text-red-600 text-4xl font-black">{evaValue}<span className="text-sm text-slate-300">/10</span></span>}
                      </label>
                    </div>
                    {enabledSections.painEVA && (
                      <input type="range" min="0" max="10" value={evaValue} onChange={(e) => setEvaValue(Number(e.target.value))} className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-red-600 shadow-inner" />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <SectionToggle 
                        id="painNature" 
                        label="Nature" 
                        checked={enabledSections.painNature} 
                        onChange={(val) => setEnabledSections(prev => ({ ...prev, painNature: val }))} 
                        small
                      />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nature de la douleur</label>
                    </div>
                    {enabledSections.painNature && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {PAIN_TYPES.map(type => (
                        <button 
                          key={type} type="button"
                          onClick={() => setSelectedPainType(type)}
                          className={`py-3 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all ${selectedPainType === type ? 'bg-sky-600 border-sky-600 text-white shadow-xl shadow-sky-100 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <SectionToggle 
                      id="painFactors" 
                      label="Facteurs" 
                      checked={enabledSections.painFactors} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, painFactors: val }))} 
                      small
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facteurs Cliniques</span>
                  </div>
                  {enabledSections.painFactors && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Facteurs aggravants</label>
                      <textarea name="aggravating" className="w-full p-5 rounded-3xl bg-white border border-slate-100 focus:ring-4 focus:ring-sky-100 outline-none text-sm h-32 resize-none shadow-sm transition-all" placeholder="Qu'est-ce qui augmente la douleur ?"></textarea>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Facteurs soulageants</label>
                      <textarea name="relieving" className="w-full p-5 rounded-3xl bg-white border border-slate-100 focus:ring-4 focus:ring-sky-100 outline-none text-sm h-32 resize-none shadow-sm transition-all" placeholder="Qu'est-ce qui calme la douleur ?"></textarea>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </section>
            )}

            {enabledSections.muscle && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <SectionToggle 
                      id="muscle" 
                      label="Musculaire" 
                      checked={enabledSections.muscle} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, muscle: val }))} 
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-100">2</div>
                      <div>
                        <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Évaluation Musculaire</h5>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tests de force (MRC) et extensibilité.</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={addMuscleTest}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Ajouter un Test Musculaire
                  </button>
                </div>

              <div className="space-y-6">
                {muscleTests.map((test, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muscle / Groupe</label>
                      <input 
                        required
                        value={test.muscle}
                        onChange={(e) => updateMuscleTest(index, 'muscle', e.target.value)}
                        placeholder="ex: Quadriceps"
                        className="w-full px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-sky-100 font-bold text-sm shadow-sm"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Côté</label>
                      <select 
                        value={test.side}
                        onChange={(e) => updateMuscleTest(index, 'side', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-sky-100 font-bold text-sm shadow-sm"
                      >
                        <option value="Gauche">Gauche</option>
                        <option value="Droite">Droite</option>
                        <option value="Bilatéral">Bilatéral</option>
                      </select>
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Force (0-5)</label>
                      <input 
                        type="number" min="0" max="5" step="1"
                        value={test.force}
                        onChange={(e) => updateMuscleTest(index, 'force', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-sky-100 font-black text-center text-lg shadow-sm"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Périmètre (cm)</label>
                      <input 
                        type="number" min="0"
                        value={test.perimeter || ''}
                        onChange={(e) => updateMuscleTest(index, 'perimeter', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Amyotrophie"
                        className="w-full px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-sky-100 font-bold text-center text-sm shadow-sm"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extensibilité</label>
                      <input 
                        value={test.extensibility || ''}
                        onChange={(e) => updateMuscleTest(index, 'extensibility', e.target.value)}
                        placeholder="cm ou °"
                        className="w-full px-4 py-3 rounded-xl border-none focus:ring-4 focus:ring-sky-100 font-bold text-center text-sm shadow-sm"
                      />
                    </div>
                    <div className="md:col-span-1 space-y-2 flex flex-col items-center justify-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contract.</label>
                      <button
                        type="button"
                        onClick={() => updateMuscleTest(index, 'contracture', !test.contracture)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${test.contracture ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-slate-300 border border-slate-100'}`}
                      >
                        {test.contracture ? 'OUI' : 'NON'}
                      </button>
                    </div>
                    {muscleTests.length > 1 && (
                      <div className="md:col-span-1 flex items-end pb-1">
                        <button 
                          type="button"
                          onClick={() => removeMuscleTest(index)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            )}

            {enabledSections.joint && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <SectionToggle 
                      id="joint" 
                      label="Articulaire" 
                      checked={enabledSections.joint} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, joint: val }))} 
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-sky-100">3</div>
                      <div>
                        <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Évaluation Articulaire</h5>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Mesures des amplitudes et qualité de mouvement.</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={addJointTest}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Ajouter une Articulation
                  </button>
                </div>

              <div className="space-y-10">
                {jointTests.map((test, index) => (
                  <div key={index} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100/50 space-y-8 relative group">
                    {jointTests.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeJointTest(index)}
                        className="absolute top-6 right-6 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors z-10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Articulation à tester</label>
                        <div className="flex flex-wrap gap-2">
                          {['Épaule', 'Coude', 'Poignet', 'Hanche', 'Genou', 'Cheville', 'Rachis Cervical', 'Rachis Dorsal', 'Rachis Lombaire'].map((j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={() => updateJointTest(index, 'joint', j)}
                              className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${test.joint === j ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200'}`}
                            >
                              {j}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Côté</label>
                        <div className="flex gap-2">
                          {['Gauche', 'Droite', 'Bilatéral'].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateJointTest(index, 'side', s)}
                              className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${test.side === s ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mouvement</label>
                        <div className="flex flex-wrap gap-2">
                          {(JOINT_MOVEMENTS[test.joint] || ['Flexion', 'Extension']).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => updateJointTest(index, 'movement', m)}
                              className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${test.movement === m ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200'}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                            <span>Amplitude Active (°)</span>
                            <span className="text-sky-600 font-black">{test.activeAmplitude}°</span>
                          </label>
                          <input 
                            type="range" min="0" max="180" 
                            value={test.activeAmplitude} 
                            onChange={(e) => updateJointTest(index, 'activeAmplitude', Number(e.target.value))} 
                            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600" 
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                            <span>Amplitude Passive (°)</span>
                            <span className="text-sky-600 font-black">{test.passiveAmplitude}°</span>
                          </label>
                          <input 
                            type="range" min="0" max="180" 
                            value={test.passiveAmplitude} 
                            onChange={(e) => updateJointTest(index, 'passiveAmplitude', Number(e.target.value))} 
                            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-600" 
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualité de Mobilité</label>
                        <div className="grid grid-cols-1 gap-2">
                          {(['Normal', 'Gêne en début de course', 'Gêne en fin de course'] as const).map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => updateJointTest(index, 'mobilityQuality', q)}
                              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${test.mobilityQuality === q ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-sky-200'}`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </section>
            )}

            {enabledSections.functional && (
              <section className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6">
                  <SectionToggle 
                    id="functional" 
                    label="Fonctionnel" 
                    checked={enabledSections.functional} 
                    onChange={(val) => setEnabledSections(prev => ({ ...prev, functional: val }))} 
                  />
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-600 text-white rounded-[1.25rem] flex items-center justify-center font-black text-xl shadow-lg shadow-violet-100">4</div>
                    <div>
                      <h5 className="text-xl font-black text-slate-800 uppercase tracking-tight">Évaluation Fonctionnelle</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Autonomie, équilibre et risque de chute.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-12">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100/50 space-y-10">
                  <div className="flex items-center gap-6">
                    <SectionToggle 
                      id="functionalUpperLimb" 
                      label="Membre Supérieur" 
                      checked={enabledSections.functionalUpperLimb} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalUpperLimb: val }))} 
                      small
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center font-black text-lg">1</div>
                      <h6 className="text-lg font-black text-slate-800 uppercase tracking-tight">Membre Supérieur (ADL)</h6>
                    </div>
                  </div>
                  
                  {enabledSections.functionalUpperLimb && (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white animate-in fade-in slide-in-from-top-2 duration-300">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Seul (2 pts)</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aide (1 pt)</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Impossible (0 pt)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { key: 'mainBouche', label: 'Main-Bouche (Alimentation)' },
                          { key: 'mainNuque', label: 'Main-Nuque (Toilette/Coiffage)' },
                          { key: 'mainDos', label: 'Main-Dos (Hygiène intime/Habillage)' },
                          { key: 'prehension', label: 'Préhension (Saisir un verre/stylo)' },
                          { key: 'boutonnage', label: 'Boutonnage (Dextérité fine)' }
                        ].map((item) => (
                          <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-sm font-bold text-slate-700">{item.label}</td>
                            {[2, 1, 0].map((score) => (
                              <td key={score} className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setUpperLimbScores(prev => ({ ...prev, [item.key]: score }))}
                                  className={`w-8 h-8 rounded-lg border-2 transition-all ${upperLimbScores[item.key as keyof typeof upperLimbScores] === score ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-200 hover:border-sky-200'}`}
                                >
                                  {upperLimbScores[item.key as keyof typeof upperLimbScores] === score && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><polyline points="20 6 9 17 4 12"/></svg>
                                  )}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="p-4 font-black uppercase tracking-widest text-xs">TOTAL MS</td>
                          <td colSpan={3} className="p-4 text-right font-black text-xl">
                            {(Object.values(upperLimbScores) as number[]).reduce((a, b) => a + b, 0)} <span className="text-xs opacity-50">/ 10</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  )}
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100/50 space-y-10">
                  <div className="flex items-center gap-6">
                    <SectionToggle 
                      id="functionalLowerLimb" 
                      label="Membre Inférieur" 
                      checked={enabledSections.functionalLowerLimb} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalLowerLimb: val }))} 
                      small
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-lg">2</div>
                      <h6 className="text-lg font-black text-slate-800 uppercase tracking-tight">Membre Inférieur & Équilibre</h6>
                    </div>
                  </div>

                  {enabledSections.functionalLowerLimb && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalTransfert" 
                          label="Transfert" 
                          checked={enabledSections.functionalTransfert} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalTransfert: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transfert Assis-Debout</label>
                      </div>
                      {enabledSections.functionalTransfert && (
                      <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {(['Facile', 'Pénible', 'Aide humaine'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setLowerLimbState(prev => ({ ...prev, transfert: t }))}
                            className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight border-2 transition-all ${lowerLimbState.transfert === t ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalTug" 
                          label="TUG" 
                          checked={enabledSections.functionalTug} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalTug: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TUG Test (3 mètres)*</label>
                      </div>
                      {enabledSections.functionalTug && (
                      <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                        <input 
                          type="number" 
                          value={lowerLimbState.tugTest}
                          onChange={(e) => setLowerLimbState(prev => ({ ...prev, tugTest: Number(e.target.value) }))}
                          className="w-full px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-emerald-100 font-black text-xl shadow-sm"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">sec</span>
                        <p className="text-[9px] font-bold text-slate-400 italic mt-2">
                          {lowerLimbState.tugTest < 12 ? '🟢 Autonome' : lowerLimbState.tugTest > 20 ? '🔴 Fragile' : '🟡 Intermédiaire'}
                        </p>
                      </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalAppui" 
                          label="Appui" 
                          checked={enabledSections.functionalAppui} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalAppui: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appui Unipodal (10s)</label>
                      </div>
                      {enabledSections.functionalAppui && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        {(['droit', 'gauche'] as const).map((side) => (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setLowerLimbState(prev => ({ 
                              ...prev, 
                              appuiUnipodal: { ...prev.appuiUnipodal, [side]: !prev.appuiUnipodal[side] } 
                            }))}
                            className={`py-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${lowerLimbState.appuiUnipodal[side] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-300'}`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${lowerLimbState.appuiUnipodal[side] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                              {lowerLimbState.appuiUnipodal[side] && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{side === 'droit' ? 'Droit' : 'Gauche'} réussi</span>
                          </button>
                        ))}
                      </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalVitesse" 
                          label="Vitesse" 
                          checked={enabledSections.functionalVitesse} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalVitesse: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitesse de marche*</label>
                      </div>
                      {enabledSections.functionalVitesse && (
                      <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                        <input 
                          type="number" step="0.1"
                          value={lowerLimbState.vitesseMarche}
                          onChange={(e) => setLowerLimbState(prev => ({ ...prev, vitesseMarche: Number(e.target.value) }))}
                          className="w-full px-6 py-4 rounded-2xl border-none focus:ring-4 focus:ring-emerald-100 font-black text-xl shadow-sm"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">m/s</span>
                        <p className="text-[9px] font-bold text-slate-400 italic mt-2">
                          {lowerLimbState.vitesseMarche > 0.8 ? '🟢 Sécuritaire' : '🔴 Risque élevé'}
                        </p>
                      </div>
                      )}
                    </div>

                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalEscaliers" 
                          label="Escaliers" 
                          checked={enabledSections.functionalEscaliers} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalEscaliers: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montée d'escalier</label>
                      </div>
                      {enabledSections.functionalEscaliers && (
                      <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {(['Alterné', 'Un par un', 'Impossible'] as const).map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setLowerLimbState(prev => ({ ...prev, escaliers: e }))}
                            className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${lowerLimbState.escaliers === e ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>

                <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-10 shadow-2xl">
                  <div className="flex items-center gap-6">
                    <SectionToggle 
                      id="functionalConclusion" 
                      label="Conclusion" 
                      checked={enabledSections.functionalConclusion} 
                      onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalConclusion: val }))} 
                      small
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">📋</div>
                      <h6 className="text-xl font-black uppercase tracking-tight">Conclusion du Bilan Fonctionnel</h6>
                    </div>
                  </div>

                  {enabledSections.functionalConclusion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalAutonomie" 
                          label="Autonomie" 
                          checked={enabledSections.functionalAutonomie} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalAutonomie: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Niveau d'autonomie globale</label>
                      </div>
                      {enabledSections.functionalAutonomie && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {[
                          { key: 'Indépendant', label: '🟢 Indépendant', desc: 'Réalise les transferts et la marche sans aide.' },
                          { key: 'Surveillance/Aide technique', label: '🟡 Surveillance/Aide technique', desc: 'Nécessite une canne ou une présence.' },
                          { key: 'Dépendant', label: '🔴 Dépendant', desc: 'Nécessite une aide humaine systématique.' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setConclusionState(prev => ({ ...prev, autonomie: item.key as any }))}
                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${conclusionState.autonomie === item.key ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5 opacity-40 hover:opacity-60'}`}
                          >
                            <p className="font-black text-sm">{item.label}</p>
                            <p className="text-[10px] opacity-60 mt-1">{item.desc}</p>
                          </button>
                        ))}
                      </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <SectionToggle 
                          id="functionalRisqueChute" 
                          label="Risque" 
                          checked={enabledSections.functionalRisqueChute} 
                          onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalRisqueChute: val }))} 
                          small
                        />
                        <label className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Risque de chute</label>
                      </div>
                      {enabledSections.functionalRisqueChute && (
                      <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {(['Faible', 'Modéré', 'Élevé'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setConclusionState(prev => ({ ...prev, risqueChute: r }))}
                            className={`p-5 rounded-2xl border-2 font-black uppercase tracking-widest transition-all ${conclusionState.risqueChute === r ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5 opacity-40 hover:opacity-60'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      )}
                      
                      <div className="pt-6 space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                          <SectionToggle 
                            id="functionalScoreGlobal" 
                            label="Score" 
                            checked={enabledSections.functionalScoreGlobal} 
                            onChange={(val) => setEnabledSections(prev => ({ ...prev, functionalScoreGlobal: val }))} 
                            small
                          />
                          <label className="text-[10px] font-black opacity-50 uppercase tracking-widest">Score Fonctionnel Global (0-100)</label>
                        </div>
                        {enabledSections.functionalScoreGlobal && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                          <input name="f_score" type="number" min="0" max="100" defaultValue="70" className="w-full px-6 py-4 rounded-2xl bg-white/5 border-none focus:ring-4 focus:ring-white/10 font-black text-3xl text-white shadow-inner" />
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </section>
            )}
          </div>

          <div className="pt-12 flex gap-6">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 border-2 border-slate-100 rounded-[1.5rem] font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Annuler</button>
            <button type="submit" className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95">Valider Bilan Clinique</button>
          </div>
        </form>
      ) : patientAssessments.length === 0 ? (
        <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-32 text-center space-y-8 shadow-inner">
          <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <p className="text-3xl font-black text-slate-900 tracking-tight">Dossier Clinique Vide</p>
            <p className="text-slate-400 leading-relaxed font-medium">Réalisez un bilan initial pour cartographier les symptômes du patient sur le BodyChart 3D HD.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tableau de Bord Clinique</h3>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-sky-100 hover:bg-sky-700 transition-all active:scale-95"
            >
              <FileDown size={16} />
              Télécharger le Bilan (PDF)
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col items-center">
              <h4 className="w-full text-left font-black text-slate-900 mb-10 flex justify-between items-center">
                <span className="text-xl tracking-tight">Score de Rétablissement</span>
                <div className="flex gap-6">
                  <span className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest"><div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div> Initial</span>
                  <span className="flex items-center gap-2 text-[10px] font-black text-sky-500 uppercase tracking-widest"><div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> Actuel</span>
                </div>
              </h4>
              <div className="w-full h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                    <Radar name="Initial" dataKey="A" stroke="#94a3b8" strokeWidth={3} fill="#cbd5e1" fillOpacity={0.2} />
                    <Radar name="Final" dataKey="B" stroke="#0ea5e9" strokeWidth={4} fill="#0ea5e9" fillOpacity={0.4} />
                    <RechartsTooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px'}} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-300 relative overflow-hidden group">
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-black opacity-50 uppercase tracking-[0.3em]">Évolution Thérapeutique</p>
                    <div className="p-3 bg-white/5 rounded-[1.5rem] backdrop-blur-xl border border-white/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><path d="M12 2v20"/><path d="m17 17 5 5"/><path d="m7 7-5-5"/><path d="m17 7 5-5"/><path d="m7 17-5 5"/></svg>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-8xl font-black text-sky-400 tracking-tighter">+{finalBilan && initialBilan ? (Number(getGlobalScore(finalBilan)) - Number(getGlobalScore(initialBilan))) : 0}%</span>
                    <span className="text-xl opacity-60 font-black italic">de gain global</span>
                  </div>
                </div>
              </div>

              {finalBilan && finalBilan.enabledSections?.pain !== false && (
                <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl space-y-8">
                  <div className="flex items-center justify-between">
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bilan de la Douleur</h6>
                    {finalBilan.enabledSections?.painEVA !== false && (
                      <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">EVA {finalBilan.pain.eva}/10</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {finalBilan.enabledSections?.painNature !== false && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nature</p>
                        <p className="text-xs font-black text-slate-800">{finalBilan.pain.type}</p>
                      </div>
                    )}
                    {finalBilan.enabledSections?.painNature !== false && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fréquence</p>
                        <p className="text-xs font-black text-slate-800">{finalBilan.pain.frequency}</p>
                      </div>
                    )}
                  </div>

                  {finalBilan.enabledSections?.painBodyChart !== false && finalBilan.pain.localisation && finalBilan.pain.localisation[0] && finalBilan.pain.localisation[0].startsWith('data:image') && (
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Topographie de la douleur</p>
                      <div className="relative w-full aspect-[16/9] bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                        <img src={finalBilan.pain.localisation[0]} alt="Topographie de la douleur" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}

                  {finalBilan.enabledSections?.painFactors !== false && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact fonctionnel</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${finalBilan.pain.impact * 10}%` }}></div>
                          </div>
                          <span className="text-xs font-black text-slate-800">{finalBilan.pain.impact}/10</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {finalBilan && finalBilan.enabledSections?.muscle !== false && finalBilan.muscleTests.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl space-y-6">
                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Derniers Tests Musculaires</h6>
                  <div className="space-y-4">
                    {finalBilan.muscleTests.map((test, i) => (
                      <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-black text-slate-800">{test.muscle}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{test.side}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, star) => (
                                <div key={star} className={`w-2.5 h-2.5 rounded-full ${star < test.force ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                              ))}
                            </div>
                            <span className="text-xl font-black text-emerald-600">{test.force}<span className="text-[10px] text-slate-300">/5</span></span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/50">
                          <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Périmètre</p>
                            <p className="text-xs font-bold text-slate-600">{test.perimeter ? `${test.perimeter} cm` : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Extensibilité</p>
                            <p className="text-xs font-bold text-slate-600">{test.extensibility || '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contracture</p>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${test.contracture ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {test.contracture ? 'OUI' : 'NON'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {finalBilan && finalBilan.enabledSections?.joint !== false && finalBilan.jointTests.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl space-y-6">
                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dernier Bilan Articulaire</h6>
                  <div className="space-y-4">
                    {finalBilan.jointTests.map((test, i) => (
                      <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-black text-slate-800">{test.joint}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{test.side} • {test.movement}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-emerald-600">{test.activeAmplitude || test.value}°</p>
                            <p className="text-[9px] font-black text-slate-300 uppercase">Amplitude Active</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                          <div className="text-center border-r border-slate-200/50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Amplitude Passive</p>
                            <p className="text-sm font-bold text-slate-600">{test.passiveAmplitude ? `${test.passiveAmplitude}°` : '—'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qualité Mobilité</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase">{test.mobilityQuality || 'Normal'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finalBilan && finalBilan.enabledSections?.functional !== false && (
                <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl space-y-8">
                  <div className="flex items-center justify-between">
                    <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synthèse de l'Autonomie</h6>
                    {finalBilan.enabledSections?.functionalConclusion !== false && finalBilan.enabledSections?.functionalAutonomie !== false && (
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        finalBilan.functional.conclusion.autonomie === 'Indépendant' ? 'bg-emerald-100 text-emerald-600' :
                        finalBilan.functional.conclusion.autonomie === 'Dépendant' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {finalBilan.functional.conclusion.autonomie}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {finalBilan.enabledSections?.functionalUpperLimb !== false && (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Membre Supérieur (ADL)</p>
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Score ADL</span>
                            <span className="text-lg font-black text-slate-900">{finalBilan.functional.upperLimb.total}/10</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-sky-500 transition-all duration-1000" 
                              style={{ width: `${(finalBilan.functional.upperLimb.total / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {finalBilan.enabledSections?.functionalLowerLimb !== false && (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobilité & Équilibre</p>
                        <div className="grid grid-cols-2 gap-3">
                          {finalBilan.enabledSections?.functionalTug !== false && (
                            <div className="bg-slate-50 p-3 rounded-xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">TUG Test</p>
                              <p className="text-sm font-black text-slate-800">{finalBilan.functional.lowerLimb.tugTest}s</p>
                            </div>
                          )}
                          {finalBilan.enabledSections?.functionalVitesse !== false && (
                            <div className="bg-slate-50 p-3 rounded-xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Vitesse</p>
                              <p className="text-sm font-black text-slate-800">{finalBilan.functional.lowerLimb.vitesseMarche} m/s</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    {finalBilan.enabledSections?.functionalConclusion !== false && finalBilan.enabledSections?.functionalRisqueChute !== false && (
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          finalBilan.functional.conclusion.risqueChute === 'Faible' ? 'bg-emerald-500' :
                          finalBilan.functional.conclusion.risqueChute === 'Élevé' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risque de chute : {finalBilan.functional.conclusion.risqueChute}</span>
                      </div>
                    )}
                    {finalBilan.enabledSections?.functionalScoreGlobal !== false && (
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase">Score Global</p>
                        <p className="text-2xl font-black text-slate-900">{finalBilan.functional.score}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilanDiagnostic;
