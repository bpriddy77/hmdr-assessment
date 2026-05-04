export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const GHL_PIT_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_PAID_TAG = "paid-160-assessment";

  console.log("ENV CHECK — token:", !!GHL_PIT_TOKEN, "| location:", !!GHL_LOCATION_ID);

  try {
    const cleanEmail = email.toLowerCase().trim();

    // GHL GET /contacts/ uses `query` param (not `email`) for search
    const url = `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(cleanEmail)}&limit=5`;
    console.log("Fetching:", url);

    const searchRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${GHL_PIT_TOKEN}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });

    console.log("GHL status:", searchRes.status);

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      console.error("GHL error:", errBody);
      return res.status(200).json({ granted: false, reason: "ghl_error", status: searchRes.status, detail: errBody });
    }

    const data = await searchRes.json();
    console.log("Response keys:", Object.keys(data));

    const contacts = data.contacts || data.data || [];
    console.log("Contacts returned:", contacts.length);

    // Filter to exact email match since query is a fuzzy search
    const contact = contacts.find(c => (c.email || "").toLowerCase() === cleanEmail);
    console.log("Exact match found:", !!contact, contact ? contact.id : "none");

    if (!contact) {
      return res.status(200).json({ granted: false, reason: "no_contact" });
    }

    console.log("Tags raw:", JSON.stringify(contact.tags));

    // GHL tags can be strings or objects — handle both
    const tags = (contact.tags || []).map(t => typeof t === "string" ? t : (t.name || ""));
    console.log("Tags normalized:", tags);

    if (!tags.includes(GHL_PAID_TAG)) {
      return res.status(200).json({ granted: false, reason: "no_tag", tagsFound: tags });
    }

    return res.status(200).json({
      granted: true,
      contactId: contact.id,
      contactName: contact.firstName || "",
    });

  } catch (e) {
    console.error("Exception:", e.message);
    return res.status(200).json({ granted: false, reason: "exception", error: e.message });
  }
}
