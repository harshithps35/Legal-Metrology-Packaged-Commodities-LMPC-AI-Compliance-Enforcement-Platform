import React from 'react';
import { Play, Sparkles, ArrowRight, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export default function ExtejGuidanceCard({
  title = "Watch a demo:",
  subtitle = "Unlock compliance clearance with verified LMPC Packaging Declarations.",
  bulletPoints = [
    "Field Inspector automated optical scanning",
    "15-Day Resolution Desk SLA compliance",
    "On-site Vernier caliper measurement logs",
    "Official QR verification and certificate vault",
  ],
  videoDuration = "1 Minute",
  onOpenInfo,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 text-slate-800">
      <div className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-3xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
          Guide
        </span>
      </div>

      {/* Video Thumbnail Box with Play Button */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 aspect-video flex items-center justify-center border border-slate-800 group shadow-md cursor-pointer">
        {/* Mock visual layers */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:12px_12px]" />
        
        {/* Red/Blue Play Button Pill */}
        <div className="w-12 h-10 rounded-2xl bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all group-hover:scale-110 z-10">
          <Play className="w-5 h-5 fill-white ml-0.5" />
        </div>

        <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-black/70 text-white text-3xs font-mono font-bold">
          {videoDuration}
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {subtitle}
      </p>

      {/* Bullet Items */}
      <div className="space-y-1.5 pt-1">
        {bulletPoints.map((bp, idx) => (
          <div key={idx} className="flex items-start gap-2 text-2xs text-slate-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{bp}</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-3xs text-slate-600 font-bold uppercase tracking-wider font-mono">
          LMPC Rules 2011
        </span>
        <button
          onClick={onOpenInfo}
          className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 group cursor-pointer"
        >
          <span>More Info</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
