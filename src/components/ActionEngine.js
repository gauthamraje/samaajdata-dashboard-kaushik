import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import html2canvas from 'html2canvas';
import { 
  X, ChevronRight, ChevronDown, Mail, Share2, Camera, CheckCircle2, 
  AlertTriangle, ShieldAlert, PackageSearch, PenTool, Check, ArrowLeft, Sparkles, MapPin, Info
} from 'lucide-react';

const FALLBACK_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const fallbackColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
};

const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const abs = Math.abs(n);
  return n.toLocaleString('en-IN', { maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2 });
};

const MAX_DETAILS_COLLAPSED = 8;

export default function ActionEngine({ selectedIssue, closeCard, ISSUE_CONFIG, onActionComplete }) {
  const [actionLevel, setActionLevel] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);

  useEffect(() => {
    setAboutOpen(false);
    setShowAllFields(false);
  }, [selectedIssue.id]);
  const [civicPoints, setCivicPoints] = useState(0);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [shareFile, setShareFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef(null);

  // Heavy Lifter Pipeline State
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  useEffect(() => {
    // For Confetti
    setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const completeAction = (points) => {
    setCivicPoints(points);
    setActionCompleted(true);
    setShowConfetti(true);
    if (onActionComplete) {
      onActionComplete(selectedIssue.id);
    }
  };

  useEffect(() => {
    if (actionCompleted && certificateRef.current) {
      setIsGenerating(true);
      // Small delay to ensure the DOM has fully rendered the certificate
      const timer = setTimeout(async () => {
        try {
          const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true, backgroundColor: '#09090b' });
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'samaajdata-impact.png', { type: 'image/png' });
              setShareFile(file);
            }
            setIsGenerating(false);
          }, 'image/png');
        } catch (err) {
          console.error('Pre-generating certificate failed', err);
          setIsGenerating(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [actionCompleted]);

  const handleShare = async () => {
    let finalShareFile = shareFile;
    if (!finalShareFile) {
      if (!certificateRef.current) return;
      setIsGenerating(true);
      try {
        const canvas = await html2canvas(certificateRef.current, { scale: 2, useCORS: true, backgroundColor: '#09090b' });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Canvas to Blob failed');
        finalShareFile = new File([blob], 'samaajdata-impact.png', { type: 'image/png' });
        setShareFile(finalShareFile);
      } catch (err) {
        console.error('Synchronous generation failed', err);
        setIsGenerating(false);
        return;
      }
      setIsGenerating(false);
    }

    try {
      if (navigator.canShare && navigator.canShare({ files: [finalShareFile] })) {
        await navigator.share({
          files: [finalShareFile],
          title: 'Civic Impact Certificate',
          text: `I just took civic action on a ${(selectedIssue.subcategory || selectedIssue.category || selectedIssue.type || '').toLowerCase()} issue in my city. Join me on SamaajData!`,
        });
      } else {
        // Fallback if browser doesn't support file sharing
        const link = document.createElement('a');
        link.href = URL.createObjectURL(finalShareFile);
        link.download = 'samaajdata-impact.png';
        link.click();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Sharing failed, falling back to download', err);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(finalShareFile);
        link.download = 'samaajdata-impact.png';
        link.click();
      }
    }
  };

  // Resolve icon & color from both old mock shape (type) and new API shape (category/subcategory)
  const issueKey = selectedIssue.category || selectedIssue.type;
  const IssueIcon = ISSUE_CONFIG[issueKey]?.icon || ISSUE_CONFIG[selectedIssue.subcategory]?.icon || MapPin;
  const issueColor = ISSUE_CONFIG[issueKey]?.color || ISSUE_CONFIG[selectedIssue.subcategory]?.color || fallbackColor(issueKey);

  // Generic facility panel: everything below comes from the dataset's column metadata
  const fields = Array.isArray(selectedIssue.fields) ? selectedIssue.fields : null;
  const isFacilityPanel = selectedIssue.type !== 'Action' && !!fields;
  const statFields = isFacilityPanel ? fields.filter(f => f.role === 'Metric' && f.numeric).slice(0, 4) : [];
  const detailFields = isFacilityPanel ? fields.filter(f => !statFields.includes(f)) : [];
  const visibleDetails = showAllFields ? detailFields : detailFields.slice(0, MAX_DETAILS_COLLAPSED);
  const datasetInfo = selectedIssue.dataset || null;

  // Parse location and metadata from the normalized API response
  const loc = selectedIssue.location || null;           // { Ward Name, Zone, Sub Division, Location }
  const meta = selectedIssue.metadata || null;          // { Electricity, Water, Gender Access, ... }
  const partner = selectedIssue.partner || null;        // 'BBMP', 'SamaajData', etc.
  const displayLabel = selectedIssue.subcategory || issueKey;

  // Build human-readable location strings
  const locationLine = loc
    ? [loc['Location'], loc['Ward Name'], loc['Zone']].filter(Boolean).join(' · ')
    : null;
  const wardLine = loc
    ? [loc['Ward No. '] && `Ward ${(loc['Ward No. '] || '').trim()}`, loc['Sub Division']].filter(Boolean).join(', ')
    : null;

  // Determine if we have a real image or need a category-branded placeholder
  const hasImage = !!selectedIssue.img;

  return (
    <motion.div 
      key={`issue-${selectedIssue.id}`}
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full overflow-y-auto absolute inset-0 bg-[#121212] z-10"
    >
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[5000]">
          <Confetti
            width={windowDimensions.width}
            height={windowDimensions.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.15}
            colors={['#10b981', '#fcd34d', '#3b82f6', '#f43f5e']}
          />
        </div>
      )}

      {/* Header Image / Category Visual (Animates to thumbnail when actionLevel is set) */}
      <motion.div 
        layout
        className={`relative w-full bg-zinc-900 shrink-0 overflow-hidden ${actionLevel ? 'h-28 rounded-b-3xl' : 'h-56'}`}
      >
        {hasImage ? (
          <img src={selectedIssue.img} alt="Issue" className="w-full h-full object-cover" />
        ) : (
          /* Category-branded gradient placeholder for datasets without photos */
          <div 
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${issueColor}25 0%, #09090b 70%)` }}
          >
            <IssueIcon className="w-16 h-16 opacity-15" style={{ color: issueColor }} />
            {!actionLevel && (
              <span className="text-[10px] font-bold tracking-widest text-zinc-700 uppercase">
                {partner || 'Verified Dataset'} · No Photo On Record
              </span>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/30 to-transparent" />
        <button 
          onClick={closeCard}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black transition-colors z-10 shadow-lg shadow-black/20"
        >
          <X className="w-4 h-4" />
        </button>
        <motion.div layout className={`absolute left-5 ${actionLevel ? 'bottom-3' : 'bottom-5'} flex items-center gap-2`}>
          <div 
            className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-2 backdrop-blur-sm border border-white/10"
            style={{ backgroundColor: `${issueColor}cc` }}
          >
            <IssueIcon className="w-3.5 h-3.5" />
            {displayLabel}
          </div>
          {partner && !actionLevel && (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold text-zinc-400 bg-black/60 backdrop-blur-sm border border-zinc-700/60">
              {partner}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div layout className="p-6 flex flex-col gap-5">
        <motion.div layout>
          <motion.h2 layout className={`${actionLevel ? 'text-xl' : 'text-2xl'} font-semibold text-white tracking-tight mb-1.5 leading-snug`}>
            {selectedIssue.heading || `${displayLabel} Facility`}
          </motion.h2>

          {!actionLevel && isFacilityPanel && selectedIssue.subtitle && (
            <p className="text-xs text-zinc-400 mb-2">{selectedIssue.subtitle}</p>
          )}

          {/* Location Block — only shown before action level is selected */}
          {!actionLevel && locationLine && (
            <div className="flex flex-col gap-0.5 mb-2">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <span className="text-xs text-zinc-400 leading-snug">{locationLine}</span>
              </div>
              {wardLine && (
                <span className="text-[10px] text-zinc-600 font-medium ml-5">{wardLine}</span>
              )}
            </div>
          )}

          {/* Facility panels show the dataset description under "About this dataset" instead */}
          {(actionLevel || !isFacilityPanel) && (
            <motion.p layout className="text-sm text-zinc-400 leading-relaxed">
              {actionLevel
                ? 'Resolution mode active.'
                : selectedIssue.description || `A ${displayLabel.toLowerCase()} data point from verified civic datasets.`
              }
            </motion.p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {!actionLevel && (
            <motion.div 
              key="initial-state"
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden', marginTop: -24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Metadata Grid — Date + Status + Live Attributes */}
              <div className="flex flex-col gap-4 mb-8">
                {isFacilityPanel ? (
                  <>
                    {statFields.length > 0 && (
                      <div className={`grid gap-3 ${statFields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {statFields.map(f => (
                          <div
                            key={f.key}
                            title={f.description || f.label}
                            className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800"
                          >
                            <span className="text-xl font-semibold text-white leading-none">
                              {formatNumber(f.value)}
                              {f.unit && <span className="text-xs font-medium text-zinc-400 ml-1">{f.unit}</span>}
                            </span>
                            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase truncate">{f.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {detailFields.length > 0 && (
                      <div className="flex flex-col p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Details</span>
                        {visibleDetails.map((f, i) => (
                          <div
                            key={f.key}
                            className={`flex flex-col gap-0.5 py-2.5 ${i < visibleDetails.length - 1 ? 'border-b border-zinc-800/60' : ''}`}
                          >
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug">
                              {f.label}
                              {f.description && (
                                <span title={f.description} className="cursor-help">
                                  <Info className="w-3 h-3 text-zinc-600" />
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-zinc-200 leading-snug break-words">
                              {f.numeric ? formatNumber(f.value) : f.value}
                              {f.unit && <span className="text-zinc-500 ml-1">{f.unit}</span>}
                            </span>
                          </div>
                        ))}
                        {detailFields.length > MAX_DETAILS_COLLAPSED && (
                          <button
                            onClick={() => setShowAllFields(!showAllFields)}
                            className="mt-2 text-xs font-medium text-zinc-400 hover:text-white text-left"
                          >
                            {showAllFields ? 'Show less' : `Show all ${detailFields.length} details`}
                          </button>
                        )}
                      </div>
                    )}

                    {selectedIssue.date && (
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Data last updated</span>
                        <span className="text-sm font-medium text-zinc-200">{selectedIssue.date}</span>
                      </div>
                    )}
                  </>
                ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Date</span>
                    <span className="text-sm font-medium text-zinc-200">{selectedIssue.date || 'On Record'}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Status</span>
                    <span className={`text-sm font-bold ${
                      selectedIssue.threatLevel === 'Critical' ? 'text-red-400' :
                      selectedIssue.threatLevel === 'High' ? 'text-orange-400' :
                      selectedIssue.threatLevel === 'Moderate' ? 'text-yellow-400' : 
                      selectedIssue.threatLevel === 'Action' ? 'text-emerald-400' : 'text-emerald-400'
                    }`}>
                      {(!selectedIssue.threatLevel || selectedIssue.threatLevel === 'Low') ? 'Active Facility' : 
                       selectedIssue.threatLevel === 'Action' ? 'Verified Action' : selectedIssue.threatLevel}
                    </span>
                  </div>
                </div>
                )}

                {/* Coordinates + Partner Source */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800">
                  <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-500">
                    {(selectedIssue.lat || 0).toFixed(5)}, {(selectedIssue.lng || 0).toFixed(5)}
                  </span>
                  {partner && (
                    <span className="ml-auto text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{partner}</span>
                  )}
                </div>

                {isFacilityPanel && datasetInfo && (datasetInfo.title || datasetInfo.description) && (
                  <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setAboutOpen(!aboutOpen)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">About this dataset</span>
                        <span className="text-xs text-zinc-300 truncate">
                          {[datasetInfo.title, partner].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aboutOpen && datasetInfo.description && (
                      <p className="px-4 pb-4 text-xs text-zinc-400 leading-relaxed">{datasetInfo.description}</p>
                    )}
                  </div>
                )}
              </div>

              {selectedIssue.type === 'Action' ? (
                /* --- CLEAN CIVIC ACTION DETAILS (Source Data Only — No LLM) --- */
                <div className="flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Civic Action Details</h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Classification Badge — ASSET / CHALLENGE / MOMENTUM */}
                    {(() => {
                      const cls = meta?.['Classification'] || 'CHALLENGE';
                      const cfgMap = {
                        ASSET:     { label: 'ASSET',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', spot: 'bg-emerald-500' },
                        MOMENTUM:  { label: 'MOMENTUM',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/25',    spot: 'bg-blue-500' },
                        CHALLENGE: { label: 'CHALLENGE', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25',  spot: 'bg-amber-500' },
                      };
                      const cfg = cfgMap[cls] || cfgMap.CHALLENGE;
                      return (
                        <div className={`col-span-1 p-4 rounded-2xl border flex flex-col gap-1.5 relative overflow-hidden ${cfg.bg}`}>
                          <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full opacity-20 ${cfg.spot}`} />
                          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase z-10">Classification</span>
                          <span className={`text-sm font-black z-10 tracking-wide ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      );
                    })()}

                    {/* Action Type */}
                    <div className="col-span-1 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Action Type</span>
                      <span className="text-xs font-semibold text-zinc-200 leading-snug">{meta?.['Action Type'] || '—'}</span>
                    </div>
                  </div>

                  {/* Action Detail Rows */}
                  <div className="flex flex-col gap-0 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-2">Action Details</span>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                      <span className="text-xs text-zinc-400">Civic Domain</span>
                      <span className="text-xs font-semibold text-zinc-200">{meta?.['Action Category'] || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-zinc-400">Hours Invested</span>
                      <span className="text-xs font-black text-emerald-400">
                        {meta?.['Hours Invested'] ? `${meta['Hours Invested']} hr${meta['Hours Invested'] !== 1 ? 's' : ''}` : '< 1 hr'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => completeAction(25)}
                    className="mt-1 group relative w-full flex items-center justify-center p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 transition-all text-center overflow-hidden"
                  >
                    <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <CheckCircle2 className="w-4 h-4" /> Endorse & Validate Action
                    </div>
                  </button>
                </div>
              ) : (
                /* Action Engine: Gamified Effort Levers with Google Tonal Tints */
                <div className="flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">How much time can you spare?</h3>
                  
                  {/* 10 Seconds - Emerald Tint */}
                  <button 
                    onClick={() => setActionLevel('10s')}
                    className="group relative w-full flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <div className="relative z-10">
                      <div className="text-base font-bold text-emerald-100 mb-0.5">10 Seconds</div>
                      <div className="text-xs text-emerald-500/80 font-medium">Verify issue status</div>
                    </div>
                    <div className="relative z-10 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-wide border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                      +2 XP
                    </div>
                  </button>
                  
                  {/* 2 Minutes - Indigo Tint */}
                  <button 
                    onClick={() => setActionLevel('2m')}
                    className="group relative w-full flex items-center justify-between p-5 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/30 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <div className="relative z-10">
                      <div className="text-base font-bold text-indigo-100 mb-0.5">2 Minutes</div>
                      <div className="text-xs text-indigo-500/80 font-medium">Escalate officially</div>
                    </div>
                    <div className="relative z-10 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black tracking-wide border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                      +10 XP
                    </div>
                  </button>

                  {/* Heavy Lifter - Amber Tint */}
                  <button 
                    onClick={() => setActionLevel('heavy')}
                    className="group relative w-full flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <div className="relative z-10">
                      <div className="text-base font-bold text-amber-100 mb-0.5">Heavy Lifter</div>
                      <div className="text-xs text-amber-500/80 font-medium">Pipeline resolution</div>
                    </div>
                    <div className="relative z-10 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black tracking-wide border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      +30 XP
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Solution Paths Based on Effort Level */}
          {actionLevel && !actionCompleted && (
            <motion.div
              key="action-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6"
            >
              <button 
                onClick={() => setActionLevel(null)}
                className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 w-max transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Select Different Effort
              </button>

              {/* 10 Seconds Path (Verify) */}
              {actionLevel === '10s' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Verify Status</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">Based on current intelligence, is this <strong className="text-zinc-200">{selectedIssue.type.toLowerCase()}</strong> hazard still active at this exact coordinate?</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => completeAction(2)}
                      className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Yes, still active
                    </button>
                    <button 
                      onClick={() => completeAction(2)}
                      className="flex-1 h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm shadow-lg shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4 text-zinc-400" /> No, it's resolved
                    </button>
                  </div>
                </div>
              )}

              {/* 2 Minutes Path (Official Report) */}
              {actionLevel === '2m' && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Official Escalation</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">This will dispatch an automated, geo-tagged threat dossier to the regional civic authority.</p>
                  </div>
                  
                  {/* Google Workspace Style Document Preview */}
                  <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800/60">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-300">To: Ward 44 Civic Board</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">system@samaajdata.org</div>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed font-serif">
                      <strong className="text-white">URGENT:</strong> Verified {selectedIssue.threatLevel.toLowerCase()} threat level incident regarding {selectedIssue.type.toLowerCase()} at exact coordinates [{selectedIssue.lat.toFixed(4)}, {selectedIssue.lng.toFixed(4)}]. Immediate intervention required.
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                      <Camera className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-300">evidence_img.jpg attached</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => completeAction(10)}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Dispatch Official Report
                  </button>
                </div>
              )}

              {/* Heavy Lifter Path (Horizontal Pipeline) */}
              {actionLevel === 'heavy' && (
                <div className="flex flex-col gap-6 overflow-hidden">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Ground Operations</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">Swipe through the operational pipeline for physical resolution.</p>
                  </div>
                  
                  {/* Pipeline Carousel */}
                  <div className="relative w-full h-[220px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activePipelineStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute inset-0 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex flex-col items-center justify-center text-center gap-4"
                      >
                        {activePipelineStep === 0 && (
                          <>
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                              <ShieldAlert className="w-8 h-8" />
                            </div>
                            <h5 className="text-base font-bold text-white">Phase 1: Assess & Secure</h5>
                            <p className="text-xs text-zinc-400 px-4">Establish a 2-meter safety perimeter. Ensure personal protective equipment (PPE) is worn before approaching.</p>
                          </>
                        )}
                        {activePipelineStep === 1 && (
                          <>
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                              <PackageSearch className="w-8 h-8" />
                            </div>
                            <h5 className="text-base font-bold text-white">Phase 2: Procure Materials</h5>
                            <p className="text-xs text-zinc-400 px-4">Locate the nearest civic hardware depot. For {selectedIssue.type.toLowerCase()}, specific industrial binders are required.</p>
                          </>
                        )}
                        {activePipelineStep === 2 && (
                          <>
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                              <PenTool className="w-8 h-8" />
                            </div>
                            <h5 className="text-base font-bold text-white">Phase 3: Execute & Log</h5>
                            <p className="text-xs text-zinc-400 px-4">Apply the fix. Capture 'After' evidence. Log the completion to close the threat ticket.</p>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation Dots */}
                    <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2">
                      {[0, 1, 2].map(step => (
                        <div 
                          key={step} 
                          className={`w-2 h-2 rounded-full transition-all ${activePipelineStep === step ? 'bg-amber-400 w-4' : 'bg-zinc-700'}`}
                        />
                      ))}
                    </div>

                    {/* Invisible Hitboxes for Swiping/Clicking */}
                    <div className="absolute inset-0 flex">
                      <button 
                        className="flex-1 h-full cursor-w-resize" 
                        onClick={() => setActivePipelineStep(prev => Math.max(0, prev - 1))}
                      />
                      <button 
                        className="flex-1 h-full cursor-e-resize" 
                        onClick={() => setActivePipelineStep(prev => Math.min(2, prev + 1))}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (activePipelineStep < 2) {
                        setActivePipelineStep(prev => prev + 1);
                      } else {
                        completeAction(30);
                      }
                    }}
                    className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {activePipelineStep < 2 ? 'Next Phase' : 'Initiate Ground Ops'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Completed & Flex Engine */}
          {actionCompleted && (
            <motion.div
              key="success-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* Golden XP Reward Banner */}
              <div className="relative overflow-hidden flex flex-col items-center text-center gap-2 p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.1),transparent_70%)]" />
                <motion.div 
                  initial={{ y: 50, scale: 0 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-200 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(234,179,8,0.4)] border-2 border-yellow-100"
                >
                  <Check className="w-8 h-8 text-yellow-900" strokeWidth={3} />
                </motion.div>
                <h4 className="text-xl font-bold text-white tracking-tight relative z-10">Issue Resolved</h4>
                <p className="text-sm text-zinc-400 relative z-10">
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                    +{civicPoints} Civic XP
                  </span> acquired.
                </p>
              </div>

              {/* Flex Preview Canvas */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-2">Your Impact Certificate</h3>
                
                {/* Certificate DOM to be captured */}
                <div 
                  ref={certificateRef}
                  className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-zinc-950 border border-zinc-800 flex flex-col"
                >
                  <div className="relative h-[45%] w-full">
                    <img src={`${selectedIssue.img}?t=${Date.now()}`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-zinc-950/60 to-zinc-950" />
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-white flex items-center justify-center font-black text-black text-xs">SD</div>
                      <span className="text-white font-bold text-xs tracking-widest uppercase shadow-black/50 drop-shadow-md">SamaajData</span>
                    </div>
                  </div>
                  
                  <div className="relative flex-1 p-6 flex flex-col justify-between -mt-6 z-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/30 mb-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-[10px] font-black text-yellow-400 tracking-wider">+{civicPoints} XP EARNED</span>
                      </div>
                      <h5 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">
                        {selectedIssue.type} Resolved
                      </h5>
                      <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                        "{selectedIssue.heading}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-6">
                      <div>
                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Agent</div>
                        <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                          Civic Ninja
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Date</div>
                        <div className="text-sm font-bold text-zinc-200">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Coordinates</div>
                        <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {selectedIssue.lat.toFixed(6)}, {selectedIssue.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <button 
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="w-full h-14 rounded-2xl bg-white text-black font-bold text-sm shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isGenerating ? (
                      <span className="animate-pulse flex items-center gap-2">
                        Generating Certificate...
                      </span>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" /> Share Impact Certificate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
