import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      console.error('GOOGLE_SCRIPT_URL environment variable is not defined.');
      return NextResponse.json(
        { status: 'error', message: 'Falta la configuración de GOOGLE_SCRIPT_URL en el servidor (.env.local).' },
        { status: 500 }
      );
    }
    
    // Consultar el Google Apps Script Web App pasando todos los query parameters
    const queryString = searchParams.toString();
    const url = queryString ? `${scriptUrl}?${queryString}` : scriptUrl;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Evitamos que Next.js cachee y nos dé datos viejos del Sheets
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { status: 'error', message: `Google Sheets API respondió con error (Código ${response.status})` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en API Proxy GET /api/data:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Error de conexión interno del servidor.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    
    if (!scriptUrl) {
      console.error('GOOGLE_SCRIPT_URL environment variable is not defined.');
      return NextResponse.json(
        { status: 'error', message: 'Falta la configuración de GOOGLE_SCRIPT_URL en el servidor (.env.local).' },
        { status: 500 }
      );
    }

    console.log(`Fetch proxy POST: reenviando petición con acción '${body.action || 'indefinida'}' a Google Apps Script...`);
    
    // Google Apps Script requiere text/plain en POST y manejo manual de redirección 302 para retornar la respuesta
    let response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    });

    if (response.status === 302 || response.status === 301 || response.status === 307) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        response = await fetch(redirectUrl, {
          method: 'GET',
          cache: 'no-store'
        });
      }
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { status: 'success', message: responseText };
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en POST /api/data:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Error interno de red en el servidor.' },
      { status: 500 }
    );
  }
}
