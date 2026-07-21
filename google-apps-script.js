/**
 * CÓDIGO DE GOOGLE APPS SCRIPT PARA TU PANEL DE GMAIL & CONTACTOS
 * 
 * Instrucciones de instalación:
 * 1. En tu Google Sheet, ve a: Extensiones > Apps Script.
 * 2. Borra cualquier código existente en el editor de código.
 * 3. Pega este código completo en el editor.
 * 4. Guarda el proyecto haciendo clic en el icono del disco (Guardar proyecto).
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) > "Nueva implementación".
 * 6. Haz clic en el icono del engranaje de configuración y selecciona "Aplicación web".
 * 7. Configura las siguientes opciones exactamente así:
 *    - Descripción: API de lectura de correos y contactos
 *    - Ejecutar como: Mí (tu correo de Google)
 *    - Quién tiene acceso: Cualquiera (esto permite que tu app local Next.js consulte los datos)
 * 8. Haz clic en "Implementar". Si te solicita autorizar permisos, otórgalos.
 * 9. Copia la "URL de la aplicación web" (termina en /exec) y guárdala para pegarla en tu archivo .env.local.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Función auxiliar para convertir filas de una hoja de cálculo a objetos JSON
  function getSheetData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    if (values.length <= 1) return []; // Vacío o solo cabeceras
    
    var headers = values[0];
    var data = [];
    
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var obj = {};
      var hasData = false;
      
      for (var j = 0; j < headers.length; j++) {
        var key = typeof headers[j] === "string" ? headers[j].trim() : headers[j];
        if (key) {
          var val = row[j];
          
          // Formatear fechas a ISO string
          if (val instanceof Date) {
            val = val.toISOString();
          }
          
          obj[key] = val;
          if (val !== "") {
            hasData = true;
          }
        }
      }
      
      if (hasData) {
        data.push(obj);
      }
    }
    return data;
  }
  
  var action = e.parameter.action || "all";
  var result = {};
  
  try {
    if (action === "all") {
      var allSheets = ss.getSheets();
      var clientSheetsMap = {};

      for (var s = 0; s < allSheets.length; s++) {
        var sheetObj = allSheets[s];
        var name = sheetObj.getName();

        if (name !== "contacts" && name !== "sent_emails" && name !== "received_emails" && name !== "fichas_clientes" && name !== "Hoja 1") {
          var statusVal = "Activo";
          var dataValues = sheetObj.getDataRange().getValues();

          if (dataValues.length >= 2) {
            var headers = dataValues[0];
            var estadoColIndex = -1;
            for (var h = 0; h < headers.length; h++) {
              if (String(headers[h]).trim().toLowerCase() === "estado") {
                estadoColIndex = h;
                break;
              }
            }
            if (estadoColIndex !== -1 && dataValues[1].length > estadoColIndex) {
              var val = String(dataValues[1][estadoColIndex]).trim();
              if (val) {
                statusVal = val;
              }
            }
          }

          clientSheetsMap[name] = {
            exists: true,
            status: statusVal
          };
        }
      }

      result = {
        status: "success",
        contacts: getSheetData("contacts"),
        sent_emails: getSheetData("sent_emails"),
        received_emails: getSheetData("received_emails"),
        clientSheets: clientSheetsMap
      };
    } else if (action === "contacts") {
      result = { status: "success", data: getSheetData("contacts") };
    } else if (action === "sent") {
      result = { status: "success", data: getSheetData("sent_emails") };
    } else if (action === "received") {
      result = { status: "success", data: getSheetData("received_emails") };
    } else if (action === "get_email_details") {
      var searchId = e.parameter.id || "";
      result = getEmailDetailsById(searchId);
    } else if (action === "get_client_sheet_details") {
      var clientName = e.parameter.clientName || "";
      var clientEmail = e.parameter.email || "";
      result = getClientSheetDetails(clientName, clientEmail);
    } else {
      result = { status: "error", message: "Acción no válida" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Crea y mantiene actualizada la pestaña 'fichas_clientes'
 * con la lista completa de todos los clientes que tienen su pestaña individual creada.
 * Optimizado con verificación previa (Smart Diffing) para evitar escrituras y reformatos innecesarios.
 */
function updateFichasClientesSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var fichasSheet = ss.getSheetByName("fichas_clientes");
  if (!fichasSheet) {
    fichasSheet = ss.insertSheet("fichas_clientes");
  }

  // Garantizar encabezado solo si está vacío
  if (fichasSheet.getRange(1, 1).getValue() !== "Nombre") {
    var headers = [["Nombre", "Apellido", "Email"]];
    var headerRange = fichasSheet.getRange(1, 1, 1, 3);
    headerRange.setValues(headers);
    headerRange
      .setFontWeight("bold")
      .setFontSize(11)
      .setBackground("#7e22ce")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    fichasSheet.setRowHeight(1, 36);
  }

  var allSheets = ss.getSheets();
  var rowsData = [];

  for (var s = 0; s < allSheets.length; s++) {
    var sObj = allSheets[s];
    var name = sObj.getName();

    if (
      name !== "contacts" &&
      name !== "sent_emails" &&
      name !== "received_emails" &&
      name !== "fichas_clientes" &&
      name !== "Hoja 1"
    ) {
      var dataValues = sObj.getDataRange().getValues();
      var nombre = "";
      var apellido = "";
      var email = "";

      if (dataValues.length >= 2) {
        var row2 = dataValues[1];
        nombre = String(row2[1] || '').trim();
        apellido = String(row2[2] || '').trim();
        email = String(row2[3] || '').trim();
      }

      if (!nombre && !apellido) {
        var parts = name.split(" ");
        nombre = parts[0] || name;
        apellido = parts.slice(1).join(" ") || "";
      }

      if (nombre || apellido || email) {
        rowsData.push([nombre, apellido, email]);
      }
    }
  }

  // Comprobar si los datos actuales de fichas_clientes ya están al día para evitar reescritura innecesaria
  var existingLastRow = fichasSheet.getLastRow();
  var existingData = [];
  if (existingLastRow > 1) {
    existingData = fichasSheet.getRange(2, 1, existingLastRow - 1, 3).getValues();
  }

  var isIdentical = (existingData.length === rowsData.length);
  if (isIdentical) {
    for (var i = 0; i < rowsData.length; i++) {
      if (
        String(existingData[i][0]).trim() !== String(rowsData[i][0]).trim() ||
        String(existingData[i][1]).trim() !== String(rowsData[i][1]).trim() ||
        String(existingData[i][2]).trim() !== String(rowsData[i][2]).trim()
      ) {
        isIdentical = false;
        break;
      }
    }
  }

  // Si los datos son idénticos, omitir reescritura en Google Sheets para máxima velocidad
  if (isIdentical) {
    return;
  }

  // Limpiar y escribir solo cuando hay cambios reales
  if (existingLastRow > 1) {
    fichasSheet.getRange(2, 1, existingLastRow - 1, 3).clearContent();
  }

  if (rowsData.length > 0) {
    var dataRange = fichasSheet.getRange(2, 1, rowsData.length, 3);
    dataRange.setValues(rowsData);
    dataRange
      .setFontSize(10)
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("left")
      .setBorder(true, true, true, true, true, true, "#e9d5ff", SpreadsheetApp.BorderStyle.SOLID);

    for (var r = 0; r < rowsData.length; r++) {
      fichasSheet.setRowHeight(r + 2, 30);
    }
  }

  fichasSheet.autoResizeColumn(1);
  fichasSheet.autoResizeColumn(2);
  fichasSheet.autoResizeColumn(3);
}

/**
 * Función auxiliar para garantizar que una pestaña de cliente tenga las columnas de Email (I a M)
 * en color verdecito destacado.
 */
