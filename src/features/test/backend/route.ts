import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "@hono/clerk-auth";
import type { AppEnv } from "@/backend/hono/context";
import { respond, failure } from "@/backend/http/response";
import {
  createTestRequestSchema,
  testListQuerySchema,
  testParamsSchema,
} from "./schema";
import { createTest, getTestList, getTestDetail } from "./service";
import { testErrorCodes } from "./error";

export const registerTestRoutes = (app: Hono<AppEnv>) => {
  app.post(
    "/api/test/create",
    zValidator("json", createTestRequestSchema) as never,
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return respond(
          c,
          failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
        );
      }

      const supabase = c.get("supabase");
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", auth.userId)
        .single();

      if (!dbUser) {
        return respond(
          c,
          failure(404, testErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
        );
      }

      const body = await c.req.json();
      const parsed = createTestRequestSchema.parse(body);

      return respond(c, await createTest(c, dbUser.id, parsed));
    }
  );

  app.get("/api/test/list", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (!dbUser) {
      return respond(
        c,
        failure(404, testErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
      );
    }

    const query = testListQuerySchema.parse({
      name: c.req.query("name"),
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    });

    return respond(c, await getTestList(supabase, dbUser.id, query));
  });

  app.get("/api/test/:id", async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return respond(
        c,
        failure(401, testErrorCodes.INTERNAL_ERROR, "인증이 필요합니다")
      );
    }

    const supabase = c.get("supabase");
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (!dbUser) {
      return respond(
        c,
        failure(404, testErrorCodes.INTERNAL_ERROR, "사용자를 찾을 수 없습니다")
      );
    }

    const params = testParamsSchema.parse({ id: c.req.param("id") });

    return respond(c, await getTestDetail(supabase, dbUser.id, params.id));
  });
};
