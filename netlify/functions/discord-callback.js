const { parseCookies, cookie, createSessionCookie } = require("./_session");

exports.handler = async (event) => {
  const { code, state } = event.queryStringParameters || {};
  const cookies = parseCookies(event.headers?.cookie || "");

  if (!code || cookies.discord_oauth_state !== state) {
    return { statusCode: 400, body: "OAuth inválido" };
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  // ✅ seu cargo (se você definir DISCORD_ROLE_ID no Netlify, ele usa o do env; se não, usa este)
  const roleId = process.env.DISCORD_ROLE_ID || "1337846745404539040";

  if (!guildId || !botToken) {
    return { statusCode: 500, body: "Env vars faltando (DISCORD_GUILD_ID / DISCORD_BOT_TOKEN)." };
  }

  // 1) Trocar code por access_token
  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  });

  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) {
    return { statusCode: 400, body: "Erro ao obter token: " + JSON.stringify(token) };
  }

  const accessToken = token.access_token;

  // 2) Pegar usuário
  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const me = await meRes.json();
  if (!meRes.ok || !me.id) {
    return { statusCode: 400, body: "Erro ao obter usuário: " + JSON.stringify(me) };
  }

  // 3) Verificar se já é membro (para preservar roles)
  let member = null;
  const checkRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (checkRes.status === 200) {
    member = await checkRes.json();
  } else if (checkRes.status === 404) {
    // 4) Não é membro -> adicionar ao servidor
    const addRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!(addRes.status === 201 || addRes.status === 204)) {
      const txt = await addRes.text().catch(() => "");
      return { statusCode: 400, body: `Erro ao adicionar no servidor: ${addRes.status} ${txt}` };
    }

    // Re-buscar member para pegar roles atuais (geralmente [])
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (memberRes.ok) member = await memberRes.json();
  } else {
    const txt = await checkRes.text().catch(() => "");
    return { statusCode: 400, body: `Erro ao verificar membro: ${checkRes.status} ${txt}` };
  }

  // 5) Aplicar cargo automático sem apagar cargos existentes
  const currentRoles = Array.isArray(member?.roles) ? member.roles : [];
  const hasRole = currentRoles.includes(roleId);

  if (!hasRole) {
    const newRoles = [...currentRoles, roleId];

    const roleRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles: newRoles }),
    });

    if (!roleRes.ok) {
      const txt = await roleRes.text().catch(() => "");
      return { statusCode: 400, body: `Erro ao aplicar cargo: ${roleRes.status} ${txt}` };
    }
  }

  // 6) Criar sessão (igual ao seu fluxo)
  const session = createSessionCookie(me, process.env.SESSION_SECRET, 604800);

  return {
    statusCode: 302,
    headers: {
      "Set-Cookie": cookie("discord_session", session, { maxAge: 604800 }),
      Location: "/",
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
