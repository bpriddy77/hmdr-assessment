export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contactId, taproot, constellation, version } = req.body;
  if (!contactId || !taproot) return res.status(400).json({ error: "Missing required fields" });

  const GHL_PIT_TOKEN = process.env.GHL_PIT_TOKEN;
  const GHL_COMPLETED_TAG = "hmdr-160-completed";

  const customFields = [
    { key: "hmdr160_primary_taproot",    field_value: taproot },
    { key: "hmdr_constellation_root_1",  field_value: constellation[0] || "" },
    { key: "hmdr_constellation_root_2",  field_value: constellation[1] || "" },
    { key: "hmdr_constellation_root_3",  field_value: constellation[2] || "" },
    { key: "hmdr_constellation_root_4",  field_value: constellation[3] || "" },
    { key: "hmdr_constellation_root_5",  field_value: constellation[4] || "" },
    { key: "hmdr_assessment_version",    field_value: version || "2.0.0" },
  ];

  try {
    // Update custom fields
    const updateRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GHL_PIT_TOKEN}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customFields }),
      }
    );

    // Add completion tag
    const tagRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/tags`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_PIT_TOKEN}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: [GHL_COMPLETED_TAG] }),
      }
    );

    const updateOk = updateRes.ok;
    const tagOk = tagRes.ok;

    return res.status(200).json({
      success: updateOk && tagOk,
      fieldsUpdated: updateOk,
      tagAdded: tagOk,
    });
  } catch (e) {
    console.error("save-results error:", e);
    return res.status(500).json({ success: false, error: "Exception saving results" });
  }
}
