import type { Database } from "@/src/types/database.types";
import type { JsonObject } from "@/src/types/provenance";

export type DatasetVersionRow = Database["public"]["Tables"]["dataset_versions"]["Row"];
export type DatasetVersionStatus = Database["public"]["Enums"]["dataset_version_status"];

export interface DatasetVersion extends Omit<DatasetVersionRow, "manifest"> {
  manifest: JsonObject;
}

export type CreateDatasetVersionInput = Omit<
  Database["public"]["Tables"]["dataset_versions"]["Insert"],
  "id" | "created_at" | "updated_at" | "status" | "manifest"
> & {
  manifest?: JsonObject;
  status?: DatasetVersionStatus;
};

export type UpdateDatasetVersionInput = Omit<
  Database["public"]["Tables"]["dataset_versions"]["Update"],
  "id" | "created_at" | "updated_at" | "manifest"
> & {
  manifest?: JsonObject;
};
