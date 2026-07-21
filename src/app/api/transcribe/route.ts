import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const n8nWebhookUrl = 'https://agendar.app.n8n.cloud/webhook/742468d3-6644-42a9-83ef-614cd0528ef1';

    let res: Response;

    if (contentType.includes('application/json')) {
      const jsonBody = await req.json();
      res = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonBody),
      });
    } else {
      const formData = await req.formData();
      const audioFile = formData.get('audio') || formData.get('file');

      const n8nFormData = new FormData();
      if (audioFile) {
        n8nFormData.append('file', audioFile);
        n8nFormData.append('data', audioFile);
        n8nFormData.append('audio', audioFile);
      }

      res = await fetch(n8nWebhookUrl, {
        method: 'POST',
        body: n8nFormData,
      });
    }

    if (!res.ok) {
      // Intentar fallback si el webhook en N8N requiere GET
      res = await fetch(n8nWebhookUrl, { method: 'GET' });
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ status: 'error', message: errText || 'Error desde Webhook N8N' }, { status: 500 });
    }

    let data;
    const resText = await res.text();
    try {
      data = JSON.parse(resText);
    } catch {
      data = { text: resText };
    }

    let transcribedText = '';

    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    if (typeof data === 'string') {
      transcribedText = data;
    } else if (data && typeof data === 'object') {
      if (data.text) {
        transcribedText = typeof data.text === 'object' ? (data.text.text || JSON.stringify(data.text)) : String(data.text);
      } else if (data.transcription) {
        transcribedText = String(data.transcription);
      } else if (data.output) {
        transcribedText = String(data.output);
      } else {
        transcribedText = resText;
      }
    } else {
      transcribedText = resText;
    }

    return NextResponse.json({
      status: 'success',
      text: transcribedText
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Error al procesar la transcripción de voz'
    }, { status: 500 });
  }
}