function ensureEmailHeadersInSheet(sheet) {
  if (!sheet) return;
  var i1Value = sheet.getRange("I1").getValue();
  if (!i1Value || String(i1Value).trim() === "") {
    var emailHeaders = [["Email Enviado", "Email Recibido", "Fecha", "Asunto", "ID de Email"]];
    var emailHeaderRange = sheet.getRange(1, 9, 1, 5);
    emailHeaderRange.setValues(emailHeaders);
    emailHeaderRange
      .setFontWeight("bold")
      .setFontSize(12)
      .setBackground("#dcfce7")
      .setFontColor("#14532d")
      .setVerticalAlignment("middle")
      .setHorizontalAlignment("center")
      .setBorder(true, true, true, true, true, true, "#16a34a", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    
    sheet.setRowHeight(1, 45);
    sheet.setFrozenRows(1);
    for (var col = 9; col <= 13; col++) {
      sheet.autoResizeColumn(col);
    }
  }
}

function getEmailDetailsById(msgId) {
  if (!msgId) return { status: "error", message: "Falta ID del mensaje" };
  try {
    var msg = GmailApp.getMessageById(msgId);
    var attachmentsData = [];
    try {
      var rawAttachments = msg.getAttachments();
      for (var k = 0; k < rawAttachments.length; k++) {
        var att = rawAttachments[k];
        attachmentsData.push({
          name: att.getName(),
          mimeType: att.getContentType(),
          size: att.getSize(),
          base64: Utilities.base64Encode(att.getBytes())
        });
      }
    } catch (attErr) {
      Logger.log("Error extrayendo adjuntos: " + attErr.message);
    }

    return {
      status: "success",
      id: msg.getId(),
      threadId: msg.getThread().getId(),
      subject: msg.getSubject(),
      from: msg.getFrom(),
      to: msg.getTo(),
      date: msg.getDate().toISOString(),
      body: msg.getBody(),
      plainBody: msg.getPlainBody(),
      attachments: attachmentsData
    };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function formatDateVal(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm:ss");
  }
  return String(val).trim();
}

function findClientSheet(ss, clientName, emailAddress) {
  var sheetNameClean = clientName ? String(clientName).trim().toLowerCase() : "";
  var emailClean = emailAddress ? String(emailAddress).trim().toLowerCase() : "";
  
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    var sObj = allSheets[s];
    var sName = sObj.getName();
    if (sName !== "contacts" && sName !== "sent_emails" && sName !== "received_emails" && sName !== "Hoja 1") {
      var sNameLower = sName.trim().toLowerCase();
      var d2Email = String(sObj.getRange("D2").getValue()).trim().toLowerCase();
      var b2Name = String(sObj.getRange("B2").getValue()).trim();
      var c2Surname = String(sObj.getRange("C2").getValue()).trim();
      var full2Name = (b2Name + " " + c2Surname).trim().toLowerCase();
      
      if (
        (sheetNameClean && sNameLower === sheetNameClean) ||
        (sheetNameClean && full2Name === sheetNameClean) ||
        (emailClean && d2Email === emailClean)
      ) {
        return sObj;
      }
    }
  }
  return null;
}

/**
 * Recupera toda la información contenida en la pestaña individual de un cliente:
 * Datos de registro (Nombre, Apellido, Email, Fecha de Alta, Trámite, Estado, Notas),
 * Historial de Notas/Eventos con sus fechas (E y H), y
 * Historial de Correos Enviados/Recibidos con tipo, fecha, asunto e ID de correo (I a M).
 */
function getClientSheetDetails(clientName, emailAddress) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findClientSheet(ss, clientName, emailAddress);

  if (!sheet) {
    return {
      status: "not_found",
      message: "No existe la pestaña registrada para este cliente."
    };
  }

  var dataValues = sheet.getDataRange().getValues();
  if (dataValues.length <= 1) {
    return {
      status: "empty",
      message: "La pestaña del cliente está vacía."
    };
  }

  var row2 = dataValues[1] || [];
  var clientInfo = {
    ID: String(row2[0] || ''),
    Nombre: String(row2[1] || ''),
    Apellido: String(row2[2] || ''),
    Email: String(row2[3] || ''),
    FechaAlta: formatDateVal(row2[4]),
    Tramite: String(row2[5] || 'Alta de Cliente'),
    Estado: String(row2[6] || 'Activo'),
    NotasIniciales: String(row2[7] || '')
  };

  var notes = [];
  var emails = [];

  for (var r = 1; r < dataValues.length; r++) {
    var row = dataValues[r];
    
    // Extracción de Notas (Fila 2 en adelante: E=Fecha en índice 4, H=Notas en índice 7)
    var fechaNota = formatDateVal(row[4]);
    var textoNota = row[7] ? String(row[7]).trim() : '';
    if (textoNota && (r > 1 || textoNota !== "Cliente registrado desde EstudioLab")) {
      notes.push({
        row: r + 1,
        fecha: fechaNota || clientInfo.FechaAlta,
        nota: textoNota
      });
    }

    // Extracción de Correos (Columnas I a M: índices 8 a 12)
    var colEnviado = row[8] ? String(row[8]).trim() : '';
    var colRecibido = row[9] ? String(row[9]).trim() : '';
    var colFechaMail = formatDateVal(row[10]);
    var colAsuntoMail = row[11] ? String(row[11]).trim() : '';
    var colIdMail = row[12] ? String(row[12]).trim() : '';

    if (colEnviado || colRecibido || colIdMail || colAsuntoMail) {
      if (colEnviado !== "Email Enviado" && colRecibido !== "Email Recibido") {
        emails.push({
          tipo: colEnviado ? "Enviado" : (colRecibido ? "Recibido" : "Enviado"),
          fecha: colFechaMail,
          asunto: colAsuntoMail || "(Sin Asunto)",
          emailId: colIdMail
        });
      }
    }
  }

  return {
    status: "success",
    sheetName: sheet.getName(),
    clientInfo: clientInfo,
    notes: notes.reverse(),
    emails: emails.reverse()
  };
}

