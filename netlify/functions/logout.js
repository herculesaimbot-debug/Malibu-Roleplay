const { cookie } = require("./_session");

exports.handler = async () => {
  return {
    statusCode: 200,
    multiValueHeaders: {
      "Set-Cookie": [
        cookie("discord_session", "", { maxAge: 0 }),
        cookie("discord_oauth_state", "", { maxAge: 0 }),
      ],
    },
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
