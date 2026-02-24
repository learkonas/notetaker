import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import dotenv from "dotenv";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const redirectUri =
  process.env.GMAIL_REDIRECT_URI ?? "http://127.0.0.1:53682/oauth2callback";

if (!clientId || !clientSecret) {
  throw new Error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in apps/cloud_job/.env first.");
}

const parsedRedirectUri = new URL(redirectUri);
if (
  parsedRedirectUri.hostname !== "127.0.0.1" &&
  parsedRedirectUri.hostname !== "localhost"
) {
  throw new Error("GMAIL_REDIRECT_URI must use localhost or 127.0.0.1.");
}

const listenPort = Number(parsedRedirectUri.port || "80");
const listenHost = parsedRedirectUri.hostname;
const callbackPath = parsedRedirectUri.pathname;
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.modify",
  ],
});

console.log("\nOpen this URL in your browser and approve access:\n");
console.log(authUrl);
console.log(`\nWaiting for OAuth callback on ${redirectUri} ...\n`);

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? "/", `${parsedRedirectUri.protocol}//${parsedRedirectUri.host}`);
    if (reqUrl.pathname !== callbackPath) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const code = reqUrl.searchParams.get("code");
    if (!code) {
      res.statusCode = 400;
      res.end("Missing code");
      return;
    }

    const tokenResponse = await oauth2Client.getToken(code);
    const refreshToken = tokenResponse.tokens.refresh_token;
    res.statusCode = 200;
    res.end("Success. You can close this tab.");

    if (!refreshToken) {
      console.error("\nNo refresh token returned.");
      console.error("Try again and ensure prompt=consent, or revoke prior app consent first.");
      process.exitCode = 1;
      server.close();
      return;
    }

    console.log("\nGMAIL_REFRESH_TOKEN:\n");
    console.log(refreshToken);
    console.log("\nPut this value in apps/cloud_job/.env as GMAIL_REFRESH_TOKEN.");
    server.close();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    res.statusCode = 500;
    res.end("Error");
    server.close();
  }
});

server.listen(listenPort, listenHost);
