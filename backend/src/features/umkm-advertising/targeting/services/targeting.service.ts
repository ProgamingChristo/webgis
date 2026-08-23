import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { TargetingRepository } from "../repositories/targeting.repository";
import { TargetingSpatialService } from "./targeting-spatial.service";
import { SaveTargetingInput } from "../schemas/targeting.schema";
import { CampaignTargetDTO } from "../dto/targeting.dto";
import { mapTargetRowToDTO } from "../mappers/targeting.mapper";
import {
  CampaignNotEditableError,
  MerchantGeometryInvalidError,
  StudyAreaNotFoundError,
  TargetingNotAuthorizedError,
} from "../errors/targeting.errors";

export class TargetingService {
  private readonly targetingRepo: TargetingRepository;
  private readonly spatialService: TargetingSpatialService;
  private readonly eligibilityService: AdvertisingEligibilityService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.targetingRepo = new TargetingRepository(supabase);
    this.spatialService = new TargetingSpatialService(supabase);
    const ownershipService = new MerchantOwnershipService(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
  }

  private async verifyCampaignOwnershipAndStatus(
    merchantId: string,
    campaignId: string,
    requireDraft = true
  ) {
    const { data: campaign, error: campaignError } = await this.supabase
      .from("ad_campaigns")
      .select("id, merchant_id, status")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      throw new TargetingNotAuthorizedError("Campaign tidak ditemukan");
    }

    if (campaign.merchant_id !== merchantId) {
      throw new TargetingNotAuthorizedError("Merchant tidak memiliki campaign ini");
    }

    if (requireDraft && campaign.status !== "DRAFT") {
      throw new CampaignNotEditableError(
        `Targeting tidak dapat diubah karena status campaign adalah ${campaign.status}`
      );
    }

    const isEligible = await this.eligibilityService.verifyEligibility(merchantId);
    if (!isEligible) {
      throw new TargetingNotAuthorizedError("Merchant tidak eligible untuk advertising");
    }

    return campaign;
  }

  async getCampaignTarget(
    merchantId: string,
    campaignId: string
  ): Promise<CampaignTargetDTO> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId, false);

    const [targetRow, merchantLoc] = await Promise.all([
      this.targetingRepo.findTargetByCampaignId(campaignId),
      this.targetingRepo.getMerchantLocation(merchantId),
    ]);

    if (!targetRow) {
      return mapTargetRowToDTO({
        row: null,
        campaignId,
        merchantLocation: merchantLoc,
        studyArea: null,
        previewGeoJSON: null,
      });
    }

    let previewGeoJSON = null;
    let studyAreaSummary = null;

    if (targetRow.target_type === "RADIUS" && targetRow.radius_meters && merchantLoc) {
      previewGeoJSON = await this.spatialService.generateRadiusBufferGeoJSON(
        merchantLoc.longitude,
        merchantLoc.latitude,
        targetRow.radius_meters
      );
    } else if (targetRow.target_type === "STUDY_AREA" && targetRow.study_area_id) {
      const studyArea = await this.targetingRepo.getStudyArea(targetRow.study_area_id);
      if (studyArea) {
        studyAreaSummary = {
          id: studyArea.id,
          name: studyArea.name,
          description: studyArea.description,
        };
        previewGeoJSON = this.spatialService.formatStudyAreaGeoJSON(
          studyArea.id,
          studyArea.geometry,
          { name: studyArea.name }
        );
      }
    }

    return mapTargetRowToDTO({
      row: targetRow,
      campaignId,
      merchantLocation: merchantLoc,
      studyArea: studyAreaSummary,
      previewGeoJSON,
    });
  }

  async saveCampaignTarget(
    merchantId: string,
    campaignId: string,
    input: SaveTargetingInput
  ): Promise<CampaignTargetDTO> {
    await this.verifyCampaignOwnershipAndStatus(merchantId, campaignId, true);

    const merchantLoc = await this.targetingRepo.getMerchantLocation(merchantId);

    if (input.target_type === "RADIUS") {
      if (!merchantLoc) {
        throw new MerchantGeometryInvalidError(
          "Lokasi merchant belum diatur atau tidak valid. Radius targeting membutuhkan lokasi merchant yang valid."
        );
      }

      const savedRow = await this.targetingRepo.upsertTarget({
        campaignId,
        targetType: "RADIUS",
        radiusMeters: input.radius_meters,
        studyAreaId: null,
        centerGeometry: `POINT(${merchantLoc.longitude} ${merchantLoc.latitude})`,
      });

      const previewGeoJSON = await this.spatialService.generateRadiusBufferGeoJSON(
        merchantLoc.longitude,
        merchantLoc.latitude,
        input.radius_meters
      );

      return mapTargetRowToDTO({
        row: savedRow,
        campaignId,
        merchantLocation: merchantLoc,
        studyArea: null,
        previewGeoJSON,
      });
    }

    if (input.target_type === "STUDY_AREA") {
      const studyArea = await this.targetingRepo.getStudyArea(input.study_area_id);
      if (!studyArea) {
        throw new StudyAreaNotFoundError("Study area yang dipilih tidak ditemukan");
      }

      const savedRow = await this.targetingRepo.upsertTarget({
        campaignId,
        targetType: "STUDY_AREA",
        radiusMeters: null,
        studyAreaId: input.study_area_id,
      });

      const previewGeoJSON = this.spatialService.formatStudyAreaGeoJSON(
        studyArea.id,
        studyArea.geometry,
        { name: studyArea.name }
      );

      return mapTargetRowToDTO({
        row: savedRow,
        campaignId,
        merchantLocation: merchantLoc,
        studyArea: {
          id: studyArea.id,
          name: studyArea.name,
          description: studyArea.description,
        },
        previewGeoJSON,
      });
    }

    throw new Error("Target type tidak didukung");
  }
}
