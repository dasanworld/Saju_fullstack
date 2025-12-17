import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/toss/client", () => ({
  chargeTossPayment: vi.fn(),
  deleteTossBillingKey: vi.fn(),
}));

vi.stubEnv("TOSS_SECRET_KEY", "test_secret_key");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test_service_role_key");
