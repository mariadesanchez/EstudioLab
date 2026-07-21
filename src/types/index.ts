export interface Contact {
  Nombre: string;
  Apellido: string;
  Direccion?: string;
  Telefono?: string;
  email: string;
}

export interface SentEmail {
  ID: string;
  Fecha: string;
  Para: string;
  Email: string;
  Asunto: string;
}

export interface ReceivedEmail {
  ID: string;
  Fecha: string;
  De: string;
  Email: string;
  Asunto: string;
}

export interface DashboardData {
  contacts: Contact[];
  sent_emails: SentEmail[];
  received_emails: ReceivedEmail[];
}
