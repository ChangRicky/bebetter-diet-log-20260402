/**
 * Gemini food image analysis — calls via Supabase Edge Function
 * so the API key never leaves the server.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const EDGE_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/analyze-food-image`
  : ''

export const analyzeMealImage = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!EDGE_URL) return 'AI 分析功能未啟用（缺少 Supabase 設定）'
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ base64Image, mimeType }),
    })

    const data = await res.json()
    if (!data.ok) return data.error ?? 'AI分析時發生錯誤，請稍後再試。'
    return data.text
  } catch (error) {
    console.error('Error calling analyze-food-image edge function:', error)
    return 'AI分析時發生錯誤，請稍後再試。'
  }
}
