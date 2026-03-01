import { NextResponse } from "next/server";

export type VoiceOption = {
  voice_id: string;
  name: string;
  description: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  age: string;
  preview_url: string;
};

// Curated list of ElevenLabs premade voices suited for a professional receptionist.
// Preview URLs are publicly accessible — no auth required.
const VOICES: VoiceOption[] = [
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    description: "Confident and warm, mature quality with a reassuring, professional tone.",
    gender: "female",
    accent: "American",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3",
  },
  {
    voice_id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    description: "Playful, bright and warm. Young and popular, perfect for trendy content.",
    gender: "female",
    accent: "American",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3",
  },
  {
    voice_id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    description: "A professional woman with a pleasing alto pitch. Suitable for many use cases.",
    gender: "female",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3",
  },
  {
    voice_id: "hpp4J3VqNfWAUOO0d1Us",
    name: "Bella",
    description: "Warm, bright, and professional. Crisp diction and deliberate pace.",
    gender: "female",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3",
  },
  {
    voice_id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    description: "Clear and engaging, friendly with a British accent. Suitable for professional use.",
    gender: "female",
    accent: "British",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3",
  },
  {
    voice_id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    description: "Velvety British voice that delivers with warmth and clarity.",
    gender: "female",
    accent: "British",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3",
  },
  {
    voice_id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    description: "Sunny enthusiasm with a quirky attitude. Great for engaging conversations.",
    gender: "female",
    accent: "American",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/67341759-ad08-41a5-be6e-de12fe448618.mp3",
  },
  {
    voice_id: "SAz9YHcvj6GT2YYXdXww",
    name: "River",
    description: "Relaxed, neutral and informative. Calm and ready for conversational projects.",
    gender: "neutral",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3",
  },
  {
    voice_id: "cjVigY5qzO86Huf0OWal",
    name: "Eric",
    description: "Smooth and trustworthy tenor pitch. Perfect for agentic and receptionist use cases.",
    gender: "male",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3",
  },
  {
    voice_id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    description: "Deep, resonant and comforting. Great for narrations and professional interactions.",
    gender: "male",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/2dd3e72c-4fd3-42f1-93ea-abc5d4e5aa1d.mp3",
  },
  {
    voice_id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    description: "Charming and down-to-earth. Natural and real, great across many use-cases.",
    gender: "male",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3",
  },
  {
    voice_id: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    description: "Relaxed optimist. Conversational and laid back.",
    gender: "male",
    accent: "American",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3",
  },
  {
    voice_id: "pqHfZKP75CvOlQylNhV4",
    name: "Bill",
    description: "Wise, mature and balanced. Friendly and comforting for narrations.",
    gender: "male",
    accent: "American",
    age: "Old",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3",
  },
  {
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    description: "Warm, captivating storyteller with a resonant British voice.",
    gender: "male",
    accent: "British",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3",
  },
  {
    voice_id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    description: "Steady broadcaster. Perfect for delivering professional and formal content.",
    gender: "male",
    accent: "British",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3",
  },
  {
    voice_id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    description: "Laid-back, casual and resonant. Easy going for casual conversations.",
    gender: "male",
    accent: "American",
    age: "Middle-aged",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
  },
  {
    voice_id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    description: "Deep, confident and energetic. Young Australian male, great for dynamic interactions.",
    gender: "male",
    accent: "Australian",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3",
  },
  {
    voice_id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    description: "Energetic social media creator. Young adult with energy and warmth.",
    gender: "male",
    accent: "American",
    age: "Young",
    preview_url: "https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3",
  },
];

export async function GET() {
  return NextResponse.json(VOICES);
}
