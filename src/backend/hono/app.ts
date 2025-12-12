import { Hono } from 'hono';
import { clerkMiddleware } from '@hono/clerk-auth';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withSupabase } from '@/backend/middleware/supabase';
import { registerExampleRoutes } from '@/features/example/backend/route';
import { registerAuthRoutes } from '@/features/auth/backend/route';
import { registerTestRoutes } from '@/features/test/backend/route';
import { registerSubscriptionRoutes } from '@/features/subscription/backend/route';
import { registerCronRoutes } from '@/features/cron/backend/route';
import type { AppEnv } from '@/backend/hono/context';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  if (singletonApp && process.env.NODE_ENV === 'production') {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', clerkMiddleware({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }));
  app.use('*', withSupabase());

  registerExampleRoutes(app);
  registerAuthRoutes(app);
  registerTestRoutes(app);
  registerSubscriptionRoutes(app);
  registerCronRoutes(app);

  if (process.env.NODE_ENV === 'production') {
    singletonApp = app;
  }

  return app;
};
