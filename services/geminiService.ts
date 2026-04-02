
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const analyzeMealImage = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!ai) return 'AI 分析功能未啟用（缺少 API Key）';
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    const prompt = `請針對這張圖片中的食物進行營養分析。
    - 分析結果請用繁體中文呈現。
    - 格式要清晰易懂，適合長輩閱讀。
    - 先條列式列出圖片中的主要食物。
    - 接著，提供一個簡單的總結和建議。
    - 請不要使用任何 markdown 符號，例如 '#' 或 '*'。
    - 整個回覆請用純文字，方便閱讀。`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    
    return response.text;
  } catch (error) {
    console.error("Error analyzing image with Gemini API:", error);
    return "AI分析時發生錯誤，請稍後再試。";
  }
};
