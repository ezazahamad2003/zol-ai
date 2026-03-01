/**
 * BACKEND: Vapi.ai integration
 * Handles AI assistant creation, system prompt generation, and phone number provisioning.
 * Called from: Stripe webhook (on subscription activation), Settings (on business update)
 */
import type { Business } from "@/types";

const VAPI_BASE = "https://api.vapi.ai";

async function vapiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi API error ${res.status}: ${text}`);
  }
  return res.json();
}

function buildSystemPrompt(business: Business): string {
  const toneMap: Record<string, string> = {
    professional: "professional and courteous",
    friendly: "warm, friendly, and conversational",
    concise: "concise, direct, and efficient",
  };
  const tone = toneMap[business.greeting_tone] ?? "professional";

  const workingHours = business.working_hours as Record<
    string,
    { open: string; close: string; enabled: boolean }
  > | null;

  const hoursText = workingHours
    ? Object.entries(workingHours)
        .filter(([, h]) => h.enabled)
        .map(([day, h]) => `${day}: ${h.open}–${h.close}`)
        .join(", ")
    : "Monday–Friday 9am–5pm";

  return `You are an AI receptionist for ${business.name}. Your tone is ${tone}.

Your job:
- Greet callers naturally
- Answer questions about our services
- Book appointments

Business details:
- Name: ${business.name}
- Timezone: ${business.timezone}
- Services: ${business.services_description ?? "General services"}
- Working hours: ${hoursText}
- Appointment duration: ${business.appointment_duration_mins} minutes

Booking flow:
1. Ask for the caller's name (required)
2. Ask for their preferred date and time — accept anything natural like "tomorrow", "Monday afternoon", "3pm today". Do NOT ask them to use a specific format.
3. Their phone number is optional — ask once, but if they'd rather not share it, proceed without it.
4. Call check_availability with whatever date and time they gave you (pass it naturally, e.g. "tomorrow", "3pm", "Monday at 2"). The system resolves it automatically.
5. If available, call create_booking to confirm. If not, suggest the next available time from the check_availability result.
6. Confirm the booking details back to the caller in plain language.

Keep the conversation natural and brief. Never mention date formats or technical details to the caller.

IMPORTANT — Purchase / sales calls:
If the caller mentions buying, purchasing, pricing, signing up, subscription, payment, or asks to speak with sales: politely let them know this line is for appointments only and direct them to visit the website or email the team. Then end the call immediately. Do not engage further on pricing or purchases.`;
}

export async function createVapiAssistant(business: Business): Promise<string> {
  const systemPrompt = buildSystemPrompt(business);
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`;

  const assistant = await vapiRequest("/assistant", {
    method: "POST",
    body: JSON.stringify({
      name: `${business.name} Receptionist`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt,
        tools: [
          {
            type: "function",
            function: {
              name: "check_availability",
              description: "Check if a date and time is available for a booking. Pass dates and times exactly as the caller described them — the system handles conversion.",
              parameters: {
                type: "object",
                properties: {
                  date: { type: "string", description: "Date as the caller said it — e.g. 'today', 'tomorrow', 'Monday', 'next Friday', '2026-03-01'" },
                  time: { type: "string", description: "Time as the caller said it — e.g. '3pm', '3:30 in the afternoon', '15:00', 'morning'" },
                },
                required: ["date", "time"],
              },
            },
            server: { url: webhookUrl },
          },
          {
            type: "function",
            function: {
              name: "create_booking",
              description: "Confirm and create the appointment booking. Use the same date and time values from check_availability.",
              parameters: {
                type: "object",
                properties: {
                  caller_name: { type: "string", description: "Full name of the caller" },
                  caller_phone: { type: "string", description: "Phone number of the caller — leave empty string if not provided" },
                  date: { type: "string", description: "Date as the caller said it — e.g. 'tomorrow', 'Monday', '2026-03-01'" },
                  time: { type: "string", description: "Time as the caller said it — e.g. '3pm', '15:00'" },
                  service: { type: "string", description: "Type of service requested (optional)" },
                },
                required: ["caller_name", "date", "time"],
              },
            },
            server: { url: webhookUrl },
          },
        ],
      },
      voice: {
        provider: "11labs",
        voiceId: business.voice_id ?? "EXAVITQu4vr4xnSDxMaL",
      },
      firstMessage: `Thank you for calling ${business.name}! How can I help you today?`,
      endCallFunctionEnabled: true,
      maxDurationSeconds: 480, // 8-minute hard cap per call
      endCallPhrases: [
        "goodbye",
        "have a great day",
        "talk to you soon",
        "we'll be in touch",
        "take care",
      ],
    }),
  });

  return assistant.id;
}

