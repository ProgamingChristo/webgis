"use client";

import React, { useState, useMemo } from "react";
import { CampaignTarget, TargetType, GeoJSONFeature, StudyAreaSummary } from "../types/targeting.types";
import { TargetingTypeSelector } from "./targeting-type-selector";
import { RadiusTargetingForm } from "./radius-targeting-form";
import { StudyAreaSelector } from "./study-area-selector";
import { TargetingMap } from "./targeting-map";
import { TargetingPreview } from "./targeting-preview";
import { DEFAULT_RADIUS_METERS } from "../schemas/targeting.schema";

interface TargetingEditorProps {
  target: CampaignTarget | null;
  studyAreas: StudyAreaSummary[];
  loadingStudyAreas?: boolean;
  saving?: boolean;
  disabled?: boolean;
  onSave: (payload: { target_type: TargetType; radius_meters?: number; study_area_id?: string }) => Promise<any>;
}

export function TargetingEditor({
  target,
  studyAreas,
  loadingStudyAreas = false,
  saving = false,
  disabled = false,
  onSave,
}: TargetingEditorProps) {
  const [selectedType, setSelectedType] = useState<TargetType>(
    target?.targetType || "RADIUS"
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(
    target?.radiusMeters || DEFAULT_RADIUS_METERS
  );
  const [selectedStudyAreaId, setSelectedStudyAreaId] = useState<string>(
    target?.studyAreaId || (studyAreas[0]?.id ?? "")
  );

  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Derive preview GeoJSON for real-time map preview before saving
  const activePreviewGeoJSON = useMemo<GeoJSONFeature | null>(() => {
    if (selectedType === "RADIUS") {
      // If we have existing preview from backend matching radius, use it, or approximate
      if (target?.previewGeoJSON && target.radiusMeters === radiusMeters && target.targetType === "RADIUS") {
        return target.previewGeoJSON;
      }
      if (target?.merchantLocation) {
        return approximateCircleGeoJSON(
          target.merchantLocation.longitude,
          target.merchantLocation.latitude,
          radiusMeters
        );
      }
      return null;
    }

    if (selectedType === "STUDY_AREA") {
      const area = studyAreas.find((a) => a.id === selectedStudyAreaId);
      if (area && area.geometry) {
        return {
          type: "Feature",
          geometry: typeof area.geometry === "string" ? JSON.parse(area.geometry) : area.geometry,
          properties: {
            target_type: "STUDY_AREA",
            study_area_id: area.id,
            name: area.name,
          },
        };
      }
      if (target?.previewGeoJSON && target.studyAreaId === selectedStudyAreaId) {
        return target.previewGeoJSON;
      }
    }

    return null;
  }, [selectedType, radiusMeters, selectedStudyAreaId, target, studyAreas]);

  const handleSave = async () => {
    try {
      setFeedbackError(null);
      setFeedbackSuccess(null);

      if (selectedType === "STUDY_AREA" && !selectedStudyAreaId) {
        setFeedbackError("Pilih salah satu Study Area terlebih dahulu.");
        return;
      }

      await onSave({
        target_type: selectedType,
        radius_meters: selectedType === "RADIUS" ? radiusMeters : undefined,
        study_area_id: selectedType === "STUDY_AREA" ? selectedStudyAreaId : undefined,
      });

      setFeedbackSuccess("Target kampanye berhasil disimpan.");
    } catch (err: any) {
      setFeedbackError(err.message || "Gagal menyimpan targeting.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-4">
          <TargetingTypeSelector
            value={selectedType}
            onChange={(type) => {
              setSelectedType(type);
              setFeedbackSuccess(null);
            }}
            disabled={disabled || saving}
          />

          {selectedType === "RADIUS" ? (
            <RadiusTargetingForm
              radiusMeters={radiusMeters}
              onChange={(meters) => {
                setRadiusMeters(meters);
                setFeedbackSuccess(null);
              }}
              merchantLocation={target?.merchantLocation || null}
              disabled={disabled || saving}
            />
          ) : (
            <StudyAreaSelector
              studyAreas={studyAreas}
              selectedId={selectedStudyAreaId}
              onChange={(id) => {
                setSelectedStudyAreaId(id);
                setFeedbackSuccess(null);
              }}
              loading={loadingStudyAreas}
              disabled={disabled || saving}
            />
          )}

          {/* Feedback alerts */}
          {feedbackError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
              {feedbackError}
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-md border border-emerald-200 flex items-center space-x-1.5 font-medium">
              <span>✅</span>
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {/* Save Action */}
          <div className="pt-2">
            <button
              type="button"
              disabled={disabled || saving}
              onClick={handleSave}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Menyimpan Target...</span>
                </>
              ) : (
                <span>Simpan Target Area</span>
              )}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Perubahan target area tersimpan sebagai konfigurasi draf campaign.
            </p>
          </div>

          {/* Summary Preview Card */}
          <div className="pt-2">
            <TargetingPreview target={target} />
          </div>
        </div>

        {/* Right Column: Map Preview */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500 font-semibold px-1">
            <span>Peta Preview Jangkauan Promosi</span>
            <span className="text-emerald-700 font-bold">
              {selectedType === "RADIUS" ? `${radiusMeters} Meter` : "Zona Poligon"}
            </span>
          </div>

          <TargetingMap
            merchantLocation={target?.merchantLocation || null}
            previewGeoJSON={activePreviewGeoJSON}
            targetType={selectedType}
            radiusMeters={radiusMeters}
          />
        </div>
      </div>
    </div>
  );
}

function approximateCircleGeoJSON(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64
): GeoJSONFeature {
  const coordinates: [number, number][] = [];
  const distanceKm = radiusMeters / 1000;
  const earthRadiusKm = 6371;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const dRad = distanceKm / earthRadiusKm;

  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const pointLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(dRad) +
        Math.cos(latRad) * Math.sin(dRad) * Math.cos(bearing)
    );
    const pointLngRad =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dRad) * Math.cos(latRad),
        Math.cos(dRad) - Math.sin(latRad) * Math.sin(pointLatRad)
      );

    const pointLng = ((pointLngRad * 180) / Math.PI + 540) % 360 - 180;
    const pointLat = (pointLatRad * 180) / Math.PI;
    coordinates.push([pointLng, pointLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {
      target_type: "RADIUS",
      radius_meters: radiusMeters,
      center: [lng, lat],
    },
  };
}
