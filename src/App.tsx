import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Download, 
  Image as ImageIcon, 
  Type, 
  Settings2, 
  Maximize2, 
  Palette, 
  Zap, 
  Loader2, 
  Plus, 
  Minus,
  Layout,
  Monitor,
  Smartphone,
  Square,
  Layers,
  Sparkles,
  Info,
  Menu,
  X,
  History,
  Trash2,
  Share2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Eraser,
  RefreshCw,
  Wand2,
  Scaling,
  MousePointer2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

type EditMode = 'none' | 'remove_bg' | 'remove_object' | 'restore' | 'enhance' | 'upscale_2x' | 'upscale_4x';

interface WatermarkConfig {
  text: string;
  font: string;
  size: number;
  opacity: number;
  color: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

const ASPECT_RATIO_VALUES: Record<AspectRatio, { label: string; icon: any; ratio: number }> = {
  '1:1': { label: 'Square', icon: Square, ratio: 1 },
  '3:4': { label: 'Portrait', icon: Smartphone, ratio: 3/4 },
  '4:3': { label: 'Landscape', icon: Monitor, ratio: 4/3 },
  '9:16': { label: 'Story', icon: Smartphone, ratio: 9/16 },
  '16:9': { label: 'Wide', icon: Monitor, ratio: 16/9 },
};

const STYLES = [
  { id: 'none', label: 'None', description: 'Default' },
  { id: 'surrealism', label: 'Surrealisme', description: 'Surrealisme, dream-like and bizarre' },
  { id: 'chaotic', label: 'Chaotic', description: 'Chaotic, intense and energetic' },
  { id: 'psychedelic', label: 'Psycadelic', description: 'Psycadelic, vibrant and swirling' },
  { id: 'macabre', label: 'Macabre', description: 'Macabre, dark and atmospheric' },
  { id: 'fractal', label: 'Fractal', description: 'Fractal, geometric complexity' },
  { id: 'anime', label: 'Anime', description: 'Anime, Japanese animation style' },
  { id: 'chibi-3d', label: 'Chibi 3D', description: 'Chibi 3d hyper realistis, cute and detailed' },
  { id: 'cinematic', label: 'Cinematic', description: 'Cinematic, dramatic lighting' },
  { id: 'photography', label: 'Photography', description: 'Photography, realistic' },
];

const FONTS = [
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
];

// --- Main Component ---

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Neural networks are active');
  
