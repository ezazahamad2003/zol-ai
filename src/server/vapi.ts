/**
 * BACKEND: Vapi.ai integration
 * Handles AI assistant creation, system prompt generation, and phone number provisioning.
 * Called from: Stripe webhook (on subscription activation), Settings (on business update)
 */
import { createServiceClient } from "@/server/supabase/service";
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

Your job is to:
1. Greet callers warmly
2. Understand what they need
3. Answer questions about our services
4. Book appointments by checking availability and confirming a time

Business details:
- Name: ${business.name}
- Timezone: ${business.timezone}
- Services: ${business.services_description ?? "General services"}
- Working hours: ${hoursText}
- Appointment duration: ${business.appointment_duration_mins} minutes

When booking:
- Ask for the caller's name, phone number, and preferred date/time
- Use the check_availability tool to verify the slot is open
- Use the create_booking tool to confirm the appointment
- If unavailable, suggest the next available slot

Always be helpful. If you cannot help, offer to take a message.`;
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
      },
      voice: {
        provider: "11labs",
        voiceId: "sarah",
      },
      firstMessage: `Thank you for calling ${business.name}! How can I help you today?`,
      tools: [
        {
          type: "function",
          function: {
            name: "check_availability",
            description: "Check if a date/time slot is available for booking an appointment",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                time: { type: "string", description: "Time in HH:MM 24h format" },
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
            description: "Create a confirmed appointment booking",
            parameters: {
              type: "object",
              properties: {
                caller_name: { type: "string", description: "Full name of the caller" },
                caller_phone: { type: "string", description: "Phone number of the caller" },
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                time: { type: "string", description: "Time in HH:MM 24h format" },
                service: { type: "string", description: "Type of service requested" },
              },
              required: ["caller_name", "caller_phone", "date", "time"],
            },
          },
          server: { url: webhookUrl },
        },
      ],
      endCallFunctionEnabled: true,
    }),
  });

  return assistant.id;
}

export async function provisionPhoneNumber(businessId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (!business) throw new Error("Business not found");
  if (business.phone_number) return; // Already provisioned

  const assistantId = await createVapiAssistant(business);

  const phoneNumber = await vapiRequest("/phone-number", {
    method: "POST",
    body: JSON.stringify({
      provider: "twilio",
      assistantId,
      name: `${business.name} Line`,
    }),
  });

  await supabase
    .from("businesses")
    .update({
      vapi_assistant_id: assistantId,
      vapi_phone_number_id: phoneNumber.id,
      phone_number: phoneNumber.number,
    })
    .eq("id", businessId);
}

export async function updateVapiAssistant(business: Business): Promise<void> {
  if (!business.vapi_assistant_id) return;

  const systemPrompt = buildSystemPrompt(business);
  await vapiRequest(`/assistant/${business.vapi_assistant_id}`, {
    method: "PATCH",
    body: JSON.stringify({
      model: { provider: "openai", model: "gpt-4o-mini", systemPrompt },
      firstMessage: `Thank you for calling ${business.name}! How can I help you today?`,
    }),
  });
}
