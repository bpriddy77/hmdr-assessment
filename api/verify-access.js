export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const GHL_PIT_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const GHL_PAID_TAG = "paid-160-assessment";

  try {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_PIT_TOKEN}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      }
    );

    if (!searchRes.ok) {
      return res.status(200).json({ granted: false, reason: "ghl_error" });
    }

    const data = await searchRes.json();
    const contacts = data.contacts || [];

    if (contacts.length === 0) {
      return res.status(200).json({ granted: false, reason: "no_contact" });
    }

    const contact = contacts[0];
    const tags = contact.tags || [];

    if (!tags.includes(GHL_PAID_TAG)) {
      return res.status(200).json({ granted: false, reason: "no_tag" });
    }

    return res.status(200).json({
      granted: true,
      contactId: contact.id,
      contactName: contact.firstName || "",
    });
  } catch (e) {
    console.error("verify-access error:", e);
    return res.status(200).json({ granted: false, reason: "exception" });
  }
}
