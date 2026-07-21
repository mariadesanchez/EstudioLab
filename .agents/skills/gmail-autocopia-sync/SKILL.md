---
name: gmail-autocopia-sync
description: Arquitectura completa de integración Gmail - N8N - Next.js: Gmail Trigger para correos recibidos y Webhook real-time con Google Apps Script para correos enviados.
---

# 📚 Skill: Arquitectura de Sincronización de Gmail (Recibidos y Enviados)

Esta documentación explica en detalle la arquitectura del sistema para el rastreo y lectura de correos electrónicos en **EstudioLab**, la diferencia fundamental entre el tratamiento de correos **Recibidos** y **Enviados**, y la integración completa entre **Next.js**, **Google Apps Script**, **N8N** y **Google Sheets**.

---

## 🏗️ 1. Resumen de la Arquitectura

```mermaid
graph TD
    subgraph 📥 1. Correos Recibidos (Clientes hacia la Casilla)
        A[Cliente envía email] -->|Gmail Inbox| B[N8N: Gmail Trigger]
        B -->|Event: Message Received| C[N8N: Format Code Node]
        C -->|Append| D[Google Sheets: received_emails]
    end

    subgraph 📤 2. Correos Enviados (Desde la App Web)
        E[App Web Next.js] -->|POST: send_template| F[Google Apps Script]
        F -->|createDraft.send| G[Envío por Gmail API]
        G -->|Retorna realGmailId| F
        F -->|HTTP POST Real-Time 0ms| H[N8N: Webhook correos_enviados]
        H -->|Append| I[Google Sheets: sent_emails]
    end

    subgraph 👁️ 3. Lectura de Correos en Frontend (EstudioLab)
        J[Usuario hace clic en ID] --> K[Next.js: Modal de Lectura]
        K -->|GET: action=get_email_details| L[Google Apps Script]
        L -->|getMessageById| M[Cuerpo HTML devuelto]
        M --> K
    end
```

---

## 📥 2. Correos Recibidos: Nodo `Gmail Trigger` en N8N

### 💡 Justificación Técnica
El nodo nativo **`Gmail Trigger`** de N8N se basa en la API de eventos de historial de Google (`users.history.list` con el evento `messageAdded`). **La API de Google solo emite eventos de historial para correos que ingresan directamente a la Bandeja de Entrada (`INBOX`)**.

Por este motivo, el nodo `Gmail Trigger` funciona de manera **inmediata e infalible para correos entrantes (Recibidos)**.

### ⚙️ Configuración del Nodo `Gmail Trigger` en N8N
* **Resource**: `Message`
* **Event**: `Message Received`
* **Poll Times**: `Every Minute`
* **Simplify**: `ON` (Verde)

### 💻 Código del Nodo `Format Recibidos` (Code Node en N8N)
```javascript
const items = $input.all().map(item => {
  const email = item.json;
  const fromHeader = email.From || email.from || '';
  if (!fromHeader.trim()) return null;
  
  let deName = '';
  let deEmail = '';
  const match = fromHeader.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    deName = match[1].replace(/['"]/g, '').trim();
    deEmail = match[2].trim();
  } else {
    deEmail = fromHeader.trim();
    deName = fromHeader.split('@')[0];
  }

  let rawDate = email.Date || email.date || '';
  if (!rawDate && email.internalDate) {
    const timestamp = parseInt(email.internalDate);
    if (!isNaN(timestamp)) rawDate = new Date(timestamp).toISOString();
  }

  return {
    json: {
      ID: email.id,
      Fecha: rawDate,
      De: deName || deEmail,
      Email: deEmail,
      Asunto: email.Subject || email.subject || '(Sin Asunto)'
    }
  };
});

return items.filter(item => item !== null);
```

---

## 📤 3. Correos Enviados: Integración por Webhook en Apps Script

### ⚠️ ¿Por qué NO se usa `Gmail Trigger` para Enviados?
Google Gmail **NO posee un trigger de historial de creación para la carpeta de Enviados (`SENT`)**. Intentar usar `Gmail Trigger` o autocopias (BCC) genera:
1. **Demoras**: Requiere temporizadores (polling) continuos.
2. **Duplicación de Filas**: Gmail agrupa los mensajes enviados al mismo destinatario en un solo hilo de conversación (`Thread`). Al intentar mover hilos a la papelera o marcarlos, N8N vuelve a leer conversaciones anteriores.
3. **Dependencia Externa**: Requería tener extensiones de Chrome (Auto BCC) y filtros en Gmail activos todo el tiempo.

### ✅ La Solución Definitiva: Webhook Directo desde Apps Script
Cuando la aplicación web envía un correo, **Google Apps Script gestiona el envío y dispara un Webhook HTTP POST en tiempo real (0 ms de espera)** a N8N.

#### Ventajas:
* **0 milisegundos de espera** para el registro.
* **0 duplicados** en Google Sheets.
* Captura el **ID nativo real de 16 caracteres de Gmail** (`sentMessage.getId()`).
* Mantiene siempre el nombre completo del destinatario (*Lola Sánchez*).
* No requiere extensiones de Chrome ni reglas adicionales.

---

## 🤖 4. Flujo JSON de N8N (`correos_enviados`)

