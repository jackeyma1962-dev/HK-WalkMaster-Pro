import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.

export const getRouteInsights = async (start: string, end: string, distance: string) => {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        console.warn("API Key not found in process.env.API_KEY");
        return "AI Insight currently unavailable.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const model = "gemini-2.5-flash";
        
        const prompt = `
        I am planning a walking route in Hong Kong from ${start} to ${end}. 
        The total distance is ${distance}.
        
        Please provide a short, engaging response (max 80 words) that includes:
        1. One interesting fact about the area I'm walking through.
        2. One specific safety tip for pedestrians in this part of HK.
        3. A motivational sentence.
        
        Keep the tone professional yet encouraging.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        return "AI Insight currently unavailable. Enjoy your walk!";
    }
};