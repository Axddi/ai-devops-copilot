import { handlers } from "@/auth";

const demoNotFound = () => new Response(null, { status: 404 });

export const GET =
  process.env.PUBLIC_DEMO_MODE === "true" ? demoNotFound : handlers.GET;
export const POST =
  process.env.PUBLIC_DEMO_MODE === "true" ? demoNotFound : handlers.POST;