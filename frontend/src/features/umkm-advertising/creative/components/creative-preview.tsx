import React from "react";
import { CreativeDTO } from "../types/creative.types";

interface CreativePreviewProps {
  creative: CreativeDTO | null;
  merchantName: string;
}

export function CreativePreview({ creative, merchantName }: CreativePreviewProps) {
  if (!creative) {
    return (
      <div className="border border-dashed border-gray-300 rounded p-4 text-center text-gray-500 text-sm h-full flex items-center justify-center min-h-[300px]">
        Preview will appear here
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden shadow-sm max-w-sm mx-auto bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{merchantName}</div>
          <div className="text-xs text-gray-500">Sponsored</div>
        </div>
      </div>

      {/* Media */}
      {creative.imagePath ? (
        <div className="aspect-video bg-gray-100 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={creative.imagePath.startsWith('http') ? creative.imagePath : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/advertising-creatives/${creative.imagePath}`} 
            alt="Creative"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gray-50 flex items-center justify-center border-b border-gray-100">
          <span className="text-gray-400 text-sm">No Image</span>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h4 className="font-bold text-gray-900 text-base mb-1">{creative.headline || "Headline"}</h4>
        {creative.description && (
          <p className="text-sm text-gray-600 mb-3">{creative.description}</p>
        )}
        
        {/* CTA */}
        <div className="mt-3 block w-full text-center bg-blue-50 text-blue-600 font-medium py-2 rounded text-sm cursor-pointer hover:bg-blue-100 transition-colors">
          {creative.ctaType === "VIEW_PROFILE" ? "Lihat Profil" : "Minta Rute"}
        </div>
      </div>
    </div>
  );
}