/**
 * Creates a Vapi assistant + phone number for the given business.
 * Returns the fields to write back to the DB — caller is responsible for the update.
 */
export async function provisionPhoneNumber(business: Business): Promise<{
  vapi_assistant_id: string;
  vapi_phone_number_id: string;
  phone_number: string;
}> {
  const assistantId = await createVapiAssistant(business);

  // Try area codes until one succeeds. Vapi automatically bills from credit balance
  // once the 10 free numbers per account are used up — no code change needed for that.
  const areaCodes = [
    "201", "202", "205", "206", "207", "208", "209", "210", "212", "213",
    "214", "215", "216", "217", "218", "219", "228", "229", "231", "234",
    "239", "240", "248", "251", "252", "253", "254", "256", "260", "262",
    "267", "269", "270", "272", "276", "281", "301", "302", "303", "304",
    "305", "307", "308", "309", "310", "312", "313", "314", "315", "316",
    "317", "318", "319", "320", "321", "323", "325", "330", "331", "334",
    "336", "337", "339", "346", "347", "351", "352", "360", "361", "380",
    "385", "386", "401", "402", "404", "405", "406", "407", "408", "409",
    "410", "412", "413", "414", "415", "417", "419", "423", "424", "425",
    "430", "432", "434", "435", "440", "442", "443", "458", "463", "469",
    "470", "475", "478", "479", "480", "501", "502", "503", "504", "505",
    "507", "508", "509", "510", "512", "513", "515", "516", "517", "518",
    "520", "530", "539", "540", "541", "551", "559", "561", "562", "563",
    "567", "570", "571", "573", "574", "575", "580", "585", "586", "601",
    "602", "603", "605", "606", "607", "608", "609", "610", "612", "614",
    "615", "616", "617", "618", "619", "620", "623", "626", "628", "629",
    "630", "631", "636", "641", "646", "650", "651", "657", "660", "661",
    "662", "667", "669", "678", "681", "682", "701", "702", "703", "704",
    "706", "707", "708", "712", "713", "714", "715", "716", "717", "718",
    "719", "720", "724", "725", "727", "730", "731", "732", "734", "737",
    "740", "743", "747", "754", "757", "760", "762", "763", "765", "769",
    "770", "772", "773", "774", "775", "779", "781", "785", "786", "801",
    "802", "803", "804", "805", "806", "808", "810", "812", "813", "814",
    "815", "816", "817", "818", "828", "830", "831", "832", "843", "845",
    "847", "848", "850", "854", "856", "857", "858", "859", "860", "862",
    "863", "864", "865", "870", "872", "878", "901", "903", "904", "906",
    "907", "908", "909", "910", "912", "913", "914", "915", "916", "917",
    "918", "919", "920", "925", "928", "929", "931", "936", "937", "940",
    "941", "947", "949", "951", "952", "954", "956", "959", "970", "971",
    "972", "973", "975", "978", "979", "980", "984", "985", "989",
  ];
  let phoneNumber: Record<string, string> | null = null;

  for (const areaCode of areaCodes) {
    try {
      phoneNumber = await vapiRequest("/phone-number", {
        method: "POST",
        body: JSON.stringify({
          provider: "vapi",
          assistantId,
          name: `${business.name} Line`,
          numberDesiredAreaCode: areaCode,
        }),
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("area code is currently not available")) continue;
      throw err;
    }
  }

  if (!phoneNumber) throw new Error("No available Vapi area codes. Please try again later.");

  return {
    vapi_assistant_id: assistantId,
    vapi_phone_number_id: phoneNumber.id,
    phone_number: phoneNumber.number ?? phoneNumber.phoneNumber ?? null,
  };
}

export async function getPhoneNumber(phoneNumberId: string): Promise<Record<string, string>> {
  return vapiRequest(`/phone-number/${phoneNumberId}`);
}

export async function updateVapiAssistant(business: Business): Promise<void> {
  if (!business.vapi_assistant_id) return;

  const systemPrompt = buildSystemPrompt(business);
  await vapiRequest(`/assistant/${business.vapi_assistant_id}`, {
    method: "PATCH",
    body: JSON.stringify({
      model: { provider: "openai", model: "gpt-4o-mini", systemPrompt },
      voice: {
        provider: "11labs",
        voiceId: business.voice_id ?? "EXAVITQu4vr4xnSDxMaL",
      },
      firstMessage: `Thank you for calling ${business.name}! How can I help you today?`,
    }),
  });
}
