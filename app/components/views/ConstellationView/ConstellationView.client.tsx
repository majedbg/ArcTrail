/**
 * Client-only wrapper for ConstellationView.
 * Remix dynamic import with ssr:false — WebGL cannot run on the server.
 */

export { ConstellationView } from "./index.js";