  const LOADING_MESSAGES = [
    'Neural networks are active',
    'Synthesizing pixels...',
    'Applying artistic filters...',
    'Optimizing resolution...',
    'Finalizing masterpiece...',
    'Almost there...',
    'Adding finishing touches...',
    'Refining details...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    
    if (isGenerating) {
      setGenerationProgress(0);
      let msgIndex = 0;
      interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[msgIndex]);
      }, 3000);

      progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) return prev;
          return prev + (Math.random() * 5);
        });
      }, 800);
    } else {
      setGenerationProgress(0);
      setLoadingMessage(LOADING_MESSAGES[0]);
    }

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [isGenerating]);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [model, setModel] = useState<'gemini-2.5-flash-image' | 'gemini-3.1-flash-image-preview'>('gemini-2.5-flash-image');
  const [history, setHistory] = useState<string[]>([]);
  const [isWatermarkPanelOpen, setIsWatermarkPanelOpen] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'default' | 'custom' | 'missing'>('default');

  useEffect(() => {
    const customKey = import.meta.env.VITE_CUSTOM_API_KEY;
    if (customKey && customKey.trim() !== '') {
      setApiKeyStatus('custom');
    } else if (!process.env.GEMINI_API_KEY) {
      setApiKeyStatus('missing');
    } else {
      setApiKeyStatus('default');
    }
  }, []);
  
  // Watermark State
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    text: 'DERY LAU AI',
    font: 'Inter',
    size: 24,
    opacity: 0.5,
    color: '#ffffff',
    position: 'bottom-right',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Image Generation Logic ---

  const generateImage = async (customPrompt?: string, sourceImage?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim() && !sourceImage) return;
    
    setIsGenerating(true);
    try {
      const customKey = import.meta.env.VITE_CUSTOM_API_KEY;
      const apiKey = customKey || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      let finalPrompt = activePrompt;
      
      // JSON Prompt Support
      try {
        const jsonPrompt = JSON.parse(activePrompt);
        if (jsonPrompt.prompt) finalPrompt = jsonPrompt.prompt;
        else if (jsonPrompt.text) finalPrompt = jsonPrompt.text;
        else if (typeof jsonPrompt === 'string') finalPrompt = jsonPrompt;
      } catch (e) {
        // Not JSON, use as is
      }

      if (selectedStyle !== 'none' && !customPrompt) {
        const styleDesc = STYLES.find(s => s.id === selectedStyle)?.description;
        finalPrompt = `${finalPrompt}. Style: ${styleDesc}`;
      }

      const contents: any = {
        parts: [{ text: finalPrompt }],
      };

      if (sourceImage) {
        contents.parts.unshift({
          inlineData: {
            data: sourceImage.split(',')[1],
            mimeType: 'image/png',
          },
        });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const newImage = `data:image/png;base64,${base64Data}`;
          setGeneratedImage(newImage);
          setHistory(prev => [newImage, ...prev].slice(0, 10));
          break;
        }
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      let errorMessage = "Failed to generate image. Please try again.";
      
      if (error.message?.includes('API key not valid')) {
        errorMessage = "The API key provided is invalid. Please check your Secret 'VITE_CUSTOM_API_KEY'.";
        if (import.meta.env.VITE_CUSTOM_API_KEY?.startsWith('sk-')) {
          errorMessage += " (Note: Your key looks like an OpenAI key, but this app uses Google Gemini)";
        }
      } else if (error.message?.includes('quota')) {
        errorMessage = "API quota exceeded. Please try again later or use a different key.";
      }
      
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async (mode: EditMode) => {
    if (!generatedImage && !uploadImage) return;
    const source = uploadImage || generatedImage;
    if (!source) return;

    let editPrompt = "";
    switch (mode) {
      case 'remove_bg':
        editPrompt = "Remove the background from this image and make it a clean, professional cutout.";
        break;
      case 'remove_object':
        editPrompt = "Remove the main object or specified distracting elements from this image and fill the area naturally.";
        break;
      case 'restore':
        editPrompt = "Restore this image, fix any artifacts, noise, or damage, and make it look new and clear.";
        break;
      case 'enhance':
        editPrompt = "Enhance this image, improve lighting, colors, and overall visual appeal.";
        break;
      case 'upscale_2x':
        editPrompt = "Upscale this image to 2x resolution while maintaining all details and sharpness.";
        break;
      case 'upscale_4x':
        editPrompt = "Upscale this image to 4x resolution, making it ultra-high definition and sharp.";
        break;
    }

    if (editPrompt) {
      await generateImage(editPrompt, source);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadImage(event.target?.result as string);
        setGeneratedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Watermark Canvas Logic ---

  const drawWatermark = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !generatedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply watermark
    if (watermark.text) {
      ctx.save();
      const responsiveSize = watermark.size * (canvas.width / 1000);
      ctx.font = `${responsiveSize}px ${watermark.font}`;
      ctx.fillStyle = watermark.color;
      ctx.globalAlpha = watermark.opacity;
      ctx.textBaseline = 'middle';

      const padding = 40 * (canvas.width / 1000);
      const textWidth = ctx.measureText(watermark.text).width;
      const textHeight = responsiveSize;

      let x = 0;
      let y = 0;

      switch (watermark.position) {
        case 'top-left':
          x = padding;
          y = padding + textHeight / 2;
          break;
        case 'top-right':
          x = canvas.width - textWidth - padding;
          y = padding + textHeight / 2;
          break;
        case 'bottom-left':
          x = padding;
          y = canvas.height - padding - textHeight / 2;
          break;
        case 'bottom-right':
          x = canvas.width - textWidth - padding;
          y = canvas.height - padding - textHeight / 2;
          break;
        case 'center':
          x = (canvas.width - textWidth) / 2;
          y = canvas.height / 2;
          break;
      }

      ctx.fillText(watermark.text, x, y);
      ctx.restore();
    }
  };

  useEffect(() => {
    if (generatedImage) {
      const img = new Image();
      img.src = generatedImage;
      img.onload = () => {
        imageRef.current = img;
        drawWatermark();
      };
    }
  }, [generatedImage, watermark]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `dery-lau-ai-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 custom-scrollbar overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-100/50 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-100/50 rounded-full blur-[120px]" 
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <h1 className="metallic-text text-2xl tracking-tighter" data-text="DERY LAU AI">DERY LAU AI</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Generator', 'Editor', 'Gallery', 'Community'].map((item) => (
              <button key={item} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors tracking-tight">
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {apiKeyStatus === 'custom' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Custom Key Active</span>
              </div>
            )}
            <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
              <History size={20} />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Dery" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <section className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-white space-y-6 md:space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Vision Lab</h2>
              <p className="text-slate-400 text-xs md:sm font-medium">Configure your next masterpiece.</p>
            </div>

            <div className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Layers size={12} className="text-indigo-500" /> Engine Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'gemini-2.5-flash-image', label: 'Flash 2.5', sub: 'Fastest', desc: 'Best for quick results' },
                    { id: 'gemini-3.1-flash-image-preview', label: 'Pro 3.1', sub: 'Quality', desc: 'Best for high detail' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left group relative ${
                        model === m.id 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`text-xs font-black ${model === m.id ? 'text-indigo-600' : 'text-slate-600'}`}>{m.label}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{m.sub}</div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {m.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Layout size={12} className="text-indigo-500" /> Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ASPECT_RATIO_VALUES) as AspectRatio[]).map((ratio) => {
                    const Icon = ASPECT_RATIO_VALUES[ratio].icon;
                    return (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 min-w-[60px] py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                          aspectRatio === ratio 
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="text-[10px] font-black">{ratio}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Palette size={12} className="text-indigo-500" /> Artistic Style
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStyle(s.id)}
                      className={`p-3 rounded-2xl border-2 transition-all text-left ${
                        selectedStyle === s.id 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`text-[10px] font-black ${selectedStyle === s.id ? 'text-indigo-600' : 'text-slate-600'}`}>{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Watermark Panel */}
          <section className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
            <button 
              onClick={() => setIsWatermarkPanelOpen(!isWatermarkPanelOpen)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                  <Type size={18} className="text-purple-600" />
                </div>
                <span className="font-black text-slate-700 tracking-tight">Watermark Controls</span>
              </div>
              <motion.div animate={{ rotate: isWatermarkPanelOpen ? 180 : 0 }}>
                <ChevronRight size={18} className="text-slate-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isWatermarkPanelOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="pt-6 space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Text</label>
                      <input 
                        type="text" 
                        value={watermark.text}
                        onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Font</label>
                        <select 
                          value={watermark.font}
                          onChange={(e) => setWatermark({ ...watermark, font: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                        >
                          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={watermark.color}
                            onChange={(e) => setWatermark({ ...watermark, color: e.target.value })}
                            className="w-10 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                          />
                          <span className="text-[10px] font-mono font-bold text-slate-400">{watermark.color.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Size</label>
                          <span className="text-[10px] font-black text-purple-600">{watermark.size}px</span>
                        </div>
                        <input 
                          type="range" min="8" max="120" step="1"
                          value={watermark.size}
                          onChange={(e) => setWatermark({ ...watermark, size: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opacity</label>
                          <span className="text-[10px] font-black text-purple-600">{Math.round(watermark.opacity * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01"
                          value={watermark.opacity}
                          onChange={(e) => setWatermark({ ...watermark, opacity: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Position</label>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                        {[
                          { id: 'top-left', icon: Square },
                          { id: 'top-right', icon: Square },
                          { id: 'center', icon: Square },
                          { id: 'bottom-left', icon: Square },
                          { id: 'bottom-right', icon: Square },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            onClick={() => setWatermark({ ...watermark, position: pos.id as any })}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                              watermark.position === pos.id ? 'bg-white shadow-sm text-purple-600' : 'text-slate-300 hover:text-slate-400'
                            }`}
                            title={pos.id}
                          >
                            <pos.icon size={14} className={
                              pos.id === 'top-left' ? 'self-start justify-self-start' :
                              pos.id === 'top-right' ? 'self-start justify-self-end' :
                              pos.id === 'bottom-left' ? 'self-end justify-self-start' :
                              pos.id === 'bottom-right' ? 'self-end justify-self-end' :
                              'self-center justify-self-center'
                            } />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Center Panel: Preview & Input */}
        <div className="lg:col-span-8 space-y-8">
          {/* Result Area */}
          <section className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000" />
            
            <div className="relative bg-white rounded-[3.5rem] p-4 shadow-2xl shadow-slate-200/50 border border-white overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-8 py-20 w-full max-w-md"
                  >
                    <div className="relative">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-32 h-32 border-[6px] border-slate-50 border-t-indigo-600 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="text-indigo-600" size={40} />
                        </motion.div>
                      </div>
                    </div>
                    
                    <div className="w-full space-y-6">
                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-black tracking-tighter text-slate-800">Synthesizing Vision</h3>
                        <motion.p 
                          key={loadingMessage}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] h-4"
                        >
                          {loadingMessage}
                        </motion.p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{Math.round(generationProgress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${generationProgress}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : generatedImage ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full flex flex-col items-center gap-6"
                  >
                    <div className="relative w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-slate-50 group/img">
                      <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-500 group-hover/img:scale-[1.02]"
                      />
                      
                      {/* Floating Quick Actions */}
                      <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover/img:opacity-100 transition-all translate-x-4 group-hover/img:translate-x-0">
                        <button 
                          onClick={downloadImage}
                          className="p-4 bg-white/90 backdrop-blur-md text-indigo-600 rounded-2xl shadow-xl hover:bg-white transition-all active:scale-90"
                          title="Download"
                        >
                          <Download size={20} />
                        </button>
                        <button 
                          onClick={() => setIsToolsPanelOpen(!isToolsPanelOpen)}
                          className="p-4 bg-white/90 backdrop-blur-md text-slate-600 rounded-2xl shadow-xl hover:bg-white transition-all active:scale-90"
                          title="Tools"
                        >
                          <Settings2 size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Tools Panel (Overlay) */}
                    <AnimatePresence>
                      {isToolsPanelOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute inset-x-8 bottom-8 bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-6 shadow-2xl z-20"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                              <Wand2 size={18} className="text-indigo-600" /> Advanced Editing Suite
                            </h4>
                            <button onClick={() => setIsToolsPanelOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                              <X size={18} className="text-slate-400" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {(!generatedImage && !uploadImage) ? (
                              <div className="col-span-full py-10 text-center space-y-2">
                                <Info className="mx-auto text-slate-300" size={24} />
                                <p className="text-xs font-bold text-slate-400">Please generate or upload an image first to use editing tools.</p>
                              </div>
                            ) : (
                              [
                                { id: 'remove_bg', label: 'Remove BG', icon: Eraser, color: 'text-blue-600 bg-blue-50' },
                                { id: 'remove_object', label: 'Remove Object', icon: MousePointer2, color: 'text-red-600 bg-red-50' },
                                { id: 'restore', label: 'Restore', icon: RefreshCw, color: 'text-emerald-600 bg-emerald-50' },
                                { id: 'enhance', label: 'Enhance', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
                                { id: 'upscale_2x', label: 'Upscale 2x', icon: Scaling, color: 'text-indigo-600 bg-indigo-50' },
                                { id: 'upscale_4x', label: 'Upscale 4x', icon: Maximize2, color: 'text-purple-600 bg-purple-50' },
                              ].map((tool) => (
                                <button
                                  key={tool.id}
                                  onClick={() => handleEdit(tool.id as EditMode)}
                                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all group/tool"
                                >
                                  <div className={`p-2 rounded-xl ${tool.color} transition-transform group-hover/tool:scale-110`}>
                                    <tool.icon size={16} />
                                  </div>
                                  <span className="text-xs font-black text-slate-600 tracking-tight">{tool.label}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-8 py-20 opacity-20">
                    <div className="w-32 h-32 rounded-[3.5rem] bg-slate-100 border-4 border-white flex items-center justify-center shadow-inner">
                      <ImageIcon size={48} className="text-slate-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black tracking-tighter text-slate-800">Awaiting Inspiration</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em]">Describe your vision below</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Input Area */}
          <section className="bg-white rounded-[3.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-white space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon size={12} className="text-indigo-500" /> Image to Edit / Reference
                </label>
                {uploadImage && (
                  <button 
                    onClick={() => { setUploadImage(null); setGeneratedImage(null); }}
                    className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div 
                onClick={() => !uploadImage && fileInputRef.current?.click()}
                className={`relative h-56 rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group ${
                  uploadImage ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/10'
                }`}
              >
                {uploadImage ? (
                  <>
                    <img src={uploadImage} alt="Source" className="w-full h-full object-contain p-6" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="p-3 bg-white text-indigo-600 rounded-xl shadow-xl hover:bg-indigo-50 transition-colors"
                          title="Change Image"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setUploadImage(null); setGeneratedImage(null); }}
                          className="p-3 bg-white text-red-500 rounded-xl shadow-xl hover:bg-red-50 transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <div className="relative mx-auto w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={28} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Plus size={10} className="text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-400 group-hover:text-slate-600 transition-colors">Drop or Click to Upload</p>
                      <p className="text-[10px] text-slate-300 uppercase tracking-[0.2em] font-bold">Reference for Custom Editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -top-3 left-8 px-4 py-1 bg-white border border-slate-100 rounded-full shadow-sm z-10">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  {uploadImage ? (
                    <><Wand2 size={10} className="text-indigo-600" /> Edit Mode</>
                  ) : (
                    <><Sparkles size={10} className="text-indigo-600" /> Generation Mode</>
                  )}
                </span>
              </div>
              <textarea
                placeholder={uploadImage ? "Describe the changes you want to make to the uploaded image..." : "A futuristic city with neon lights and flying cars, cinematic lighting, 8k resolution..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`w-full bg-slate-50 border-2 rounded-[2.5rem] p-8 pt-10 text-lg font-medium focus:outline-none min-h-[160px] resize-none transition-all leading-relaxed placeholder:text-slate-300 custom-scrollbar ${
                  uploadImage ? 'border-indigo-100 focus:border-indigo-500/30' : 'border-slate-100 focus:border-indigo-500/20'
                }`}
              />
              
              <div className="absolute bottom-6 right-6 flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => setPrompt('')}
                  className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-2xl shadow-sm transition-all"
                  title="Clear"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => generateImage()}
                disabled={isGenerating || (!prompt.trim() && !uploadImage)}
                className="flex-1 py-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 active:scale-[0.98]"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Zap size={20} fill="currentColor" />
                    Generate Vision
                  </>
                )}
              </button>
              
              {generatedImage && (
                <button
                  onClick={downloadImage}
                  className="px-10 py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 active:scale-[0.98]"
                >
                  <Download size={20} />
                  Export
                </button>
              )}
            </div>
          </section>

          {/* History / Gallery */}
          {history.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                  <History size={14} className="text-indigo-500" /> Recent Gallery
                </h3>
                <button onClick={() => setHistory([])} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors">Clear All</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {history.map((img, idx) => (
                  <motion.button 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    onClick={() => setGeneratedImage(img)}
                    className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-lg hover:shadow-xl transition-all group relative"
                  >
                    <img src={img} alt="History" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/50 text-center space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-3 opacity-30">
            <Zap size={20} className="text-indigo-600" />
            <span className="text-sm font-black tracking-[0.5em] uppercase text-slate-900">DERY LAU AI</span>
          </div>
          <p className="text-slate-400 text-xs font-medium max-w-md mx-auto leading-relaxed">
            The next generation of AI creativity. Built for visionaries, designers, and dreamers.
          </p>
        </div>

        <div className="flex justify-center gap-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {['Privacy', 'Terms', 'Contact', 'API'].map(item => (
            <a key={item} href="#" className="hover:text-indigo-600 transition-colors">{item}</a>
          ))}
        </div>
        
        <div className="space-y-2">
          <p className="text-[10px] text-slate-300 uppercase tracking-[0.3em] font-bold">© 2026 Studio Edition • Handcrafted with Passion</p>
          <div className="flex justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
