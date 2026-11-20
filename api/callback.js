export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("Missing Strava authorization code.");
  }

  const formBody = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code: String(code),
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: formBody.toString(),
  });

  const text = await tokenRes.text();

  console.log("Status:", tokenRes.status);
  console.log("Response:", text);

  const data = await tokenRes.json();
  if (!tokenRes.ok || !data.athlete?.id) {
    return res.status(400).json({ error: "Strava OAuth failed", details: data });
  }

  // Save user tokens into Supabase using your secret key
  const sbRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      athlete_id: data.athlete.id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    }),
  });

  if (!sbRes.ok) {
    return res.status(500).send("Failed to save user in Supabase.");
  }

  // Redirect back to the map with ?connected=1
  res.redirect(302, "/?connected=1");
}
