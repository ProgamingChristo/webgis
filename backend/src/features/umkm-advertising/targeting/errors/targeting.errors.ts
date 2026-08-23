export class TargetingError extends Error {
  constructor(message: string, public readonly code: string = "TARGETING_ERROR") {
    super(message);
    this.name = "TargetingError";
  }
}

export class CampaignNotEditableError extends TargetingError {
  constructor(message = "Campaign tidak dapat diubah karena bukan berstatus DRAFT") {
    super(message, "CAMPAIGN_NOT_EDITABLE");
  }
}

export class MerchantGeometryInvalidError extends TargetingError {
  constructor(message = "Lokasi merchant tidak valid untuk targeting radius") {
    super(message, "MERCHANT_GEOMETRY_INVALID");
  }
}

export class StudyAreaNotFoundError extends TargetingError {
  constructor(message = "Study area tidak ditemukan atau tidak valid") {
    super(message, "STUDY_AREA_NOT_FOUND");
  }
}

export class TargetingNotAuthorizedError extends TargetingError {
  constructor(message = "Anda tidak memiliki izin untuk mengonfigurasi targeting campaign ini") {
    super(message, "TARGETING_NOT_AUTHORIZED");
  }
}
