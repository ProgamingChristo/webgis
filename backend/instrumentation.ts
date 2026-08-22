import { initializeBackendOnce } from "@/src/config/bootstrap";

export async function register() {
  await initializeBackendOnce();
}
