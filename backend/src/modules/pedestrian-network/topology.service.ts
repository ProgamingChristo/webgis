import { SupabaseClient } from "@supabase/supabase-js";
import { PedestrianEdgeRepository } from "@/src/repositories/pedestrian-edge.repository";
import { PedestrianNodeRepository } from "@/src/repositories/pedestrian-node.repository";

export type TopologyValidationResult = {
  isValid: boolean;
  errors: string[];
};

export class TopologyService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly nodeRepo: PedestrianNodeRepository,
    private readonly edgeRepo: PedestrianEdgeRepository,
  ) {}

  /**
   * Validates the routing topology by identifying
   * self-loops, disconnected subgraphs, or duplicate
   * edges.
   *
   * This is primarily a QA method used during
   * ingestion.
   */
  async validateNetwork(
    studyAreaId: string,
    environment: string = "DUMMY",
  ): Promise<TopologyValidationResult> {
    const errors: string[] = [];

    /*
     * Prefer RPC for topology validation.
     * If the RPC is unavailable, fall back
     * to direct edge validation.
     */
    const {
      data: directSelfLoops,
      error: dslError,
    } = await this.client
      .rpc(
        "check_pedestrian_network_topology",
        {
          p_study_area_id:
            studyAreaId,
          p_environment:
            environment,
        },
      )
      .single();

    if (dslError) {
      /*
       * Fallback if the topology RPC
       * does not exist or cannot run.
       */
      const {
        data: edges,
        error: edgesError,
      } = await this.client
        .from("pedestrian_edges")
        .select(
          "id, code, source, target, length_meters",
        )
        .eq(
          "study_area_id",
          studyAreaId,
        )
        .eq(
          "environment",
          environment,
        );

      if (edgesError) {
        errors.push(
          `Failed to fetch edges: ${edgesError.message}`,
        );

        return {
          isValid: false,
          errors,
        };
      }

      edges.forEach((edge) => {
        if (
          edge.source ===
          edge.target
        ) {
          errors.push(
            `Edge ${edge.code} (${edge.id}) is a self-loop.`,
          );
        }

        if (
          Number(
            edge.length_meters,
          ) <= 0
        ) {
          errors.push(
            `Edge ${edge.code} (${edge.id}) has zero or negative length.`,
          );
        }
      });
    } else if (directSelfLoops) {
      /*
       * RPC is expected to return:
       * { errors: string[] }
       */
      errors.push(
        ...(directSelfLoops as {
          errors: string[];
        }).errors,
      );
    }

    return {
      isValid:
        errors.length === 0,
      errors,
    };
  }
}