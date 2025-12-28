const { parseCookies, cookie, createSessionCookie } = require("./_session");

exports.handler = async (event) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!clientId || !clientSecret || !redirectUri || !sessionSecret) {
    return {
      statusCode: 500,
      headers: { "Cache-Control": "no-store" },
      body: "Env vars faltando (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_REDIRECT_URI / SESSION_SECRET).",
    };
  }

  const qs = event.queryStringParameters || {};
  const code = qs.code;
  const state = qs.state;

  const cookies = parseCookies(event.headers?.cookie || "");
  const savedState = cookies.discord_oauth_state;

  if (!code || !state || !savedState || state !== savedState) {
    return { statusCode: 400, headers: { "Cache-Control": "no-store" }, body: "OAuth state inválido. Tente novamente." };
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return { statusCode: 400, headers: { "Cache-Control": "no-store" }, body: `Falha ao obter token: ${JSON.stringify(tokenData)}` };
  }

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const me = await meRes.json();
  if (!meRes.ok) {
    return { statusCode: 400, headers: { "Cache-Control": "no-store" }, body: `Falha ao obter usuário: ${JSON.stringify(me)}` };
  }

  const user = {
    id: me.id,
    username: me.username,
    avatar: me.avatar || null,
    email: me.email || null,
  };

  const sessionValue = createSessionCookie(user, sessionSecret, 60 * 60 * 24 * 7);

  return {
    statusCode: 302,
    headers: {
      "Set-Cookie": cookie("discord_session", sessionValue, { maxAge: 60 * 60 * 24 * 7 }),
      "Location": "/#home",
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