function doPost(e) {
  var result = {};
  try {
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "add_client_note") {
      var clientName = data.clientName || "";
      var emailAddress = data.email || "";
      var noteText = data.nota || "";
      var dateText = data.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm:ss");
      
      var targetSheet = findClientSheet(ss, clientName, emailAddress);
      if (!targetSheet) {
        result = { status: "error", message: "Pestaña de cliente no encontrada." };
      } else {
        var maxRows = targetSheet.getMaxRows();
        var targetRow = 2;
        
        while (targetRow <= maxRows) {
          var valH = String(targetSheet.getRange(targetRow, 8).getValue()).trim();
          var valE = String(targetSheet.getRange(targetRow, 5).getValue()).trim();
          if (valH === "" && (targetRow > 2 || valE === "")) {
            break;
          }
          targetRow++;
        }
        
        if (targetRow > maxRows) {
          targetSheet.insertRowAfter(maxRows);
          targetRow = maxRows + 1;
        }
        
        targetSheet.getRange(targetRow, 5).setValue(dateText);
        targetSheet.getRange(targetRow, 8).setValue(noteText);
        targetSheet.setRowHeight(targetRow, 32);
        
        result = { status: "success", message: "Nota agregada con éxito." };
      }
      
    } else if (data.action === "update_client_note") {
      var clientName = data.clientName || "";
      var emailAddress = data.email || "";
      var noteText = data.nota || "";
      var dateText = data.fecha || "";
      var rowNum = parseInt(data.row, 10);
      
      var targetSheet = findClientSheet(ss, clientName, emailAddress);
      if (!targetSheet) {
        result = { status: "error", message: "Pestaña de cliente no encontrada." };
      } else if (!rowNum || rowNum < 2) {
        result = { status: "error", message: "Fila no válida." };
      } else {
        targetSheet.getRange(rowNum, 5).setValue(dateText);
        targetSheet.getRange(rowNum, 8).setValue(noteText);
        result = { status: "success", message: "Nota actualizada con éxito." };
      }

    } else if (data.action === "delete_client_note") {
      var clientName = data.clientName || "";
      var emailAddress = data.email || "";
      var rowNum = parseInt(data.row, 10);
      
      var targetSheet = findClientSheet(ss, clientName, emailAddress);
      if (!targetSheet) {
        result = { status: "error", message: "Pestaña de cliente no encontrada." };
      } else if (!rowNum || rowNum < 2) {
        result = { status: "error", message: "Fila no válida." };
      } else {
        targetSheet.getRange(rowNum, 5).clearContent();
        targetSheet.getRange(rowNum, 8).clearContent();
        result = { status: "success", message: "Nota eliminada con éxito." };
      }

    } else if (data.action === "create_contact") {
      var sheet = ss.getSheetByName("contacts");
      if (!sheet) {
        sheet = ss.insertSheet("contacts");
        sheet.appendRow(["ID", "Nombre", "Apellido", "email", "Telefono", "Direccion"]);
      }
      
      var newId = Utilities.getUuid().substring(0, 8);
      sheet.appendRow([
        newId,
        data.Nombre || "",
        data.Apellido || "",
        data.email || "",
        data.Telefono || "",
        data.Direccion || ""
      ]);
      
      result = { status: "success", message: "Contacto creado con éxito en Google Sheets." };
      
    } else if (data.action === "create_client_sheet") {
      var contactsList = data.contacts || [];
      var createdSheets = [];
      var alreadyExistingSheets = [];

      for (var c = 0; c < contactsList.length; c++) {
        var contactItem = contactsList[c];
        var fullName = ((contactItem.Nombre || "") + " " + (contactItem.Apellido || "")).trim() || contactItem.email || ("Cliente " + (c + 1));
        var sheetName = fullName.replace(/[:\\/?*\[\]]/g, " ").substring(0, 95);

        var existingSheet = ss.getSheetByName(sheetName);
        if (!existingSheet) {
          var newSheet = ss.insertSheet(sheetName);
          newSheet.setHiddenGridlines(false);
          
          var clientHeaders = [["ID", "Nombre", "Apellido", "Email", "Fecha", "Trámite", "Estado", "Notas"]];
          var clientHeaderRange = newSheet.getRange(1, 1, 1, 8);
          clientHeaderRange.setValues(clientHeaders);
          clientHeaderRange
            .setFontWeight("bold")
            .setFontSize(12)
            .setBackground("#e9d5ff")
            .setFontColor("#581c87")
            .setVerticalAlignment("middle")
            .setHorizontalAlignment("center")
            .setBorder(true, true, true, true, true, true, "#a855f7", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

          var emailHeaders = [["Email Enviado", "Email Recibido", "Fecha", "Asunto", "ID de Email"]];
          var emailHeaderRange = newSheet.getRange(1, 9, 1, 5);
          emailHeaderRange.setValues(emailHeaders);
          emailHeaderRange
            .setFontWeight("bold")
            .setFontSize(12)
            .setBackground("#dcfce7")
            .setFontColor("#14532d")
            .setVerticalAlignment("middle")
            .setHorizontalAlignment("center")
            .setBorder(true, true, true, true, true, true, "#16a34a", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
          
          newSheet.setRowHeight(1, 45);
          newSheet.setFrozenRows(1);

          var initialId = Utilities.getUuid().substring(0, 8);
          var currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm:ss");
          var initialRow = [[
            initialId,
            contactItem.Nombre || "",
            contactItem.Apellido || "",
            contactItem.email || contactItem.Email || "",
            currentDate,
            "Alta de Cliente",
            "Activo",
            "Cliente registrado desde EstudioLab"
          ]];
          
          var dataRange = newSheet.getRange(2, 1, 1, 8);
          dataRange.setValues(initialRow);
          dataRange
            .setFontSize(10)
            .setVerticalAlignment("middle")
            .setBorder(true, true, true, true, true, true, "#d8b4fe", SpreadsheetApp.BorderStyle.SOLID);
          newSheet.setRowHeight(2, 32);

          for (var col = 1; col <= 13; col++) {
            newSheet.autoResizeColumn(col);
          }

          createdSheets.push(fullName);
        } else {
          ensureEmailHeadersInSheet(existingSheet);
          alreadyExistingSheets.push(fullName);
        }
      }

      updateFichasClientesSheet(ss);

      result = { 
        status: "success", 
        created: createdSheets,
        alreadyExisting: alreadyExistingSheets,
        message: "Hojas de cliente procesadas." 
      };

    } else if (data.action === "toggle_client_status") {
      var clientName = data.clientName || "";
      var newStatus = data.newStatus || "Activo";

      var targetSheet = ss.getSheetByName(clientName);
      if (!targetSheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "No se encontró la pestaña para el cliente: " + clientName 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var dataValues = targetSheet.getDataRange().getValues();
      if (dataValues.length >= 2) {
        var headers = dataValues[0];
        var estadoColIndex = -1;
        for (var h = 0; h < headers.length; h++) {
          if (String(headers[h]).trim().toLowerCase() === "estado") {
            estadoColIndex = h;
            break;
          }
        }

        if (estadoColIndex !== -1) {
          for (var r = 2; r <= targetSheet.getLastRow(); r++) {
            targetSheet.getRange(r, estadoColIndex + 1).setValue(newStatus);
          }
        } else {
          targetSheet.getRange(2, 7).setValue(newStatus);
        }
      }

      result = { 
        status: "success", 
        clientName: clientName, 
        newStatus: newStatus,
        message: "Estado de cliente actualizado a " + newStatus 
      };

    } else if (data.action === "send_template") {
      var templateId = data.templateId;
      var recipients = data.recipients || [];
      var isCustomMail = !!(data.subject && data.body);
      if ((!templateId && !isCustomMail) || recipients.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Falta templateId (o asunto/cuerpo personalizado) o la lista de destinatarios está vacía." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var sentSheet = ss.getSheetByName("sent_emails");
      if (!sentSheet) {
        sentSheet = ss.insertSheet("sent_emails");
        sentSheet.appendRow(["ID", "Fecha", "Para", "Email", "Asunto"]);
      }
      
      var sentCount = 0;
      
      for (var i = 0; i < recipients.length; i++) {
        var rawRecipient = recipients[i];
        var recipient = {};
        for (var key in rawRecipient) {
          recipient[key.trim()] = rawRecipient[key];
        }
        var emailAddress = recipient.email || recipient.Email || "";
        if (!emailAddress) continue;
        
        var firstName = recipient.Nombre || recipient.nombre || recipient.Name || recipient.name || "";
        var lastName = recipient.Apellido || recipient.apellido || recipient.Surname || recipient.surname || "";
        var fullName = (firstName + " " + lastName).trim();
        var nombreLimpio = firstName || "contacto";
        
        var subject = "";
        var body = "";
        
        // Si el cliente nos envió asunto y cuerpo personalizados desde el frontend
        if (data.subject && data.body) {
          subject = data.subject;
          // Reemplazar de forma case-insensitive los placeholders de nombre
          body = data.body
            .replace(/\[aqui iría el nombre del contacto\]/gi, nombreLimpio)
            .replace(/\[Nombre\]/gi, nombreLimpio);
        } else {
          // Fallback a las plantillas predefinidas estáticas
          if (templateId === "resolucion") {
            subject = "Resolución del Juzgado y reunión";
            body = "Buen dia " + nombreLimpio + ", espero te encuentres muy bien.\n\n" +
                   "Te envío la resolución dictada por el Juzgado. Ya nos encontramos implementando todo lo allí ordenado.\n\n" +
                   "Tenemos que presentar un escrito en carácter de Declaración Jurada, el cual te remito para tu conocimiento.\n\n" +
                   "Detalle de nuestra reunión para la firma:\n" +
                   "• Día: Lunes 13/7 a las 11:30 hs\n" +
                   "• Lugar: Lavalle nro. 1390, Piso 4, CABA\n\n" +
                   "⚠️ IMPORTANTE: Por favor, llevame toda la documentación detallada a continuación en soporte papel, ya que debo preservarla de acuerdo a lo ordenado por el Juez:\n" +
                   "• Intercambio de correos electrónicos y WhatsApp\n" +
                   "• Denuncia policial\n" +
                   "• Comprobantes de movimientos bancarios\n" +
                   "• Reclamo efectuado a la entidad bancaria\n" +
                   "• Respuesta del Banco Galicia y Buenos Aires S.A.U.\n" +
                   "• Certificado Único de Discapacidad (CUD)\n" +
                   "• Resumen de Historia Clínica\n" +
                   "• Acta de cierre de Mediación\n\n" +
                   "Quedo a tu disposición por cualquier consulta.\n\n" +
                   "Saludos cordiales,\n" +
                   "Rosario";
          } else if (templateId === "subi_acuerdo") {
            subject = "Conformidad del Acuerdo";
            body = "Buenos días " + nombreLimpio + "!\n" +
                   "espero te encuentres muy bien.\n\n" +
                   "Te comento que ya subí el acuerdo al sistema. Por favor, ¿podrías ingresar para dar la conformidad correspondiente?\n\n" +
                   "¡Muchas gracias!\n\n" +
                   "¡Saludos cordiales!\n\n" +
                   "             Rosario M. Sánchez\n" +
                   "Abogada • Mediadora MJDHN • Mediadora MJDHPBA\n" +
                   "Conciliadora de Relaciones del Consumidor\n" +
                   "Formadora en Métodos Adecuados de Prevención, Gestión y Resolución de Conflictos";
          } else {
            continue; // plantilla desconocida
          }
        }
        
        // Generar cuerpo formateado en HTML limpio y elegante
        var safeBodyHtml = body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\n/g, "<br>");
          
        var htmlBody = 
          "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\">" +
            "<div style=\"color: #2d3748; font-size: 15px;\">" +
              safeBodyHtml +
            "</div>" +
          "</div>";
        
        // 1. Procesar adjuntos (si vienen en la petición en formato base64)
        var attachmentsList = [];
        if (data.attachments && data.attachments.length > 0) {
          for (var a = 0; a < data.attachments.length; a++) {
            var att = data.attachments[a];
            if (att.base64 && att.filename) {
              var decodedBytes = Utilities.base64Decode(att.base64);
              var blob = Utilities.newBlob(decodedBytes, att.mimeType || "application/octet-stream", att.filename);
              attachmentsList.push(blob);
            }
          }
        }

        var draftOptions = { htmlBody: htmlBody };
        if (attachmentsList.length > 0) {
          draftOptions.attachments = attachmentsList;
        }

        // Enviar el correo directamente (con o sin adjuntos) y obtener el ID real de Gmail y del Hilo
        var recipientFormatted = fullName ? ("\"" + fullName + "\" <" + emailAddress + ">") : emailAddress;
        var draft = GmailApp.createDraft(recipientFormatted, subject, body, draftOptions);
        var sentMessage = draft.send();
        
        var realGmailId = sentMessage.getId();
        var realThreadId = sentMessage.getThread().getId();
        var gmailLink = "https://mail.google.com/mail/u/0/#all/" + realThreadId;
        
        // 1. Registrar en la pestaña 'sent_emails'
        if (sentSheet) {
          try {
            sentSheet.appendRow([
              realGmailId,
              new Date().toISOString(),
              fullName || emailAddress,
              emailAddress,
              subject
            ]);
          } catch (sentErr) {
            Logger.log("Error registrando en sent_emails: " + sentErr.message);
          }
        }

        // 2. Registrar en la pestaña individual del cliente (identificada por Nombre y Apellido)
        try {
          var sheetName = fullName.replace(/[:\\/?*\[\]]/g, " ").substring(0, 95);
          var clientSheet = ss.getSheetByName(sheetName);
          
          // Si no la encuentra por nombre exacto, buscar entre todas las pestañas por Email en la celda D2
          if (!clientSheet && emailAddress) {
            var allSheets = ss.getSheets();
            for (var s = 0; s < allSheets.length; s++) {
              var sName = allSheets[s].getName();
              if (sName !== "contacts" && sName !== "sent_emails" && sName !== "received_emails" && sName !== "Hoja 1") {
                var sheetEmail = String(allSheets[s].getRange("D2").getValue()).trim().toLowerCase();
                if (sheetEmail && sheetEmail === emailAddress.toLowerCase()) {
                  clientSheet = allSheets[s];
                  break;
                }
              }
            }
          }

          if (clientSheet) {
            ensureEmailHeadersInSheet(clientSheet);
            
            var currentDateFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm:ss");
            var emailRowData = [["Enviado", "", currentDateFormatted, subject, realGmailId]];
            
            var maxRows = clientSheet.getMaxRows();
            var targetRow = 2;
            
            while (targetRow <= maxRows) {
              var valI = String(clientSheet.getRange(targetRow, 9).getValue()).trim();
              var valJ = String(clientSheet.getRange(targetRow, 10).getValue()).trim();
              if (valI === "" && valJ === "") {
                break;
              }
              targetRow++;
            }
            
            if (targetRow > maxRows) {
              clientSheet.insertRowAfter(maxRows);
              targetRow = maxRows + 1;
            }
            
            var emailRange = clientSheet.getRange(targetRow, 9, 1, 5);
            emailRange.setValues(emailRowData);
            emailRange
              .setFontSize(10)
              .setVerticalAlignment("middle")
              .setHorizontalAlignment("center")
              .setBorder(true, true, true, true, true, true, "#86efac", SpreadsheetApp.BorderStyle.SOLID);
            
            clientSheet.setRowHeight(targetRow, 32);
            for (var cCol = 9; cCol <= 13; cCol++) {
              clientSheet.autoResizeColumn(cCol);
            }
          }
        } catch (clientSheetErr) {
          Logger.log("Error registrando en pestaña de cliente: " + clientSheetErr.message);
        }

        // 3. Notificar en tiempo real al Webhook del workflow correos_enviados de N8N
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
          Logger.log("Error al llamar al Webhook de N8N: " + webhookErr.message);
        }
        
        sentCount++;
      }
      
      result = { 
        status: "success", 
        message: "Se enviaron y registraron " + sentCount + " correos exitosamente." 
      };
      
    } else {
      result = { status: "error", message: "Acción POST no reconocida." };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  // Solo actualizar fichas_clientes si se creó un cliente o cambió un estado para máxima velocidad
  if (data.action === "create_client_sheet" || data.action === "toggle_client_status") {
    try {
      updateFichasClientesSheet(ss);
    } catch (syncErr) {
      Logger.log("Error al sincronizar fichas_clientes: " + syncErr.message);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Función auxiliar para autorizar Gmail y Webhook de N8N manualmente desde el editor
function autorizar() {
  Logger.log("Autorizando Gmail y Webhook N8N...");
  GmailApp.getInboxUnreadCount();
  
  var webhookUrl = "https://agendar.app.n8n.cloud/webhook/correos_enviados";
  var payload = {
    ID: Utilities.getUuid(),
    Fecha: new Date().toISOString(),
    Para: "Prueba Autorizacion",
    Email: "test@ejemplo.com",
    Asunto: "Prueba desde Apps Script"
  };
  
  Logger.log("Enviando peticion de prueba a N8N...");
  var response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  Logger.log("Código HTTP de respuesta: " + response.getResponseCode());
  Logger.log("Cuerpo de respuesta: " + response.getContentText());
}

/**
 * FUNCIÓN DE PRUEBA Y AUTORIZACIÓN DEL WEBHOOK DE N8N
 * Ejecuta esta función desde el editor de Apps Script para autorizar los permisos de red (UrlFetchApp)
 * y verificar el código de respuesta HTTP de N8N.
 */
function probarWebhook() {
  var webhookUrl = "https://agendar.app.n8n.cloud/webhook/correos_enviados";
  var payload = {
    ID: Utilities.getUuid(),
    Fecha: new Date().toISOString(),
    Para: "Prueba Webhook",
    Email: "test@ejemplo.com",
    Asunto: "Prueba directa desde Apps Script"
  };
  
  Logger.log("Enviando petición a N8N...");
  var response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  Logger.log("Código HTTP de respuesta: " + response.getResponseCode());
  Logger.log("Cuerpo de respuesta: " + response.getContentText());
}

/**
 * LIMPIEZA AUTOMÁTICA DE AUTOCOPIAS
 * Mueve los correos de la etiqueta "Autocopia-n8n" a la papelera si tienen más de 24 horas.
 * Configuración sugerida: Añadir un activador de tipo "Activador por tiempo" (diario) para esta función.
 */
function cleanAutocopia() {
  var label = GmailApp.getUserLabelByName("Autocopia-n8n");
  if (!label) {
    Logger.log("La etiqueta 'Autocopia-n8n' no existe.");
    return;
  }
  
  var threads = label.getThreads();
  var now = new Date();
  var deletedCount = 0;
  
  // 24 horas en milisegundos (puedes reducirlo a menos si lo deseas)
  var limitMs = 24 * 60 * 60 * 1000; 
  
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var lastMessageDate = thread.getLastMessageDate();
    
    if (now - lastMessageDate > limitMs) {
      thread.moveToTrash();
      deletedCount++;
    }
  }
  
  Logger.log("Limpieza completada. Hilos eliminados: " + deletedCount);
}

/**
 * SINCRONIZACIÓN AUTOMÁTICA DE CORREOS RECIBIDOS (Alternativa Nativa a N8N)
 * Busca los últimos correos recibidos en Gmail y los agrega a la pestaña 'received_emails'.
 * Puedes agregar un activador por tiempo en Apps Script (ej: cada 5 o 10 min) para ejecutar esta función.
 */
function sincronizarCorreosRecibidos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var recSheet = ss.getSheetByName("received_emails");
  if (!recSheet) {
    recSheet = ss.insertSheet("received_emails");
    recSheet.appendRow(["ID", "Fecha", "De", "Email", "Asunto"]);
  }

  var existingIds = {};
  var lastRow = recSheet.getLastRow();
  if (lastRow > 1) {
    var ids = recSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      existingIds[String(ids[i][0])] = true;
    }
  }

  var threads = GmailApp.getInboxThreads(0, 25);
  var newCount = 0;

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      var msgId = msg.getId();

      if (!existingIds[msgId]) {
        var from = msg.getFrom();
        var emailMatch = from.match(/<([^>]+)>/);
        var email = emailMatch ? emailMatch[1] : from;
        var name = from.replace(/<[^>]+>/, "").replace(/"/g, "").trim();

        recSheet.appendRow([
          msgId,
          msg.getDate().toISOString(),
          name || email,
          email,
          msg.getSubject() || "(Sin Asunto)"
        ]);
        existingIds[msgId] = true;
        newCount++;
      }
    }
  }
  Logger.log("Sincronizados " + newCount + " correos recibidos nuevos directamente desde Gmail.");
}
