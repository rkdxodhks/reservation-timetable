import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseAnonKey ? "Set" : "Not set");

// 임시 테스트용 설정 - 실제 Supabase 프로젝트가 있다면 이 값들을 변경하세요
const fallbackUrl = "https://your-project.supabase.co";
const fallbackKey = "your-anon-key";

const finalUrl = supabaseUrl || fallbackUrl;
const finalKey = supabaseAnonKey || fallbackKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase environment variables are not set!");
  console.warn("Please create a .env file in the project root with:");
  console.warn("REACT_APP_SUPABASE_URL=your-supabase-url");
  console.warn("REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key");
  console.warn(
    "Using fallback values (will not work for real database operations)"
  );
}

// Supabase 클라이언트 생성
let supabase;
try {
  supabase = createClient(finalUrl, finalKey);
  console.log("✅ Supabase client created successfully");
} catch (error) {
  console.error("❌ Failed to create Supabase client:", error);
  // 빈 클라이언트 객체 생성 (오류 방지)
  supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }),
      insert: () => ({
        select: () =>
          Promise.resolve({
            data: null,
            error: { message: "Supabase not configured" },
          }),
      }),
      delete: () => ({
        match: () =>
          Promise.resolve({ error: { message: "Supabase not configured" } }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
  };
}

export { supabase };
