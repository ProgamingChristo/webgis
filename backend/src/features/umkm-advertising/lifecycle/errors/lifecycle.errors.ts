export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign tidak ditemukan.") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}

export class CampaignNotOwnedError extends Error {
  constructor(message = "Merchant tidak memiliki campaign ini atau Anda tidak berwenang.") {
    super(message);
    this.name = "CampaignNotOwnedError";
  }
}

export class CampaignNotReadyError extends Error {
  constructor(message = "Campaign belum memenuhi syarat kesiapan (readiness).") {
    super(message);
    this.name = "CampaignNotReadyError";
  }
}

export class ScheduleInvalidError extends Error {
  constructor(message = "Jadwal campaign tidak valid.") {
    super(message);
    this.name = "ScheduleInvalidError";
  }
}

export class CampaignTerminalError extends Error {
  constructor(message = "Campaign sudah berstatus terminal (ENDED atau CANCELLED).") {
    super(message);
    this.name = "CampaignTerminalError";
  }
}

export class CampaignNotPausableError extends Error {
  constructor(message = "Campaign hanya dapat di-pause jika berstatus SCHEDULED atau ACTIVE.") {
    super(message);
    this.name = "CampaignNotPausableError";
  }
}

export class CampaignNotResumableError extends Error {
  constructor(message = "Campaign hanya dapat di-resume jika berstatus PAUSED.") {
    super(message);
    this.name = "CampaignNotResumableError";
  }
}

export class CampaignNotEditableError extends Error {
  constructor(message = "Jadwal campaign tidak dapat diubah pada status ini.") {
    super(message);
    this.name = "CampaignNotEditableError";
  }
}
