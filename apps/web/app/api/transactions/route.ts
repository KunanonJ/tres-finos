import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDashboardData } from "@/lib/dashboardData";
import { parseJsonBody, serverErrorResponse } from "@/lib/requestValidation";

const transactionQuerySchema = z.object({
  month: z.string().trim().min(1).optional(),
  direction: z.enum(["IN", "OUT"]).optional(),
  query: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(200).optional(),
  limit: z.number().int().positive().max(100).default(25),
});

export const POST = async (request: NextRequest) => {
  try {
    const parsedRequest = await parseJsonBody(request, transactionQuerySchema);

    if (!parsedRequest.success) {
      return parsedRequest.response;
    }

    const { month, direction, query, category, limit } = parsedRequest.data;
    const normalizedQuery = query?.toLowerCase();
    const dashboardData = await getDashboardData();
    const matched = dashboardData.transactions.filter((transaction) => {
      if (month && transaction.month !== month) {
        return false;
      }

      if (direction && transaction.direction !== direction) {
        return false;
      }

      if (category && transaction.category !== category) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        transaction.description.toLowerCase().includes(normalizedQuery) ||
        transaction.counterparty.toLowerCase().includes(normalizedQuery) ||
        transaction.category.toLowerCase().includes(normalizedQuery) ||
        transaction.transactionCode.toLowerCase().includes(normalizedQuery)
      );
    });
    const items = matched.slice(0, limit);

    return NextResponse.json({
      total: matched.length,
      returned: items.length,
      items,
    });
  } catch (error) {
    return serverErrorResponse(error, "Unable to filter transactions.");
  }
};