Importa este flujo en N8N para recibir los datos del Webhook:

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "correos_enviados",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "id": "webhook-correos-enviados",
      "name": "Webhook Correos Enviados",
      "webhookId": "correos_enviados"
    },
    {
      "parameters": {
        "operation": "append",
        "documentId": {
          "__rl": true,
          "value": "1amG7d_7Fwr6djEZW8fAzR0caCQfpdaoTwWq8T0NMf8s",
          "mode": "list",
          "cachedResultName": "Gmail"
        },
        "sheetName": {
          "__rl": true,
          "value": 2049086685,
          "mode": "list",
          "cachedResultName": "sent_emails"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "ID": "={{ $json.body.ID }}",
            "Fecha": "={{ $json.body.Fecha }}",
            "Para": "={{ $json.body.Para }}",
            "Email": "={{ $json.body.Email }}",
            "Asunto": "={{ $json.body.Asunto }}"
          }
        }
      },
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.7,
      "position": [220, 0],
      "id": "sheets-append-sent",
      "name": "Append a sent_emails"
    }
  ],
  "connections": {
    "Webhook Correos Enviados": {
      "main": [[{ "node": "Append a sent_emails", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## 🛠️ 5. Código de Google Apps Script (`google-apps-script.js`)

Pega este código en el editor de Google Apps Script de tu planilla:

```javascript
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "send_template") {
      var recipients = data.recipients || [];
      var sentCount = 0;
      
      for (var i = 0; i < recipients.length; i++) {
        var recipient = recipients[i];
        var emailAddress = recipient.email || recipient.Email || "";
        if (!emailAddress) continue;
        
        var firstName = recipient.Nombre || recipient.nombre || "";
        var lastName = recipient.Apellido || recipient.apellido || "";
        var fullName = (firstName + " " + lastName).trim();
        var nombreLimpio = firstName || "contacto";
        
        var subject = data.subject || "Mensaje";
        var body = data.body ? data.body.replace(/\[aqui iría el nombre del contacto\]/gi, nombreLimpio) : "";
        var safeBodyHtml = body.replace(/\n/g, "<br>");
        var htmlBody = "<div style=\"font-family: sans-serif;\">" + safeBodyHtml + "</div>";
        
        // 1. Enviar correo y obtener ID nativo de 16 caracteres de Gmail
        var recipientFormatted = fullName ? ("\"" + fullName + "\" <" + emailAddress + ">") : emailAddress;
        var draft = GmailApp.createDraft(recipientFormatted, subject, body, { htmlBody: htmlBody });
        var sentMessage = draft.send();
        
        var realGmailId = sentMessage.getId();
        var realThreadId = sentMessage.getThread().getId();
        var gmailLink = "https://mail.google.com/mail/?authuser=abordajeintegraldeconflictos@gmail.com#search/" + realGmailId;
        
        // 2. Disparar Webhook real-time hacia N8N
        var webhookUrl = "https://agendar.app.n8n.cloud/webhook/correos_enviados";
        try {
          var payload = {
            ID: realGmailId,
            ThreadID: realThreadId,
            GmailLink: gmailLink,
            Fecha: new Date().toISOString(),
            Para: fullName || emailAddress,
            Email: emailAddress,
            Asunto: subject,
            Cuerpo: body
          };
          
          UrlFetchApp.fetch(webhookUrl, {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });
        } catch (webhookErr) {
          Logger.log("Error Webhook N8N: " + webhookErr.message);
        }
        
        sentCount++;
      }
      
      result = { status: "success", message: "Se enviaron " + sentCount + " correos." };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action || "all";
  var result = {};
  
  function getSheetData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    return rows;
  }
  
  if (action === "all") {
    result = { status: "success", contacts: getSheetData("contactos"), sent: getSheetData("sent_emails"), received: getSheetData("received_emails") };
  } else if (action === "get_email_details") {
    var msgId = e.parameter.id;
    try {
      var msg = GmailApp.getMessageById(msgId);
      result = {
        status: "success",
        id: msg.getId(),
        threadId: msg.getThread().getId(),
        subject: msg.getSubject(),
        from: msg.getFrom(),
        to: msg.getTo(),
        date: msg.getDate().toISOString(),
        body: msg.getBody(),
        plainBody: msg.getPlainBody()
      };
    } catch (msgErr) {
      result = { status: "error", message: "No se encontró el mensaje: " + msgErr.toString() };
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// Función auxiliar para autorizar permisos de red (UrlFetchApp) desde el editor
function autorizar() {
  GmailApp.getInboxUnreadCount();
  var response = UrlFetchApp.fetch("https://agendar.app.n8n.cloud/webhook/correos_enviados", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ ID: "test" }),
    muteHttpExceptions: true
  });
  Logger.log("Código HTTP: " + response.getResponseCode());
}
```

---

## 👁️ 6. Lectura Nativa de Correos en Next.js (Modal)

En la aplicación **Next.js** (`src/app/page.tsx`), al presionar cualquier botón de **ID** (`ID: 19f7a90d...`), la App consulta al proxy API (`/api/data?action=get_email_details&id=...`) y despliega un modal elegante con el contenido completo del correo y opción de abrirlo en Gmail Web mediante el parámetro multicuenta oficial `authuser`:

```
https://mail.google.com/mail/?authuser=abordajeintegraldeconflictos@gmail.com#search/[ID_O_ASUNTO]
```

---

## 👤 7. Función `+ Cliente` (Creación de Hojas por Contacto vía Apps Script)

Al seleccionar uno o más contactos en la lista y presionar el botón **`+ Cliente`**:
1. La app ejecuta la acción `create_client_sheet` enviando los contactos a Google Apps Script.
2. Apps Script se ejecuta directamente en la hoja activa (`SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName)`) y crea una nueva pestaña por cliente (ej. *Federico Fernandez Sánchez*) con encabezados formateados en azul (`Fecha`, `Email`, `Asunto / Trámite`, `Estado / Notas`, `ID`).
3. No requiere flujo adicional en N8N ya que la creación es 100% nativa e instantánea.

