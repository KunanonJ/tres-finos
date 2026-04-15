import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface ErrorPayload {
  error: {
    code: string;
    message: string;
    detail?: string;
  };
}

export type ParsedJsonResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse<ErrorPayload> };

const getErrorDetail = (error: unknown) => (error instanceof Error ? error.message : "Unknown error");

export const parseJsonBody = async <T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<ParsedJsonResult<T>> => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: "invalid_request_body",
              message: "Request body validation failed.",
              detail: parsed.error.issues
                .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
                .join("; "),
            },
          },
          { status: 400 },
        ),
      };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: "invalid_json",
            message: "Request body must be valid JSON.",
            detail: getErrorDetail(error),
          },
        },
        { status: 400 },
      ),
    };
  }
};

export const serverErrorResponse = (error: unknown, message: string) =>
  NextResponse.json(
    {
      error: {
        code: "internal_error",
        message,
        detail: getErrorDetail(error),
      },
    },
    { status: 500 },
  );
