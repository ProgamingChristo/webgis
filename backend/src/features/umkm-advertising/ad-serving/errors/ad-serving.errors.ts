export class AdServingContextInvalidError extends Error {
  constructor(message = "Konteks koordinat ad-serving tidak valid.") {
    super(message);
    this.name = "AdServingContextInvalidError";
  }
}

export class CampaignNotServableError extends Error {
  constructor(message = "Campaign tidak memenuhi syarat untuk ditayangkan.") {
    super(message);
    this.name = "CampaignNotServableError";
  }
}
