import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the Eve TUI and Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Public demo — Launch Intelligence has no per-user state. Swap for
    // Auth.js / Clerk before this turns into a real product.
    none(),
  ],
});
