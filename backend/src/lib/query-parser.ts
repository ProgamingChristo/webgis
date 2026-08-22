import { NextRequest } from "next/server";
import { ApplicationError } from "@/src/lib/errors";

export function parseSortQuery<T extends string>(
  req: NextRequest | URL, 
  allowedFields: T[], 
  defaultField?: T,
  defaultOrder: "asc" | "desc" = "desc"
): { sort: T | undefined; order: "asc" | "desc" } {
  const url = req instanceof NextRequest ? req.nextUrl : req;
  const sort = url.searchParams.get("sort");
  const orderRaw = url.searchParams.get("order")?.toLowerCase();

  let order: "asc" | "desc" = defaultOrder;
  if (orderRaw === "asc" || orderRaw === "desc") {
    order = orderRaw;
  } else if (orderRaw) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Sort order must be either 'asc' or 'desc'.",
    );
  }

  if (!sort) {
    return { sort: defaultField, order };
  }

  if (!allowedFields.includes(sort as T)) {
    throw new ApplicationError("VALIDATION_ERROR", `Field '${sort}' is not allowed for sorting.`);
  }

  return { sort: sort as T, order };
}

export function parseSearchQuery(req: NextRequest | URL): string | undefined {
  const url = req instanceof NextRequest ? req.nextUrl : req;
  const search = url.searchParams.get("search");
  return search ? search.trim() : undefined;
}
