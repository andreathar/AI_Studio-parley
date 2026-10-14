import React, { useState } from 'react';
import { 
  Sparkles, 
  Eye, 
  Video, 
  Camera, 
  Sliders, 
  Copy, 
  Check, 
  Upload, 
  Film, 
  Tag, 
  Database, 
  FileCode2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  FolderLock,
  Layers,
  Wand2,
  Info,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { KlingPromptResult, KlingVisionResult } from '../types';

interface KlingStudioViewProps {
  onSaveToRegistry?: (data: any) => void;
  onDispatchTask?: (task: any) => void;
}

export const KlingStudioView: React.FC<KlingStudioViewProps> = ({ 
  onSaveToRegistry,
  onDispatchTask 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'enhancer' | 'vision' | 'standards'>('enhancer');

  // Prompt Enhancer State
  const [roughPrompt, setRoughPrompt] = useState('Andre enters a 1920s underground speakeasy, looking around anxiously through tobacco smoke and dim amber lamps');
  const [version, setVersion] = useState<'kling-1.6-pro' | 'kling-2.0-master'>('kling-2.0-master');
  const [shotType, setShotType] = useState('Medium Shot');
  const [cameraMovement, setCameraMovement] = useState('Slow Cinematic Push-in');
  const [lightingStyle, setLightingStyle] = useState('1920s Film Noir Anamorphic (Volumetric Haze, Tungsten amber)');
  const [intensity, setIntensity] = useState(5);
  const [sceneNumber, setSceneNumber] = useState('04');
  const [shotNumber, setShotNumber] = useState('02');
  const [character, setCharacter] = useState('Andre');
  const [descriptor, setDescriptor] = useState('speakeasy_entry');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [promptResult, setPromptResult] = useState<KlingPromptResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Vision Review State
  const [selectedSampleFrame, setSelectedSampleFrame] = useState<string>('speakeasy');
  const [customImageBase64, setCustomImageBase64] = useState<string>('');
  const [directorFeedback, setDirectorFeedback] = useState('Andre\'s trenchcoat has slight motion tearing at second 3 when he turns; background lighting is blown out on the bar; please slow down the camera pan and deepen shadow contrast.');
  const [isReviewing, setIsReviewing] = useState(false);
  const [visionResult, setVisionResult] = useState<KlingVisionResult | null>(null);
  const [visionCopiedKey, setVisionCopiedKey] = useState<string | null>(null);
  const [visionSavedSuccess, setVisionSavedSuccess] = useState(false);

  // Sample Frames
  const sampleFrames = [
    {
      id: 'speakeasy',
      title: 'Scene 04 / Shot 02 — Speakeasy Entry',
      character: 'Andre',
      era: '1920s',
      url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
      description: 'Dim speakeasy entrance with jazz silhouettes and warm amber sconces'
    },
    {
      id: 'pocketwatch',
      title: 'Scene 04 / Shot 03 — Antique Pocket Watch Close-up',
      character: 'Andre',
      era: '1920s',
      url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
      description: 'Hands holding a ticking silver pocket watch with glowing roman numerals'
    },
    {
      id: 'timestorm',
      title: 'Scene 01 / Shot 01 — Time Slip Portal Vortex',
      character: 'Andre',
      era: 'Temporal Corridor',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      description: 'Distorted light ripples and chronological fracture particles'
    }
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyVisionToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setVisionCopiedKey(key);
    setTimeout(() => setVisionCopiedKey(null), 2000);
  };

  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/kling/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughPrompt,
          version,
          shotType,
          cameraMovement,
          lightingStyle,
          intensity,
          sceneNumber,
          shotNumber,
          character,
          descriptor,
          project: 'andre-time-travel'
        })
      });
      if (!res.ok) throw new Error('Failed to enhance prompt');
      const data: KlingPromptResult = await res.json();
      setPromptResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleVisionCritique = async () => {
    setIsReviewing(true);
    setVisionSavedSuccess(false);
    try {
      // Find the image base64 or URL
      let imageBase64 = customImageBase64;
      if (!imageBase64) {
        // Fallback or placeholder for sample image
        const sample = sampleFrames.find(f => f.id === selectedSampleFrame);
        imageBase64 = sample?.url || '';
      }

      const res = await fetch('/api/kling/vision-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          directorFeedback,
          currentPrompt: roughPrompt,
          sceneNumber,
          shotNumber,
          character
        })
      });
      if (!res.ok) throw new Error('Failed to review frame');
      const data: KlingVisionResult = await res.json();
      setVisionResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSaveToRegistry = async (isVision: boolean = false) => {
    try {
      let assetId = '';
      let filename = '';
      let csvRow = '';
      let tags: string[] = [];

      if (isVision) {
        if (!visionResult?.namingPattern) return;
        assetId = visionResult.namingPattern.revisionAssetId;
        filename = visionResult.namingPattern.revisionFilename;
        csvRow = visionResult.namingPattern.csvRow;
        tags = visionResult.namingPattern.tags;
      } else {
        if (!promptResult?.namingPattern) return;
        assetId = promptResult.namingPattern.assetId;
        filename = promptResult.namingPattern.filename;
        csvRow = promptResult.namingPattern.csvRow;
        tags = promptResult.namingPattern.tags;
      }

      const res = await fetch('/api/kling/save-to-registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          filename,
          csvRow,
          tags,
        }),
      });
      if (res.ok) {
        if (isVision) {
          setVisionSavedSuccess(true);
          setTimeout(() => setVisionSavedSuccess(false), 3000);
        } else {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#f0f6fc] flex items-center gap-2">
                  Kling AI Studio & Vision Review Engine
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Gemini 3.8 Flash Powered
                  </span>
                </h2>
                <p className="text-sm text-[#8b949e]">
                  Generate photorealistic Kling 1.6 & 2.0 prompts, analyze visual director feedback with Multimodal Vision, and enforce strict asset naming & 8-column registry standards.
                </p>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('enhancer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeSubTab === 'enhancer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Prompt Enhancer
            </button>
            <button
              onClick={() => setActiveSubTab('vision')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeSubTab === 'vision'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vision Feedback Critic
            </button>
            <button
              onClick={() => setActiveSubTab('standards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeSubTab === 'standards'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Naming & Registry Standards
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: PROMPT ENHANCER */}
      {activeSubTab === 'enhancer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Left Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2 pb-2 border-b border-[#21262d]">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Scene Metadata & Production Context
              </h3>

              {/* Scene & Shot info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Scene Number</label>
                  <input
                    type="text"
                    value={sceneNumber}
                    onChange={(e) => setSceneNumber(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="04"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Shot Number</label>
                  <input
                    type="text"
                    value={shotNumber}
                    onChange={(e) => setShotNumber(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="02"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Subject / Character</label>
                  <input
                    type="text"
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none"
                    placeholder="Andre"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Descriptor Slug</label>
                  <input
                    type="text"
                    value={descriptor}
                    onChange={(e) => setDescriptor(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="speakeasy_entry"
                  />
                </div>
              </div>

              {/* Kling Version */}
              <div>
                <label className="text-xs font-medium text-[#8b949e] block mb-1">Kling Engine Version</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVersion('kling-2.0-master')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                      version === 'kling-2.0-master'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    Kling 2.0 Master
                    <span className="block text-[10px] font-normal opacity-70">Highest fidelity & temporal stability</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVersion('kling-1.6-pro')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                      version === 'kling-1.6-pro'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'
                    }`}
                  >
                    Kling 1.6 Pro
                    <span className="block text-[10px] font-normal opacity-70">High-speed prompt adherence</span>
                  </button>
                </div>
              </div>

              {/* Draft Prompt */}
              <div>
                <label className="text-xs font-medium text-[#8b949e] block mb-1">
                  Draft Prompt (Rough Idea / Director Note)
                </label>
                <textarea
                  rows={3}
                  value={roughPrompt}
                  onChange={(e) => setRoughPrompt(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none resize-none"
                  placeholder="Describe your scene naturally..."
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-[#8b949e] py-0.5">Presets:</span>
                  {[
                    { label: 'Speakeasy Entry', prompt: 'Andre enters a 1920s underground speakeasy, looking around anxiously through tobacco smoke and dim amber lamps' },
                    { label: 'Pocket Watch', prompt: 'Close up of hands holding an antique ticking silver pocket watch reflecting rain drops on cobblestone' },
                    { label: 'Time Vortex', prompt: 'Andre falling through a temporal corridor with swirling chronological energy and blue lightning' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRoughPrompt(p.prompt)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] hover:text-white"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera & Cinematography Specs */}
              <div className="space-y-3 pt-2 border-t border-[#21262d]">
                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Shot Framing</label>
                  <select
                    value={shotType}
                    onChange={(e) => setShotType(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Extreme Close-up">Extreme Close-up (Macro optical focus)</option>
                    <option value="Close-up">Close-up (Portraits, emotional cues)</option>
                    <option value="Medium Shot">Medium Shot (Waist-up, subject interaction)</option>
                    <option value="Cowboy Shot">Cowboy Shot (Mid-thigh, active posture)</option>
                    <option value="Wide Establishing Shot">Wide Establishing Shot (Full environment context)</option>
                    <option value="Dutch Angle">Dutch Angle (Tilted axis, suspense & disorientation)</option>
                    <option value="Drone Aerial">Drone Aerial (High angle bird's-eye sweep)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Camera Movement</label>
                  <select
                    value={cameraMovement}
                    onChange={(e) => setCameraMovement(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Slow Cinematic Push-in">Slow Cinematic Push-in (Dolly forward)</option>
                    <option value="Tracking Pan Left">Tracking Pan Left (Following subject walk)</option>
                    <option value="Dolly Zoom / Vertigo Effect">Dolly Zoom / Vertigo Effect (Z-axis warp)</option>
                    <option value="Slow Orbit 360">Slow Orbit 360 (Revolution around character)</option>
                    <option value="Pedestal Tilt Up">Pedestal Tilt Up (Ground to face reveal)</option>
                    <option value="Static Lock-off">Static Lock-off (Tripod stability, zero camera sway)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8b949e] block mb-1">Lighting & Optics</label>
                  <select
                    value={lightingStyle}
                    onChange={(e) => setLightingStyle(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="1920s Film Noir Anamorphic (Volumetric Haze, Tungsten amber)">1920s Film Noir Anamorphic (Volumetric Haze, Tungsten amber)</option>
                    <option value="Chiaroscuro High Contrast (Deep blacks, sharp rim lighting)">Chiaroscuro High Contrast (Deep blacks, sharp rim lighting)</option>
                    <option value="Golden Hour Magic Hour (Soft 3200K backlight, dust motes)">Golden Hour Magic Hour (Soft 3200K backlight, dust motes)</option>
                    <option value="Temporal Corridor Sci-Fi (Cyan and magenta neon luminescence)">Temporal Corridor Sci-Fi (Cyan and magenta neon luminescence)</option>
                    <option value="Overcast Moody European Street (Cool diffuse skylight, wet asphalt)">Overcast Moody European Street (Cool diffuse skylight, wet asphalt)</option>
                  </select>
                </div>

                {/* Motion Intensity Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[#8b949e]">Motion Dynamic Intensity</label>
                    <span className="text-xs font-bold text-indigo-400">{intensity}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 h-1.5 bg-[#0d1117] rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#8b949e] mt-0.5">
                    <span>Subtle (1-3)</span>
                    <span>Controlled (4-7)</span>
                    <span>High Action (8-10)</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isEnhancing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Engineering Prompt with Gemini 3.8 Flash...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Enhanced Prompt & Standardized Naming
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Right Column */}
          <div className="lg:col-span-7 space-y-5">
            {promptResult ? (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                  <div>
                    <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                      <Film className="w-4 h-4 text-emerald-400" />
                      Enhanced Kling Production Specification
                    </h3>
                    <p className="text-[11px] text-[#8b949e]">
                      Generated via {promptResult.modelUsed}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveToRegistry(false)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
                        savedSuccess
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border-[#30363d]'
                      }`}
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Registered in Runtime!
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5 text-indigo-400" />
                          Register to Media Catalog
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Enhanced Positive Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#58a6ff] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Kling Positive Prompt (Ready for API / Studio Web)
                    </span>
                    <button
                      onClick={() => copyToClipboard(promptResult.enhancedPrompt, 'pos')}
                      className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'pos' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'pos' ? 'Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                  <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-xs text-[#c9d1d9] leading-relaxed select-all font-mono">
                    {promptResult.enhancedPrompt}
                  </div>
                </div>

                {/* Negative Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Negative Prompt (Artifact Elimination)
                    </span>
                    <button
                      onClick={() => copyToClipboard(promptResult.negativePrompt, 'neg')}
                      className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'neg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'neg' ? 'Copied!' : 'Copy Negative'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#0d1117] rounded-lg border border-[#21262d] text-[11px] text-[#8b949e] font-mono select-all">
                    {promptResult.negativePrompt}
                  </div>
                </div>

                {/* Camera Control Specs & Kling Mode */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
                  <div>
                    <span className="text-[11px] font-bold text-[#8b949e] block mb-1">Kling Camera Vector Controls:</span>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-[#c9d1d9]">
                      <div className="p-1 rounded bg-[#161b22] border border-[#30363d] text-center">
                        Pan: <span className="text-indigo-400">{promptResult.cameraMotionSpec.pan}</span>
                      </div>
                      <div className="p-1 rounded bg-[#161b22] border border-[#30363d] text-center">
                        Tilt: <span className="text-indigo-400">{promptResult.cameraMotionSpec.tilt}</span>
                      </div>
                      <div className="p-1 rounded bg-[#161b22] border border-[#30363d] text-center">
                        Zoom: <span className="text-indigo-400">{promptResult.cameraMotionSpec.zoom}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#8b949e] block mb-1">Recommended Execution Mode:</span>
                    <div className="flex items-center gap-2 text-xs text-[#f0f6fc]">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-[10px]">
                        Mode: {promptResult.recommendedSettings.mode}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold text-[10px]">
                        Duration: {promptResult.recommendedSettings.duration}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                        CFG: {promptResult.recommendedSettings.cfgScale}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Standardized Asset Naming & Registry Entry */}
                <div className="p-4 bg-gradient-to-br from-[#0d1117] to-[#161b22] rounded-xl border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Movies_Projects Standardized Asset Naming & 8-Column CSV
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Zero Collision Guaranteed
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#8b949e] block">Standard Target Filename:</span>
                      <div className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#30363d] font-mono text-emerald-300 text-xs">
                        <span>{promptResult.namingPattern.filename}</span>
                        <button
                          onClick={() => copyToClipboard(promptResult.namingPattern.filename, 'fn')}
                          className="text-[#8b949e] hover:text-white"
                        >
                          {copiedKey === 'fn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8b949e] block">8-Column Asset Registry Entry (for asset-registry.csv):</span>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d] font-mono text-[11px] text-[#c9d1d9] overflow-x-auto whitespace-pre">
                        {promptResult.namingPattern.csvRow}
                      </div>
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => copyToClipboard(promptResult.namingPattern.csvRow, 'csv')}
                          className="text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1"
                        >
                          {copiedKey === 'csv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === 'csv' ? 'Copied CSV Line!' : 'Copy 8-Column CSV Line'}
                        </button>
                      </div>
                    </div>

                    {/* Taxonomy Tags */}
                    <div>
                      <span className="text-[10px] text-[#8b949e] block mb-1">Taxonomy Standard Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {promptResult.namingPattern.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#21262d] border border-[#30363d] text-[#79c0ff]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parley Autonomous Lane Handoff */}
                <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Agent Parley Task Handoff (Codex / Claude Execution)
                    </span>
                    <span className="text-[10px] text-[#8b949e]">scripts/kling_release.py ready</span>
                  </div>
                  <pre className="p-2.5 rounded bg-[#161b22] border border-[#30363d] text-[10px] font-mono text-[#8b949e] overflow-x-auto">
                    {JSON.stringify(promptResult.handoffTaskJson, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl p-12 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#f0f6fc]">Ready to Enhance Kling Prompts</h4>
                  <p className="text-xs text-[#8b949e] max-w-md mx-auto mt-1">
                    Fill in the scene parameters on the left and click "Generate Enhanced Prompt". Gemini 3.8 Flash will structure professional Hollywood cinematography, camera motions, and zero-collision asset identifiers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VISION FEEDBACK CRITIC */}
      {activeSubTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Asset Selection & Director Feedback */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2 pb-2 border-b border-[#21262d]">
                <Camera className="w-4 h-4 text-indigo-400" />
                1. Select Kling Frame or Upload Render
              </h3>

              {/* Sample Frames Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#8b949e] block">
                  Select Frame from Andre Time Travel Media:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {sampleFrames.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => {
                        setSelectedSampleFrame(frame.id);
                        setCustomImageBase64('');
                      }}
                      className={`relative rounded-lg overflow-hidden border text-left transition-all group ${
                        selectedSampleFrame === frame.id && !customImageBase64
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'border-[#30363d] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={frame.url} alt={frame.title} className="w-full h-16 object-cover" />
                      <div className="p-1 bg-[#0d1117] text-[10px] font-semibold text-[#c9d1d9] truncate">
                        {frame.title.split('—')[1] || frame.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Upload */}
              <div>
                <label className="text-xs font-medium text-[#8b949e] block mb-1">
                  Or Upload Custom Kling Generation Frame:
                </label>
                <div className="relative border border-dashed border-[#30363d] hover:border-indigo-500 rounded-lg p-3 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-[#8b949e]">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Drop image here or click to browse</span>
                  </div>
                </div>
                {customImageBase64 && (
                  <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Custom frame loaded for vision inspection
                  </div>
                )}
              </div>

              {/* Frame Preview */}
              <div className="rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117] p-2 space-y-2">
                <div className="text-[11px] font-bold text-[#8b949e] flex items-center justify-between">
                  <span>Current Frame Under Inspection</span>
                  <span className="text-indigo-400 font-mono text-[10px]">Kling 2.0 Render</span>
                </div>
                <img
                  src={
                    customImageBase64 ||
                    sampleFrames.find((f) => f.id === selectedSampleFrame)?.url ||
                    ''
                  }
                  alt="Inspection target"
                  className="w-full h-44 object-cover rounded border border-[#21262d]"
                />
              </div>

              {/* Human Feedback Textarea */}
              <div className="pt-2 border-t border-[#21262d] space-y-2">
                <label className="text-xs font-bold text-[#f0f6fc] flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-400" />
                  Human Director's Visual Feedback:
                </label>
                <textarea
                  rows={4}
                  value={directorFeedback}
                  onChange={(e) => setDirectorFeedback(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-[#f0f6fc] focus:border-indigo-500 focus:outline-none resize-none leading-relaxed"
                  placeholder="Describe flaws: lighting too dark, jitter in camera motion, unnatural hand anatomy, wrong lens depth..."
                />
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-[#8b949e]">Feedback Ideas:</span>
                  {[
                    "Trenchcoat motion jitter at second 2",
                    "Lighting on face too dark in background",
                    "Camera pan is too fast; slow it down"
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDirectorFeedback(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleVisionCritique}
                disabled={isReviewing}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isReviewing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Visual Frame with Gemini Vision...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Inspect with Gemini Vision & Create Revision Pass
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Vision Analysis & Revision Output */}
          <div className="lg:col-span-7 space-y-5">
            {visionResult ? (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                  <div>
                    <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Multimodal Vision Critique & Revision Pass
                    </h3>
                    <p className="text-[11px] text-[#8b949e]">
                      Evaluated by {visionResult.modelUsed}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveToRegistry(true)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
                      visionSavedSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border-[#30363d]'
                    }`}
                  >
                    {visionSavedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Revision Registered!
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5 text-purple-400" />
                        Register Revision (v2)
                      </>
                    )}
                  </button>
                </div>

                {/* Critique Diagnosis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1">
                    <span className="text-[11px] font-bold text-amber-400 block">Lighting & Color Balance:</span>
                    <p className="text-xs text-[#c9d1d9] leading-relaxed">
                      {visionResult.visualCritique.lightingAndColor}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1">
                    <span className="text-[11px] font-bold text-cyan-400 block">Temporal Motion & Physics:</span>
                    <p className="text-xs text-[#c9d1d9] leading-relaxed">
                      {visionResult.visualCritique.temporalMotionEvaluation}
                    </p>
                  </div>
                </div>

                {/* Detected Artifacts Badges */}
                <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] space-y-1.5">
                  <span className="text-[11px] font-bold text-rose-400 block">Detected Kling Generation Artifacts:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {visionResult.visualCritique.klingArtifactsDetected.map((art, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-rose-400" />
                        {art}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Director Feedback Addressed */}
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-xs text-indigo-200">
                  <span className="font-bold text-indigo-300 block mb-0.5">Director Notes Addressed:</span>
                  {visionResult.visualCritique.directorFeedbackAddressed}
                </div>

                {/* Upgraded Revision Prompt (v2) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Revised Kling 2.0 Prompt (Pass 2 - Fixes Flaws)
                    </span>
                    <button
                      onClick={() => copyVisionToClipboard(visionResult.revisedPrompt, 'vprompt')}
                      className="text-xs text-[#8b949e] hover:text-white flex items-center gap-1"
                    >
                      {visionCopiedKey === 'vprompt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {visionCopiedKey === 'vprompt' ? 'Copied!' : 'Copy Revision Prompt'}
                    </button>
                  </div>
                  <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] text-xs text-[#c9d1d9] leading-relaxed select-all font-mono">
                    {visionResult.revisedPrompt}
                  </div>
                </div>

                {/* Recommended Camera Adjustments */}
                <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] flex items-center justify-between text-xs">
                  <span className="text-[#8b949e] font-medium">Camera Speed & Optics Adjustment:</span>
                  <span className="font-semibold text-amber-300">{visionResult.recommendedCameraAdjustment}</span>
                </div>

                {/* Standardized Revision Naming & Asset Registry Row */}
                <div className="p-4 bg-gradient-to-br from-[#0d1117] to-[#161b22] rounded-xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Standardized Revision Naming & Asset Registry Row
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      Revision v2 / Tagged
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#8b949e] block">Standard Revision Filename:</span>
                      <div className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#30363d] font-mono text-purple-300 text-xs">
                        <span>{visionResult.namingPattern.revisionFilename}</span>
                        <button
                          onClick={() => copyVisionToClipboard(visionResult.namingPattern.revisionFilename, 'rfn')}
                          className="text-[#8b949e] hover:text-white"
                        >
                          {visionCopiedKey === 'rfn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8b949e] block">8-Column Registry Row (Ready for CSV):</span>
                      <div className="p-2 rounded bg-[#0d1117] border border-[#30363d] font-mono text-[11px] text-[#c9d1d9] overflow-x-auto whitespace-pre">
                        {visionResult.namingPattern.csvRow}
                      </div>
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => copyVisionToClipboard(visionResult.namingPattern.csvRow, 'rcsv')}
                          className="text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1"
                        >
                          {visionCopiedKey === 'rcsv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {visionCopiedKey === 'rcsv' ? 'Copied CSV Row!' : 'Copy 8-Column CSV Line'}
                        </button>
                      </div>
                    </div>

                    {/* Taxonomy Tags */}
                    <div>
                      <span className="text-[10px] text-[#8b949e] block mb-1">Taxonomy Standard Revision Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {visionResult.namingPattern.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#21262d] border border-[#30363d] text-purple-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispatch to Parley */}
                <div className="p-3 bg-[#0d1117] rounded-lg border border-[#21262d] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-[#f0f6fc] block">Dispatch Revision to Autonomous Agent:</span>
                    <span className="text-[11px] text-[#8b949e]">
                      Task ID: {visionResult.handoffTaskJson.task_id} via {visionResult.handoffTaskJson.tool}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDispatchTask) onDispatchTask(visionResult.handoffTaskJson);
                      alert('Task dispatched to Agent Parley queue for autonomous lane execution!');
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    Send to Parley Lane
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#161b22] border border-[#30363d] border-dashed rounded-xl p-12 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#f0f6fc]">Ready for Visual Frame Review</h4>
                  <p className="text-xs text-[#8b949e] max-w-md mx-auto mt-1">
                    Select a frame on the left, enter directorial feedback, and click "Inspect with Gemini Vision". Gemini 3.8 Flash will diagnose the composition, motion artifacts, and generate a standardized revision pass.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NAMING & REGISTRY STANDARDS SPECIFICATION */}
      {activeSubTab === 'standards' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#21262d] pb-4">
            <h3 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-400" />
              Movies_Projects Strict Kling Asset Naming & Tagging Specification
            </h3>
            <p className="text-xs text-[#8b949e] mt-1">
              Standardized architecture to ensure zero file collisions across autonomous agents (Claude, Codex, Opencode) and strict integration with `projects/andre-time-travel/asset-registry.csv`.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pattern Rule 1: Filename Syntax */}
            <div className="p-4 bg-[#0d1117] rounded-xl border border-[#21262d] space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#58a6ff]">
                <Tag className="w-4 h-4" />
                1. Canonical Filename Pattern
              </div>
              <div className="p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] font-mono text-xs text-emerald-300">
                kling_{'{project}'}_sc{'{scene}'}_sh{'{shot}'}_{'{character}'}_{'{descriptor}'}_{'{version}'}.mp4
              </div>
              <div className="text-xs text-[#8b949e] space-y-1.5 leading-relaxed">
                <p>• <strong className="text-[#f0f6fc]">kling</strong>: Static engine namespace prefix.</p>
                <p>• <strong className="text-[#f0f6fc]">project</strong>: Short project code (e.g., <code className="text-indigo-300 font-mono">att</code> for Andre Time Travel).</p>
                <p>• <strong className="text-[#f0f6fc]">sc{'NN'}_sh{'NN'}</strong>: Zero-padded 2-digit scene and shot numbers (e.g., <code className="text-indigo-300 font-mono">sc04_sh02</code>).</p>
                <p>• <strong className="text-[#f0f6fc]">character</strong>: Primary subject slug in lowercase (<code className="text-indigo-300 font-mono">andre</code>, <code className="text-indigo-300 font-mono">scientist</code>).</p>
                <p>• <strong className="text-[#f0f6fc]">descriptor</strong>: Clean slug describing the action or camera movement (<code className="text-indigo-300 font-mono">speakeasy_dolly</code>).</p>
                <p>• <strong className="text-[#f0f6fc]">version</strong>: <code className="text-emerald-300 font-mono">v1</code>, <code className="text-purple-300 font-mono">v2_rev</code> (revision passes).</p>
              </div>
            </div>

            {/* Pattern Rule 2: 8-Column CSV Schema */}
            <div className="p-4 bg-[#0d1117] rounded-xl border border-[#21262d] space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Database className="w-4 h-4" />
                2. 8-Column Asset Registry Schema
              </div>
              <div className="p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] font-mono text-[11px] text-amber-300 overflow-x-auto whitespace-pre">
asset_id, kind, path_or_provider_id, path_base, source, sha256, approved, notes
              </div>
              <div className="text-xs text-[#8b949e] space-y-1.5 leading-relaxed">
                <p>• <strong className="text-[#f0f6fc]">asset_id</strong>: Unique identifier: <code className="text-amber-300 font-mono">att-video-kling-sc04-02</code></p>
                <p>• <strong className="text-[#f0f6fc]">kind</strong>: Media MIME type: <code className="text-amber-300 font-mono">video/mp4</code></p>
                <p>• <strong className="text-[#f0f6fc]">path_or_provider_id</strong>: Strictly relative path inside project root.</p>
                <p>• <strong className="text-[#f0f6fc]">path_base</strong>: Scope anchor: <code className="text-amber-300 font-mono">projects/andre-time-travel</code></p>
                <p>• <strong className="text-[#f0f6fc]">source</strong>: <code className="text-amber-300 font-mono">local_media</code></p>
                <p>• <strong className="text-[#f0f6fc]">sha256</strong>: 64-char hexadecimal content digest.</p>
                <p>• <strong className="text-[#f0f6fc]">approved</strong>: <code className="text-emerald-300 font-mono">true</code> (accepted) or <code className="text-rose-300 font-mono">false</code> (pending review).</p>
                <p>• <strong className="text-[#f0f6fc]">notes</strong>: Prompt summary, camera lens, and director revision remarks.</p>
              </div>
            </div>
          </div>

          {/* Autonomous Lane Integration Guide */}
          <div className="p-4 bg-[#0d1117] rounded-xl border border-indigo-500/20 space-y-3">
            <h4 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-indigo-400" />
              Autonomous Agent Coordination Flow (Codex / Claude / Opencode)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] space-y-1">
                <span className="font-bold text-indigo-300 block">Step 1: Reservation Claim</span>
                <p className="text-[#8b949e]">
                  Before rendering, agent calls <code className="text-indigo-300">file_reservation_paths</code> to lease the target asset path and registry CSV.
                </p>
              </div>
              <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] space-y-1">
                <span className="font-bold text-emerald-300 block">Step 2: Kling Execution</span>
                <p className="text-[#8b949e]">
                  Agent executes <code className="text-emerald-300">scripts/kling_release.py</code> using the enhanced positive/negative prompts and camera vectors.
                </p>
              </div>
              <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] space-y-1">
                <span className="font-bold text-purple-300 block">Step 3: Verification Gate</span>
                <p className="text-[#8b949e]">
                  Agent runs <code className="text-purple-300">manage.py assets validate</code> to verify the 8-column schema, sha256 digest, and containment before release.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
