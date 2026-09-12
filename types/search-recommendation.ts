/** Shared intent only: no model-generated merchants, coordinates, ratings, or distances. */
export interface SearchCriteria {
  query: string;
  max_budget: number | null;
  open_now: boolean;
  max_walking_minutes: number | null;
  reference_text: string | null;
  near_user: boolean;
  radius_meters: number | null;
  sort: "RELEVANCE" | "NEAREST" | "PRICE_ASC";
}

export interface AiSearchAction {
  type: "APPLY_SEARCH_CRITERIA";
  criteria: SearchCriteria;
}
