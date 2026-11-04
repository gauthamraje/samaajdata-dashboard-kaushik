/**
 * SamaajData — Centralized API Configuration
 *
 * In local development: points to localhost:5000 (your Docker backend)
 * In production (GitHub Pages / Vercel): reads REACT_APP_API_URL from .env.production
 *
 * To set production URL: create a .env.production file in the react root:
 *   REACT_APP_API_URL=https://your-railway-backend.up.railway.app
 *
 * AGENTS.md Rule: ALWAYS use /api/point/:dp_id for marker clicks — NEVER /get_details
 */
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Address users add to Claude as a custom connector. nginx serves the MCP at /mcp on
// the same host as the dashboard, so the fallback follows whichever server we're on.
export const MCP_URL = process.env.REACT_APP_MCP_URL || `${window.location.origin}/mcp`;

export default API_BASE;
