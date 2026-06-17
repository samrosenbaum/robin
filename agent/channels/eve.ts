import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

export default eveChannel({
  // Public demo — Launch Intelligence has no per-user state to protect.
  // Swap for Auth.js / Clerk / vercelOidc before this turns into a real
  // product with multi-tenant data.
  auth: [none()],
});
