import { eveChannel } from "eve/channels/eve";
import { localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the Eve TUI and Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Placeholder for browser requests in production — swap for Auth.js,
    // Clerk, or `none()` for a public demo before going live.
    placeholderAuth(),
  ],
});
