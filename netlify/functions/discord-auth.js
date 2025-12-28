const crypto = require("crypto");
const { cookie } = require("./_session");

exports.handler = async () => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Env vars DISCORD_CLIENT_ID / DISCORD_REDIRECT_URI faltando." }),
    };
  }

  const state = crypto.randomBytes(24).toString("hex");

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "consent");

  return {
    statusCode: 302,
    multiValueHeaders: {
      "Set-Cookie": [cookie("discord_oauth_state", state, { maxAge: 10 * 60 })], // 10 min
      Location: [authUrl.toString()],
    },
    body: "",
  };
};
