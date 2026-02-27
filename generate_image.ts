import { GoogleGenAI } from "@google/genai";

async function generateAndLogImage() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'Medical illustration of a human body silhouette for pain mapping, front, back, and side views, minimalist clean 2D vector style, light grey outlines on a pure white background, high resolution, anatomical proportions, no shadows, no textures, professional clinical aesthetic.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            console.log("IMAGE_START");
            console.log(part.inlineData.data);
            console.log("IMAGE_END");
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

generateAndLogImage();
