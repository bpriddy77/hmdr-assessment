export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const GHL_PIT_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_PAID_TAG = "paid-160-assessment";

  console.log("ENV CHECK — token:", !!GHL_PIT_TOKEN, "| location:", !!GHL_LOCATION_ID, "| loc value:", GHL_LOCATION_ID);

  try {
    // Use GET /contacts with query params — simpler and well-supported
    const url = `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email.toLowerCase().trim())}&limit=1`;
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
    console.log("Contacts found:", contacts.length);

    if (contacts.length === 0) {
      return res.status(200).json({ granted: false, reason: "no_contact" });
    }

    const contact = contacts[0];
    console.log("Contact:", contact.id, contact.email);
    console.log("Tags raw:", JSON.stringify(contact.tags));

    // Handle tags as strings or objects
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
