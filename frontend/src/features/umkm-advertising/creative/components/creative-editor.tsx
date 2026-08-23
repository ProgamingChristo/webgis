"use client";
import React, { useState } from "react";
import { CreativeDTO, CtaType, CreativeType } from "../types/creative.types";
import { CreateCreativeInput, UpdateCreativeInput } from "../schemas/creative.schema";

interface CreativeEditorProps {
  creative: CreativeDTO | null;
  onSaveDraft: (data: CreateCreativeInput | UpdateCreativeInput) => Promise<void>;
  onMarkReady: (creativeId: string) => Promise<void>;
  onUploadImage: (creativeId: string, file: File) => Promise<void>;
  loading: boolean;
}

export function CreativeEditor({ creative, onSaveDraft, onMarkReady, onUploadImage, loading }: CreativeEditorProps) {
  const [headline, setHeadline] = useState(creative?.headline || "");
  const [description, setDescription] = useState(creative?.description || "");
  const [ctaType, setCtaType] = useState<CtaType>(creative?.ctaType || "VIEW_PROFILE");
  const [creativeType, setCreativeType] = useState<CreativeType>(creative?.creativeType || "SPONSORED_PIN");

  const handleSave = async () => {
    if (creative) {
      await onSaveDraft({ headline, description, cta_type: ctaType });
    } else {
      await onSaveDraft({ creative_type: creativeType, headline, description, cta_type: ctaType });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && creative) {
      await onUploadImage(creative.id, e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Creative Content</h3>
        
        {!creative && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Creative Type</label>
            <select 
              value={creativeType} 
              onChange={e => setCreativeType(e.target.value as CreativeType)}
              className="w-full border rounded p-2 text-sm"
              disabled={loading}
            >
              <option value="SPONSORED_PIN">Sponsored Pin</option>
              <option value="CONTEXTUAL_BANNER">Contextual Banner</option>
              <option value="PROFILE_POSTER">Profile Poster</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Headline</label>
          <input 
            type="text" 
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            className="w-full border rounded p-2 text-sm"
            placeholder="Misal: Paket Mahasiswa Rp18.000"
            maxLength={50}
            disabled={loading || creative?.status === "READY"}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{headline.length}/50</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description (Optional)</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border rounded p-2 text-sm"
            placeholder="Nasi + Lauk + Minum"
            maxLength={100}
            rows={3}
            disabled={loading || creative?.status === "READY"}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{description.length}/100</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Call to Action (CTA)</label>
          <select 
            value={ctaType} 
            onChange={e => setCtaType(e.target.value as CtaType)}
            className="w-full border rounded p-2 text-sm"
            disabled={loading || creative?.status === "READY"}
          >
            <option value="VIEW_PROFILE">Lihat Profil</option>
            <option value="REQUEST_ROUTE">Minta Rute</option>
          </select>
        </div>

        {creative && creative.status === "DRAFT" && (
          <div className="mb-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium mb-1">Image (Optional)</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={loading}
              className="text-sm"
            />
            <div className="text-xs text-gray-500 mt-1">Format: JPG, PNG, WEBP. Maks: 5MB.</div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {(!creative || creative.status === "DRAFT") && (
            <button 
              onClick={handleSave} 
              disabled={loading || !headline.trim()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              Simpan Draft
            </button>
          )}
          {creative && creative.status === "DRAFT" && (
            <button 
              onClick={() => onMarkReady(creative.id)} 
              disabled={loading || !headline.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              Mark as Ready
            </button>
          )}
          {creative && creative.status === "READY" && (
            <div className="text-green-600 text-sm font-semibold flex items-center">
              ✓ Creative is Ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
