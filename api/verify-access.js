export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const GHL_PIT_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_PAID_TAG = "paid-160-assessment";

  // Log env var presence (not values) for debugging
  console.log("ENV CHECK — token present:", !!GHL_PIT_TOKEN, "| location present:", !!GHL_LOCATION_ID);

  try {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email.toLowerCase().trim())}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_PIT_TOKEN}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      }
    );

    console.log("GHL search status:", searchRes.status);

    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      console.error("GHL search error body:", errBody);
      return res.status(200).json({ granted: false, reason: "ghl_error", status: searchRes.status });
    }

    const data = await searchRes.json();
    console.log("GHL response keys:", Object.keys(data));

    // GHL may return contacts under different keys depending on endpoint
    const contacts = data.contacts || data.data || [];
    console.log("Contacts found:", contacts.length);

    if (contacts.length === 0) {
      return res.status(200).json({ granted: false, reason: "no_contact" });
    }

    const contact = contacts[0];
    console.log("Contact ID:", contact.id, "| Tags raw:", JSON.stringify(contact.tags));

    // GHL tags can be strings OR objects with { name } — handle both
    const tags = (contact.tags || []).map(t => (typeof t === "string" ? t : t.name || ""));
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
    console.error("verify-access exception:", e.message);
    return res.status(200).json({ granted: false, reason: "exception", error: e.message });
  }
}
