// Route Handler ฝั่ง Server — Bot Token ไม่หลุดไปถึงเบราว์เซอร์
export async function POST(request) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  // ถ้ายังไม่ตั้งค่า env ก็ข้ามไปเงียบๆ ไม่ให้ระบบขายพัง
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return Response.json({ ok: false, reason: 'missing telegram config' });
  }

  try {
    const { messages } = await request.json();
    const list = Array.isArray(messages) ? messages : [];

    // ส่งทีละข้อความ (ข้อความขายใหม่ และถ้ามี ก็ข้อความเตือนสต๊อก)
    for (const text of list) {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'HTML',
          }),
        }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Telegram notify error:', error);
    return Response.json({ ok: false, error: error.message });
  }
}
