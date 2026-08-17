import type {
  CreateTransportNodeInput,
  UpdateTransportNodeInput,
} from "@/src/types/domain";

export type ExternalEntityWrite = {
  entity_kind: "transport_node";
  create_input: CreateTransportNodeInput;
  update_input: UpdateTransportNodeInput;
};
