'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mail, Send, Inbox, Users, Search, Calendar, 
  RefreshCw, Copy, Check, ExternalLink, Filter, Eye, 
  ChevronRight, AlertCircle, Sparkles, X, UserPlus, User, Scale, Paperclip, FileText,
  Pencil, Trash2, Plus, Save, Mic, MicOff, Square, Loader2, Menu
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Contact, SentEmail, ReceivedEmail } from '../types';

type TabType = 'dashboard' | 'sent' | 'received' | 'contacts';
type DateFilterType = 'all' | 'today' | 'yesterday' | 'last7' | 'custom';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customDate, setCustomDate] = useState('');

  // Selected Contacts State
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  // Email Template Sending State
  const [activeTemplate, setActiveTemplate] = useState<'resolucion' | 'subi_acuerdo' | null>(null);
  const [isConfirmSendModalOpen, setIsConfirmSendModalOpen] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');


  // Modal State for Creating Contact
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State for Viewing Full Email
  const [isViewEmailModalOpen, setIsViewEmailModalOpen] = useState(false);
  const [selectedEmailMeta, setSelectedEmailMeta] = useState<any>(null);
  const [selectedEmailDetails, setSelectedEmailDetails] = useState<any>(null);
  const [isLoadingEmailDetails, setIsLoadingEmailDetails] = useState(false);
  const [emailDetailsError, setEmailDetailsError] = useState<string | null>(null);

  const handleOpenEmailModal = async (emailItem: any) => {
    setSelectedEmailMeta(emailItem);
    setIsViewEmailModalOpen(true);
    setIsLoadingEmailDetails(true);
    setEmailDetailsError(null);
    setSelectedEmailDetails(null);

    try {
      const res = await fetch(`/api/data?action=get_email_details&id=${encodeURIComponent(emailItem.ID)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setSelectedEmailDetails(data);
      } else {
        setEmailDetailsError(data.message || 'No se pudo recuperar el cuerpo completo del mensaje.');
      }
    } catch (err: any) {
      setEmailDetailsError(err.message || 'Error de conexión con la API.');
    } finally {
      setIsLoadingEmailDetails(false);
    }
  };

  const handleDownloadAttachment = (att: { name: string; mimeType: string; base64: string }) => {
    const link = document.createElement('a');
    link.href = `data:${att.mimeType || 'application/octet-stream'};base64,${att.base64}`;
    link.download = att.name || 'adjunto';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gmail-Style Compose Modal State
  const [isGmailComposeOpen, setIsGmailComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSendingCustomEmail, setIsSendingCustomEmail] = useState(false);

  // Voice Recording & Transcribe States (N8N & Web Speech Integration)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Note Voice Recording & Transcribe States
  const [isNoteVoiceRecording, setIsNoteVoiceRecording] = useState(false);
  const [isNoteTranscribingVoice, setIsNoteTranscribingVoice] = useState(false);
  const [noteVoiceRecordingTime, setNoteVoiceRecordingTime] = useState(0);
  const [noteVoiceTarget, setNoteVoiceTarget] = useState<'new' | 'edit'>('new');

  const noteMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const noteAudioChunksRef = useRef<Blob[]>([]);
  const noteSpeechRecognitionRef = useRef<any>(null);
  const noteTimerIntervalRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      setVoiceRecordingTime(0);

      // 1. Web Speech API dictado nativo si está disponible
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-AR';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            setComposeBody((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      // 2. Grabar audio real con micrófono para N8N Webhook Transcribe
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setIsTranscribingVoice(true);
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'grabacion.webm');
            formData.append('file', audioBlob, 'grabacion.webm');

            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            const resData = await res.json();
            if (resData.status === 'success' && resData.text) {
              const transcribedStr = String(resData.text).trim();
              if (transcribedStr) {
                setComposeBody((prev) => (prev ? `${prev.trim()}\n${transcribedStr}` : transcribedStr));
              }
            }
          } catch (err) {
            console.error('Error al transcribir con N8N:', err);
          } finally {
            setIsTranscribingVoice(false);
          }
        }
      };

      mediaRecorder.start();
      setIsVoiceRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setVoiceRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor, otorga los permisos en tu navegador.');
    }
  };

  const stopVoiceRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsVoiceRecording(false);
  };

  const toggleVoiceRecording = () => {
    if (isVoiceRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const startNoteVoiceRecording = async (target: 'new' | 'edit' = 'new') => {
    try {
      setNoteVoiceTarget(target);
      noteAudioChunksRef.current = [];
      setNoteVoiceRecordingTime(0);

      // 1. Web Speech API dictado nativo si está disponible
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-AR';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            if (target === 'new') {
              setNewNoteText((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
            } else {
              setEditingNoteText((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
            }
          }
        };

        recognition.start();
        noteSpeechRecognitionRef.current = recognition;
      }

      // 2. Grabar audio real con micrófono para N8N Webhook Transcribe
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      noteMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          noteAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(noteAudioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setIsNoteTranscribingVoice(true);
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'grabacion_nota.webm');
            formData.append('file', audioBlob, 'grabacion_nota.webm');

            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            const resData = await res.json();
            if (resData.status === 'success' && resData.text) {
              const transcribedStr = String(resData.text).trim();
              if (transcribedStr) {
                if (target === 'new') {
                  setNewNoteText((prev) => (prev ? `${prev.trim()}\n${transcribedStr}` : transcribedStr));
                } else {
                  setEditingNoteText((prev) => (prev ? `${prev.trim()}\n${transcribedStr}` : transcribedStr));
                }
              }
            }
          } catch (err) {
            console.error('Error al transcribir nota con N8N:', err);
          } finally {
            setIsNoteTranscribingVoice(false);
          }
        }
      };

      mediaRecorder.start();
      setIsNoteVoiceRecording(true);

      noteTimerIntervalRef.current = setInterval(() => {
        setNoteVoiceRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accediendo al micrófono para la nota:', err);
      alert('No se pudo acceder al micrófono. Por favor, otorga los permisos en tu navegador.');
    }
  };

  const stopNoteVoiceRecording = () => {
    if (noteSpeechRecognitionRef.current) {
      try {
        noteSpeechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (noteMediaRecorderRef.current && noteMediaRecorderRef.current.state !== 'inactive') {
      noteMediaRecorderRef.current.stop();
    }
    if (noteTimerIntervalRef.current) {
      clearInterval(noteTimerIntervalRef.current);
    }
    setIsNoteVoiceRecording(false);
  };

  const toggleNoteVoiceRecording = (target: 'new' | 'edit' = 'new') => {
    if (isNoteVoiceRecording) {
      stopNoteVoiceRecording();
    } else {
      startNoteVoiceRecording(target);
    }
  };

  const [isPolishingNote, setIsPolishingNote] = useState(false);
  const [notePolishTarget, setNotePolishTarget] = useState<'new' | 'edit'>('new');

  const handlePolishNoteWithAI = async (target: 'new' | 'edit' = 'new') => {
    const currentText = target === 'new' ? newNoteText : editingNoteText;
    if (!currentText.trim()) {
      alert('Por favor, escribe o dicta algún texto primero para darle formato.');
      return;
    }

    setNotePolishTarget(target);
    setIsPolishingNote(true);

    try {
      const promptText = `Eres un asistente ejecutivo y legal experto. Toma la siguiente nota rápida o dictado de voz sobre el seguimiento de un cliente y dale un formato profesional, claro, limpio y conciso en español. Corrige ortografía, gramática, puntuación y errores de transcripción. Devuelve ÚNICAMENTE el texto formateado de la nota sin introducciones ni comentarios explicativos.\n\nNota original:\n${currentText}`;

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, text: currentText })
      });
      const resData = await res.json();
      if (resData.status === 'success' && resData.text) {
        const polished = resData.text.trim();
        if (target === 'new') {
          setNewNoteText(polished);
        } else {
          setEditingNoteText(polished);
        }
      } else {
        const polished = currentText.trim().charAt(0).toUpperCase() + currentText.trim().slice(1);
        if (target === 'new') {
          setNewNoteText(polished);
        } else {
          setEditingNoteText(polished);
        }
      }
    } catch (err) {
      console.error('Error al dar formato bonito a la nota:', err);
      const polished = currentText.trim().charAt(0).toUpperCase() + currentText.trim().slice(1);
      if (target === 'new') {
        setNewNoteText(polished);
      } else {
        setEditingNoteText(polished);
      }
    } finally {
      setIsPolishingNote(false);
    }
  };

  const [isPolishingEmail, setIsPolishingEmail] = useState(false);

  const handlePolishEmailWithAI = async () => {
    if (!composeBody.trim()) {
      alert('Por favor, escribe o dicta algún texto primero para darle formato.');
      return;
    }
    setIsPolishingEmail(true);
    try {
      const promptText = `Eres un asistente ejecutivo y legal experto. Toma la siguiente transcripción o borrador de correo electrónico y transfórmalo en un correo electrónico profesional, claro, bien estructurado y formal en español. Incluye un saludo adecuado, corrige ortografía y gramática, estructura los párrafos con saltos de línea claros y agrega una despedida cordial. Devuelve ÚNICAMENTE el texto formateado del correo sin introducciones ni notas explicativas.\n\nBorrador original:\n${composeBody}`;

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, text: composeBody })
      });
      const resData = await res.json();
      if (resData.status === 'success' && resData.text) {
        setComposeBody(resData.text.trim());
      } else {
        const text = composeBody.trim();
        const formatted = `Estimado/a cliente,\n\n${text}\n\nQuedamos a su entera disposición ante cualquier duda o consulta.\n\nSaludos cordiales,\nEstudioJurídico`;
        setComposeBody(formatted);
      }
    } catch (err) {
      console.error('Error al dar formato bonito:', err);
      const text = composeBody.trim();
      const formatted = `Estimado/a cliente,\n\n${text}\n\nQuedamos a su entera disposición ante cualquier duda o consulta.\n\nSaludos cordiales,\nEstudioJurídico`;
      setComposeBody(formatted);
    } finally {
      setIsPolishingEmail(false);
    }
  };

  const openGmailComposeModal = () => {
    setComposeSubject('');
    setComposeBody('');
    setAttachedFiles([]);
    setIsGmailComposeOpen(true);
  };

  const convertFilesToBase64 = async (files: File[]) => {
    return Promise.all(
      files.map((file) => {
        return new Promise<{ filename: string; mimeType: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || '';
            resolve({
              filename: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64: base64
            });
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      })
    );
  };

  // State for Unregistered Client Confirmation Modal (SI / NO Prompt)
  const [unregisteredClientPromptModal, setUnregisteredClientPromptModal] = useState<{
    isOpen: boolean;
    unregisteredContacts: any[];
    onConfirmRegister: () => void;
    onSkipRegister: () => void;
  }>({
    isOpen: false,
    unregisteredContacts: [],
    onConfirmRegister: () => {},
    onSkipRegister: () => {}
  });

  // Ficha de Cliente Modal States & Handler
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] = useState(false);
  const [isLoadingClientDetails, setIsLoadingClientDetails] = useState(false);
  const [clientDetailsData, setClientDetailsData] = useState<{
    sheetName: string;
    clientInfo: {
      ID: string;
      Nombre: string;
      Apellido: string;
      Email: string;
      FechaAlta: string;
      Tramite: string;
      Estado: string;
      NotasIniciales?: string;
    };
    notes: Array<{ row: number; fecha: string; nota: string }>;
    emails: Array<{ tipo: string; fecha: string; asunto: string; emailId: string }>;
  } | null>(null);

  const handleOpenClientDetailsModal = async (clientName: string, email: string) => {
    setIsLoadingClientDetails(true);
    setIsClientDetailsModalOpen(true);
    setClientDetailsData(null);

    try {
      const res = await fetch(`/api/data?action=get_client_sheet_details&clientName=${encodeURIComponent(clientName)}&email=${encodeURIComponent(email || '')}`);
      const resData = await res.json();
      if (resData.status === 'success') {
        setClientDetailsData(resData);
      } else {
        setClientDetailsData({
          sheetName: clientName,
          clientInfo: {
            ID: '-',
            Nombre: clientName.split(' ')[0] || clientName,
            Apellido: clientName.split(' ').slice(1).join(' ') || '',
            Email: email,
            FechaAlta: 'Sin Registro',
            Tramite: '-',
            Estado: 'No Registrado'
          },
          notes: [],
          emails: []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingClientDetails(false);
    }
  };

  // Modal Prompt State: Contact has no client sheet tab
  const [noClientSheetPromptModal, setNoClientSheetPromptModal] = useState<{
    isOpen: boolean;
    contact: Contact | null;
    fullName: string;
  }>({
    isOpen: false,
    contact: null,
    fullName: ''
  });

  const handleAvatarClick = (contact: Contact) => {
    const fullName = `${contact.Nombre || ''} ${contact.Apellido || ''}`.trim() || contact.email;
    const sheetInfo = clientSheets[fullName] || clientSheets[contact.Nombre] || (contact.email ? clientSheets[contact.email] : null);
    const hasClientSheet = !!(sheetInfo && sheetInfo.exists);
    const isInactive = hasClientSheet && sheetInfo.status === 'Inactivo';

    if (isInactive) return;

    if (hasClientSheet) {
      handleOpenClientDetailsModal(fullName, contact.email);
    } else {
      setNoClientSheetPromptModal({
        isOpen: true,
        contact: contact,
        fullName: fullName
      });
    }
  };

  const handleConfirmCreateClientFromAvatar = async () => {
    if (!noClientSheetPromptModal.contact) return;
    const targetContact = noClientSheetPromptModal.contact;
    const fullName = noClientSheetPromptModal.fullName;
    
    setNoClientSheetPromptModal({ isOpen: false, contact: null, fullName: '' });
    
    // Crear el cliente en Google Sheets y en fichas_clientes
    await handleCreateClientSheets([targetContact]);
    
    // Abrir su ficha de cliente inmediatamente
    await handleOpenClientDetailsModal(fullName, targetContact.email);
  };

  // States & Handlers for Editing and Adding Notes in Client Sheet
  const [editingNoteRow, setEditingNoteRow] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [editingNoteDate, setEditingNoteDate] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteDate, setNewNoteDate] = useState('');

  const getFormattedNow = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  };

  const handleStartAddNote = () => {
    setNewNoteText('');
    setNewNoteDate(getFormattedNow());
    setIsAddingNote(true);
  };

  const handleSaveNewNote = async () => {
    if (!newNoteText.trim() || !clientDetailsData) return;
    stopNoteVoiceRecording();
    setIsSavingNote(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_client_note',
          clientName: clientDetailsData.sheetName,
          email: clientDetailsData.clientInfo.Email,
          nota: newNoteText,
          fecha: newNoteDate || getFormattedNow()
        })
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        setIsAddingNote(false);
        setNewNoteText('');
        await handleOpenClientDetailsModal(clientDetailsData.sheetName, clientDetailsData.clientInfo.Email);
      } else {
        alert(resData.message || 'Error al agregar la nota.');
      }
    } catch (err: any) {
      alert('Error de red al agregar la nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStartEditNote = (noteItem: { row: number; fecha: string; nota: string }) => {
    stopNoteVoiceRecording();
    setEditingNoteRow(noteItem.row);
    setEditingNoteText(noteItem.nota);
    setEditingNoteDate(noteItem.fecha);
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteRow || !clientDetailsData) return;
    stopNoteVoiceRecording();
    setIsSavingNote(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_client_note',
          clientName: clientDetailsData.sheetName,
          email: clientDetailsData.clientInfo.Email,
          row: editingNoteRow,
          nota: editingNoteText,
          fecha: editingNoteDate
        })
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        setEditingNoteRow(null);
        await handleOpenClientDetailsModal(clientDetailsData.sheetName, clientDetailsData.clientInfo.Email);
      } else {
        alert(resData.message || 'Error al actualizar la nota.');
      }
    } catch (err) {
      alert('Error de red al actualizar la nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (rowNum: number) => {
    if (!clientDetailsData || !confirm('¿Estás seguro de eliminar esta nota?')) return;
    setIsSavingNote(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_client_note',
          clientName: clientDetailsData.sheetName,
          email: clientDetailsData.clientInfo.Email,
          row: rowNum
        })
      });
      const resData = await res.json();
      if (resData.status === 'success') {
        await handleOpenClientDetailsModal(clientDetailsData.sheetName, clientDetailsData.clientInfo.Email);
      } else {
        alert(resData.message || 'Error al eliminar la nota.');
      }
    } catch (err) {
      alert('Error de red al eliminar la nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const checkUnregisteredClientsAndPrompt = (recipients: any[], onProceed: () => void) => {
    const unregistered = recipients.filter((c) => {
      const fullName = `${c.Nombre || ''} ${c.Apellido || ''}`.trim() || c.email;
      const sheetInfo = clientSheets[fullName] || clientSheets[c.Nombre] || (c.email ? clientSheets[c.email] : null);
      return !(sheetInfo && sheetInfo.exists);
    });

    if (unregistered.length > 0) {
      setUnregisteredClientPromptModal({
        isOpen: true,
        unregisteredContacts: unregistered,
        onConfirmRegister: async () => {
          setUnregisteredClientPromptModal(prev => ({ ...prev, isOpen: false }));
          await handleCreateClientSheets(unregistered);
          onProceed();
        },
        onSkipRegister: () => {
          setUnregisteredClientPromptModal(prev => ({ ...prev, isOpen: false }));
          onProceed();
        }
      });
    } else {
      onProceed();
    }
  };

  const handleSendCustomEmail = async () => {
    if (!composeSubject.trim()) {
      alert('Por favor, ingresa un asunto para el correo.');
      return;
    }
    if (!composeBody.trim()) {
      alert('Por favor, escribe el contenido del correo.');
      return;
    }

    const selectedRecipientsList = contacts.filter((c) => selectedContacts.has(c.email));
    if (selectedRecipientsList.length === 0) {
      alert('Por favor, selecciona al menos un contacto en la lista.');
      return;
    }

    const executeSend = async () => {
      setIsSendingCustomEmail(true);
      try {
        const attachmentsData = await convertFilesToBase64(attachedFiles);

        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_template',
            subject: composeSubject,
            body: composeBody,
            recipients: selectedRecipientsList,
            attachments: attachmentsData
          })
        });

        const resData = await response.json();
        if (resData.status === 'success') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setIsGmailComposeOpen(false);
          setAttachedFiles([]);
          setSelectedContacts(new Set());
          fetchData();
        } else {
          alert(resData.message || 'Error al enviar el correo.');
        }
      } catch (err: any) {
        alert('Error de red al enviar: ' + (err.message || 'Inténtalo de nuevo.'));
      } finally {
        setIsSendingCustomEmail(false);
      }
    };

    checkUnregisteredClientsAndPrompt(selectedRecipientsList, executeSend);
  };

  // State & Handler for Creating Client Sheets (+ Cliente)
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [creatingClientName, setCreatingClientName] = useState<string | null>(null);
  const [clientCreationResultModal, setClientCreationResultModal] = useState<{
    created: string[];
    alreadyExisting: string[];
  } | null>(null);

  const handleCreateClientSheets = async (targetContactsList?: any[]) => {
    const isCustomArray = Array.isArray(targetContactsList);
    const listToCreate = isCustomArray 
      ? targetContactsList 
      : contacts.filter((c) => selectedContacts.has(c.email));

    if (listToCreate.length === 0) {
      alert('Por favor, selecciona al menos un contacto en la lista.');
      return;
    }

    const clientNamesStr = listToCreate.map((c) => {
      const name = `${c.Nombre || ''} ${c.Apellido || ''}`.trim();
      return name || c.email || 'Cliente';
    }).join(', ');

    setCreatingClientName(clientNamesStr);
    setIsCreatingClient(true);
    try {
      // Ejecutar la creación nativa de la pestaña en Google Sheets vía Apps Script
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_client_sheet',
          contacts: listToCreate
        })
      });

      const resData = await res.json();
      if (resData.status === 'success') {
        const created = resData.created || [];
        const alreadyExisting = resData.alreadyExisting || [];

        // Optimistic UI update para que las fichas recién creadas activen su switch en < 10ms
        setClientSheets((prev) => {
          const updated = { ...prev };
          listToCreate.forEach((c) => {
            const name = `${c.Nombre || ''} ${c.Apellido || ''}`.trim() || c.email;
            if (name) updated[name] = { exists: true, status: 'Activo' };
          });
          return updated;
        });

        if (!isCustomArray && (created.length > 0 || alreadyExisting.length > 0)) {
          setClientCreationResultModal({ created, alreadyExisting });
        }
        if (created.length > 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        setSelectedContacts(new Set());
        fetchData();
      } else {
        alert(resData.message || 'Ocurrió una novedad al crear la pestaña del cliente.');
      }
    } catch (err: any) {
      alert('Error de red al procesar la creación de cliente: ' + (err.message || 'Inténtalo nuevamente.'));
    } finally {
      setIsCreatingClient(false);
      setCreatingClientName(null);
    }
  };

  // Client Sheets Map & Status Toggle
  const [clientSheets, setClientSheets] = useState<Record<string, { exists: boolean; status: string }>>({});
  const [togglingClient, setTogglingClient] = useState<string | null>(null);

  const handleToggleClientStatus = async (clientName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';

    setTogglingClient(clientName);
    // Optimistic UI update
    setClientSheets((prev) => ({
      ...prev,
      [clientName]: { exists: true, status: nextStatus }
    }));

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_client_status',
          clientName: clientName,
          newStatus: nextStatus
        })
      });

      const resData = await res.json();
      if (resData.status !== 'success') {
        fetchData();
        alert(resData.message || 'Error al actualizar el estado del cliente.');
      }
    } catch (err: any) {
      fetchData();
      alert('Error de red al actualizar el estado: ' + err.message);
    } finally {
      setTogglingClient(null);
    }
  };

  // Fetch all data from proxy API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data?action=all');
      const resData = await response.json();
      
      if (resData.status === 'error') {
        throw new Error(resData.message || 'Error al obtener los datos de la planilla.');
      }
      
      if (resData.clientSheets) {
        setClientSheets(resData.clientSheets);
      }
      
      // Normalizar contactos de manera robusta y case-insensitive
      const normalizedContacts = (resData.contacts || []).map((c: any) => ({
        Nombre: c.Nombre || c.nombre || c.Name || c.name || '',
        Apellido: c.Apellido || c.apellido || c.Surname || c.surname || '',
        Direccion: c.Direccion || c.Dirección || c.direccion || c.address || '',
        Telefono: c.Telefono || c.Teléfono || c.telefono || c.phone || '',
        email: c.email || c.Email || c.Mail || c.mail || ''
      }));
      
      const normalizedSent = (resData.sent_emails || []).map((e: any) => ({
        ID: e.ID || e.id || '',
        Fecha: e.Fecha || e.fecha || '',
        Para: e.Para || e.para || '',
        Email: e.Email || e.email || '',
        Asunto: e.Asunto || e.asunto || ''
      }));

      const normalizedReceived = (resData.received_emails || []).map((e: any) => ({
        ID: String(e.ID || e.id || e.Id || ''),
        Fecha: e.Fecha || e.fecha || e.Date || e.date || '',
        De: e.De || e.de || e.From || e.from || '',
        Email: e.Email || e.email || e.Mail || e.mail || '',
        Asunto: e.Asunto || e.asunto || e.Subject || e.subject || '(Sin Asunto)'
      }));

      setContacts(normalizedContacts);
      setSentEmails(normalizedSent.reverse());
      setReceivedEmails(normalizedReceived.reverse());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo conectar con el servidor o Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newEmail.trim()) {
      alert('Nombre y Correo electrónico son campos obligatorios.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_contact',
          Nombre: newNombre.trim(),
          Apellido: newApellido.trim(),
          email: newEmail.trim(),
          Telefono: newTelefono.trim(),
          Direccion: newDireccion.trim(),
        }),
      });

      const resData = await response.json();
      if (resData.status === 'success') {
        // Limpiar campos
        setNewNombre('');
        setNewApellido('');
        setNewEmail('');
        setNewTelefono('');
        setNewDireccion('');
        setIsCreateModalOpen(false);
        // Recargar datos
        fetchData();
      } else {
        alert(resData.message || 'Error al guardar el contacto.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error de conexión al intentar guardar el contacto.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Single Contact Checkbox
  const toggleContactSelection = (email: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // Check if at least one selected contact is NOT a client yet (has no switch), or 0 contacts selected
  const selectedContactsList = contacts.filter((c) => selectedContacts.has(c.email));
  const hasSelectedNonClients = selectedContactsList.length === 0 || selectedContactsList.some((c) => {
    const fullName = `${c.Nombre} ${c.Apellido}`.trim();
    const sheetInfo = clientSheets[fullName] || clientSheets[c.Nombre] || (c.email ? clientSheets[c.email] : null);
    return !(sheetInfo && sheetInfo.exists);
  });

  // Select All filtered contacts
  const handleSelectAllContacts = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.email)));
    }
  };

  // Send selected template to checked contacts
  const handleSendEmails = async () => {
    if (selectedContacts.size === 0 || !activeTemplate) return;
    
    const selectedRecipients = contacts.filter(c => selectedContacts.has(c.email));
    
    const executeSendTemplate = async () => {
      setIsSendingEmails(true);
      try {
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send_template',
            templateId: activeTemplate,
            subject: editableSubject,
            body: editableBody,
            recipients: selectedRecipients.map(r => ({
              Nombre: r.Nombre || '',
              Apellido: r.Apellido || '',
              email: r.email
            }))
          })
        });
        
        const resData = await response.json();
        if (resData.status === 'success') {
          // Lluvia de confeti!
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
          

          alert(`¡Correos enviados con éxito! Se enviaron ${selectedRecipients.length} correos.`);
          setSelectedContacts(new Set());
          setActiveTemplate(null);
          setIsConfirmSendModalOpen(false);
          // Recargar lista de enviados
          fetchData();
        } else {
          alert(resData.message || 'Hubo un error al enviar los correos.');
        }
      } catch (err: any) {
        console.error(err);
        alert('Error de conexión al enviar los correos.');
      } finally {
        setIsSendingEmails(false);
      }
    };

    checkUnregisteredClientsAndPrompt(selectedRecipients, executeSendTemplate);
  };

  // Inicializar plantilla y pre-rellenar nombre de contacto si es un único destinatario
  const initializeTemplate = (templateId: 'resolucion' | 'subi_acuerdo') => {
    setActiveTemplate(templateId);
    let subject = '';
    let body = '';
    
    if (templateId === 'resolucion') {
      subject = 'Resolución del Juzgado y reunión';
      body = "Buen dia [Nombre], espero te encuentres muy bien.\n\n" +
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
    } else {
      subject = 'Conformidad del Acuerdo';
      body = "Buenos días [Nombre]!\nespero te encuentres muy bien.\n\n" +
        "Te comento que ya subí el acuerdo al sistema. Por favor, ¿podrías ingresar para dar la conformidad correspondiente?\n\n" +
        "¡Muchas gracias!\n\n" +
        "¡Saludos cordiales!\n\n" +
        "             Rosario M. Sánchez\n" +
        "Abogada • Mediadora MJDHN • Mediadora MJDHPBA\n" +
        "Conciliadora de Relaciones del Consumidor\n" +
        "Formadora en Métodos Adecuados de Prevención, Gestión y Resolución de Conflictos";
    }

    // Reemplazar el marcador si hay exactamente un destinatario seleccionado
    if (selectedContacts.size === 1) {
      const email = Array.from(selectedContacts)[0];
      const contact = contacts.find(c => c.email === email);
      if (contact) {
        const nombreDest = contact.Nombre || '';
        body = body.replace(/\[Nombre\]/gi, nombreDest)
                   .replace(/\[aqui iría el nombre del contacto\]/gi, nombreDest);
      }
    }
    
    setEditableSubject(subject);
    setEditableBody(body);
    setIsConfirmSendModalOpen(true);
  };


  // Helper: Format date to local DD/MM/YY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      // Ajustar a hora local (Argentina: UTC-3) si viene en formato UTC/Zulú
      if (dateStr.endsWith('Z')) {
        d.setHours(d.getHours() - 3);
      }
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Date filter comparison helper
  const matchesDate = (dateStr: string) => {
    if (!dateStr) return true;
    try {
      const emailDate = new Date(dateStr);
      if (isNaN(emailDate.getTime())) return true;
      
      const today = new Date();
      const resetTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      
      const emailDay = resetTime(emailDate);
      const todayDay = resetTime(today);
      const yesterdayDay = todayDay - 24 * 60 * 60 * 1000;
      const sevenDaysAgoDay = todayDay - 7 * 24 * 60 * 60 * 1000;
      
      if (dateFilter === 'all') return true;
      if (dateFilter === 'today') return emailDay === todayDay || Math.abs(emailDay - todayDay) <= 24 * 60 * 60 * 1000;
      if (dateFilter === 'yesterday') return emailDay === yesterdayDay;
      if (dateFilter === 'last7') return emailDay >= sevenDaysAgoDay && emailDay <= todayDay + (24 * 60 * 60 * 1000);
      if (dateFilter === 'custom' && customDate) {
        const custom = new Date(customDate + 'T00:00:00');
        const customDay = resetTime(custom);
        return emailDay === customDay;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  // Filters calculation
  const filteredSent = sentEmails.filter(email => {
    const searchLower = searchQuery.toLowerCase().trim();
    const contactMatch = 
      !searchLower ||
      (email.Para || '').toLowerCase().includes(searchLower) || 
      (email.Email || '').toLowerCase().includes(searchLower);
    const subjectLower = subjectQuery.toLowerCase().trim();
    const subjectMatch = !subjectLower || (email.Asunto || '').toLowerCase().includes(subjectLower);
    return contactMatch && subjectMatch && matchesDate(email.Fecha);
  });

  const filteredReceived = receivedEmails.filter(email => {
    const searchLower = searchQuery.toLowerCase().trim();
    const contactMatch = 
      !searchLower ||
      (email.De || '').toLowerCase().includes(searchLower) || 
      (email.Email || '').toLowerCase().includes(searchLower);
    const subjectLower = subjectQuery.toLowerCase().trim();
    const subjectMatch = !subjectLower || (email.Asunto || '').toLowerCase().includes(subjectLower);
    return contactMatch && subjectMatch && matchesDate(email.Fecha);
  });

  // Alphabetical sort contacts A-Z
  const filteredContacts = contacts
    .filter(c => 
      (c.Nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.Apellido || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const nameA = `${a.Nombre || ''} ${a.Apellido || ''}`.trim().toLowerCase();
      const nameB = `${b.Nombre || ''} ${b.Apellido || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-zinc-800 overflow-hidden font-sans">
      {/* 1. Left Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-zinc-200/80 hidden md:flex flex-col justify-between p-6 shrink-0 shadow-sm">
        <div className="space-y-6">

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Panel principal</p>
            
            <button
              onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all border ${
                activeTab === 'dashboard'
                  ? 'bg-[#c2e7ff] border-transparent text-[#001d35]'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Vista General
            </button>

            <button
              onClick={() => { setActiveTab('sent'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all border ${
                activeTab === 'sent'
                  ? 'bg-[#c2e7ff] border-transparent text-[#001d35]'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }`}
            >
              <Send className="w-4 h-4" />
              Enviados ({sentEmails.length})
            </button>

            <button
              onClick={() => { setActiveTab('received'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all border ${
                activeTab === 'received'
                  ? 'bg-[#c2e7ff] border-transparent text-[#001d35]'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Recibidos ({receivedEmails.length})
            </button>

            <button
              onClick={() => { setActiveTab('contacts'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all border ${
                activeTab === 'contacts'
                  ? 'bg-[#c2e7ff] border-transparent text-[#001d35]'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }`}
            >
              <Users className="w-4 h-4" />
              Directorio de Contactos
            </button>
          </nav>
        </div>

        {/* Sync Status / Footer Action */}
        <div className="space-y-4 pt-4 border-t border-zinc-200/80">
          <div className="bg-zinc-50/50 border border-zinc-200/80 rounded-2xl p-4 text-[11px] text-zinc-500 space-y-2">
            <div className="flex items-center justify-between font-bold text-zinc-700">
              <span>Estado Sincro</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <p className="leading-relaxed text-[10px]">
              Los datos se extraen en tiempo real de tu Google Sheet.
            </p>
            <a 
              href="https://docs.google.com/spreadsheets/d/1amG7d_7Fwr6djEZW8fAzR0caCQfpdaoTwWq8T0NMf8s/edit#gid=2049086685"
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-purple-600 font-bold hover:text-purple-700 transition-colors pt-1 cursor-pointer"
            >
              Abrir planilla
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 border border-zinc-200 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar datos
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-fadeIn flex">
          <div className="w-72 bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-slideRight">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-lg text-zinc-900 block leading-tight">EstudioLab</span>
                    <span className="text-[10px] text-zinc-500 font-bold">Estudio Jurídico</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">Panel Principal</p>
                <button
                  onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'dashboard' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Vista General
                </button>
                <button
                  onClick={() => { setActiveTab('sent'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'sent' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  Enviados ({sentEmails.length})
                </button>
                <button
                  onClick={() => { setActiveTab('received'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'received' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Recibidos ({receivedEmails.length})
                </button>
                <button
                  onClick={() => { setActiveTab('contacts'); setSearchQuery(''); setSubjectQuery(''); setDateFilter('all'); setSelectedContacts(new Set()); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'contacts' ? 'bg-[#c2e7ff] text-[#001d35]' : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Directorio de Contactos
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-200/80 space-y-3">
              <button
                onClick={() => { fetchData(); setIsMobileMenuOpen(false); }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Actualizar datos
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* 2. Main Content Container */}
      <main className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative">
        {/* Header */}
        <header className="h-16 md:h-24 border-b border-zinc-200/80 flex items-center justify-between md:justify-center px-4 md:px-8 shrink-0 bg-[#f6f8fc] z-10 relative">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-zinc-700 hover:bg-zinc-200/60 rounded-xl md:hidden cursor-pointer shrink-0"
            title="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo and Brand */}
          <div className="flex items-center gap-3 md:gap-5 hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-purple-600 via-violet-500 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/25 shrink-0 border-2 border-white ring-2 md:ring-4 ring-purple-100">
              <Scale className="w-5 h-5 md:w-9 md:h-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            </div>
            <div className="text-left flex flex-col justify-center">
              <span className="font-black text-lg md:text-2xl text-zinc-900 tracking-tight block leading-none">
                Estudio<span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-black">Lab</span>
              </span>
              <div className="text-[11px] md:text-base text-zinc-800 font-extrabold tracking-tight mt-0.5 md:mt-1.5 leading-tight hidden sm:block">
                Doc. Rosario Sánchez &nbsp;•&nbsp; Doc. Federico Fernandez Sánchez
              </div>
            </div>
          </div>
          
          <div className="hidden sm:flex md:absolute md:right-8 items-center gap-3">
            <span className="text-xs bg-white text-zinc-700 border border-zinc-200/80 py-1.5 px-3.5 rounded-full font-semibold shadow-sm">
              Hoy es: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 pb-32 relative">
          
          {/* A. Loader State */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b]/80 backdrop-blur-sm z-30 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <p className="text-sm font-semibold text-zinc-400 animate-pulse">Sincronizando con Google Sheets...</p>
            </div>
          )}

          {/* B. Error / No Configured Script State */}
          {error && !loading && (
            <div className="max-w-3xl mx-auto glass-panel border-red-500/20 rounded-3xl p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Error de Conexión</h3>
                  <p className="text-xs text-zinc-400">{error}</p>
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">Pasos para resolver el error de conexión:</h4>
                <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-3 leading-relaxed">
                  <li>
                    Asegúrate de haber guardado e **implementado** el archivo <span className="text-zinc-200 underline font-medium">google-apps-script.js</span> como una **Aplicación Web** en tu Google Sheet (Extensiones &gt; Apps Script).
                  </li>
                  <li>
                    Asegúrate de que la configuración de la implementación esté en **"Ejecutar como: Mí"** y **"Quién tiene acceso: Cualquiera"**.
                  </li>
                  <li>
                    Crea un archivo llamado <span className="text-indigo-400 font-bold">.env.local</span> en la carpeta raíz de esta aplicación Next.js y pega tu URL de Apps Script de esta manera:
                    <pre className="bg-black/60 border border-zinc-800 text-zinc-300 p-3 rounded-lg mt-1 font-mono text-[10px] select-all">
                      GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/TU_CODIGO_AQUI/exec
                    </pre>
                  </li>
                  <li>
                    Reinicia el servidor de desarrollo de Next.js (`npm run dev`) y haz clic en **Actualizar datos** a la izquierda.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* C. Tab Contents */}
          {!loading && !error && (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between border-white/5 transition-all">
                      <div className="space-y-1.5">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Contactos</span>
                        <span className="text-3xl font-black text-white">{contacts.length}</span>
                        <span className="text-[10px] text-zinc-400 block font-medium">Guardados en agenda</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="glass-panel hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between border-white/5 transition-all">
                      <div className="space-y-1.5">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Correos Enviados</span>
                        <span className="text-3xl font-black text-white">{sentEmails.length}</span>
                        <span className="text-[10px] text-zinc-400 block font-medium">Total salientes</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Send className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="glass-panel hover:bg-zinc-900/20 rounded-3xl p-6 flex items-center justify-between border-white/5 transition-all">
                      <div className="space-y-1.5">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Correos Recibidos</span>
                        <span className="text-3xl font-black text-white">{receivedEmails.length}</span>
                        <span className="text-[10px] text-zinc-400 block font-medium">Total entrantes</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Inbox className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Side-by-Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Col: Recent Sent */}
                    <div className="glass-panel rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Últimos Enviados</h3>
                        <button 
                          onClick={() => setActiveTab('sent')}
                          className="text-[10px] text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Ver todos
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {sentEmails.slice(0, 3).map((email, idx) => (
                          <div key={email.ID || idx} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{email.Para}</span>
                              <span className="text-[10px] text-zinc-500 font-semibold">{formatDate(email.Fecha)}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium block truncate mb-1">
                              {email.Email}
                            </span>
                            <p className="text-xs text-zinc-300 font-semibold line-clamp-1">
                              {email.Asunto}
                            </p>
                          </div>
                        ))}
                        {sentEmails.length === 0 && (
                          <p className="text-xs text-zinc-500 text-center py-6">No hay correos enviados registrados.</p>
                        )}
                      </div>
                    </div>

                    {/* Right Col: Recent Received */}
                    <div className="glass-panel rounded-3xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Últimos Recibidos</h3>
                        <button 
                          onClick={() => setActiveTab('received')}
                          className="text-[10px] text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Ver todos
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {receivedEmails.slice(0, 3).map((email, idx) => (
                          <div key={email.ID || idx} className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{email.De}</span>
                              <span className="text-[10px] text-zinc-500 font-semibold">{formatDate(email.Fecha)}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium block truncate mb-1">
                              {email.Email}
                            </span>
                            <p className="text-xs text-zinc-300 font-semibold line-clamp-1">
                              {email.Asunto}
                            </p>
                          </div>
                        ))}
                        {receivedEmails.length === 0 && (
                          <p className="text-xs text-zinc-500 text-center py-6">No hay correos recibidos registrados.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SENT EMAILS */}
              {activeTab === 'sent' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Filters Bar */}
                  <div className="glass-panel rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search Contact */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Buscar destinatario</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nombre o email..."
                          className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 rounded-xl py-3 pl-10 pr-4 text-xs placeholder:text-zinc-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Search Subject */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Asunto</label>
                      <div className="relative">
                        <Filter className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={subjectQuery}
                          onChange={(e) => setSubjectQuery(e.target.value)}
                          placeholder="Palabra clave del asunto..."
                          className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 rounded-xl py-3 pl-10 pr-4 text-xs placeholder:text-zinc-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Date Filters */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fecha de envío</label>
                      <div className="flex gap-2">
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                          className="bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none transition-all grow"
                        >
                          <option value="all">Todas las fechas</option>
                          <option value="today">De Hoy</option>
                          <option value="yesterday">De Ayer</option>
                          <option value="last7">Últimos 7 días</option>
                          <option value="custom">Fecha específica...</option>
                        </select>
                        
                        {dateFilter === 'custom' && (
                          <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none transition-all"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List / Cards */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-zinc-500">
                      Coincidencias encontradas: {filteredSent.length} correos
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredSent.map((email, idx) => (
                        <div key={email.ID || idx} className="glass-panel border-white/5 hover:border-blue-500/25 hover:bg-zinc-900/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-zinc-900 text-zinc-400 font-bold border border-zinc-800 px-2 py-0.5 rounded-md">
                                  Nro: {idx + 1}
                                </span>
                                <h4 className="text-xs font-extrabold text-white">{email.Para}</h4>
                              </div>
                              <span className="text-[10px] text-zinc-400 block font-mono select-all">
                                {email.Email}
                              </span>
                            </div>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/10 font-bold px-2.5 py-1 rounded-full shrink-0">
                              {formatDate(email.Fecha)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-zinc-600 uppercase tracking-widest block">Asunto</span>
                            <p className="text-xs text-zinc-300 font-semibold">{email.Asunto}</p>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60">
                            <button
                              onClick={() => handleOpenEmailModal(email)}
                              className="text-[10px] font-mono font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1.5 cursor-pointer bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg hover:border-purple-500/40 transition-colors"
                              title="Ver correo completo en EstudioLab"
                            >
                              ID: {email.ID?.substring(0, 8)}... <Eye className="w-3 h-3 text-purple-400" />
                            </button>
                            <button
                              onClick={() => handleCopyEmail(email.Email)}
                              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer bg-zinc-950/60 border border-zinc-900 py-1.5 px-3 rounded-lg group-hover:border-zinc-800 transition-colors"
                            >
                              {copiedEmail === email.Email ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copiar Email
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredSent.length === 0 && (
                      <div className="glass-panel border-dashed border-zinc-900 rounded-3xl p-12 text-center text-zinc-500">
                        Ningún correo enviado coincide con los filtros especificados.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RECEIVED EMAILS */}
              {activeTab === 'received' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Filters Bar */}
                  <div className="glass-panel rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search Contact */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Buscar remitente</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Nombre o email..."
                          className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-xs placeholder:text-zinc-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Search Subject */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Asunto</label>
                      <div className="relative">
                        <Filter className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={subjectQuery}
                          onChange={(e) => setSubjectQuery(e.target.value)}
                          placeholder="Palabra clave del asunto..."
                          className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-xs placeholder:text-zinc-600 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Date Filters */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fecha de recepción</label>
                      <div className="flex gap-2">
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                          className="bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none transition-all grow"
                        >
                          <option value="all">Todas las fechas</option>
                          <option value="today">De Hoy</option>
                          <option value="yesterday">De Ayer</option>
                          <option value="last7">Últimos 7 días</option>
                          <option value="custom">Fecha específica...</option>
                        </select>
                        
                        {dateFilter === 'custom' && (
                          <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="bg-zinc-950/60 border border-zinc-900 focus:border-emerald-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none transition-all"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List / Cards */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-zinc-500">
                      Coincidencias encontradas: {filteredReceived.length} correos
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReceived.map((email, idx) => (
                        <div key={email.ID || idx} className="glass-panel border-white/5 hover:border-emerald-500/25 hover:bg-zinc-900/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all group">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-zinc-900 text-zinc-400 font-bold border border-zinc-800 px-2 py-0.5 rounded-md">
                                  Nro: {idx + 1}
                                </span>
                                <h4 className="text-xs font-extrabold text-white">{email.De}</h4>
                              </div>
                              <span className="text-[10px] text-zinc-400 block font-mono select-all">
                                {email.Email}
                              </span>
                            </div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-bold px-2.5 py-1 rounded-full shrink-0">
                              {formatDate(email.Fecha)}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-extrabold text-zinc-600 uppercase tracking-widest block">Asunto</span>
                            <p className="text-xs text-zinc-300 font-semibold">{email.Asunto}</p>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60">
                            <button
                              onClick={() => handleOpenEmailModal(email)}
                              className="text-[10px] font-mono font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1.5 cursor-pointer bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg hover:border-purple-500/40 transition-colors"
                              title="Ver correo completo en EstudioLab"
                            >
                              ID: {email.ID?.substring(0, 8)}... <Eye className="w-3 h-3 text-purple-400" />
                            </button>
                            <button
                              onClick={() => handleCopyEmail(email.Email)}
                              className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer bg-zinc-950/60 border border-zinc-900 py-1.5 px-3 rounded-lg group-hover:border-zinc-800 transition-colors"
                            >
                              {copiedEmail === email.Email ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copiar Email
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredReceived.length === 0 && (
                      <div className="glass-panel border-dashed border-zinc-900 rounded-3xl p-12 text-center text-zinc-500">
                        Ningún correo recibido coincide con los filtros especificados.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONTACTS DIRECTORY (GMAIL STYLE) */}
              {activeTab === 'contacts' && (
                <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                  {/* Google Contacts Panel (White Container) */}
                  <div className="bg-white text-zinc-900 rounded-3xl shadow-xl border border-zinc-200 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-6">
                      
                      {/* Top Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-100">
                        {/* Left action group: Create contact & Select All checkbox */}
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 text-[#1a73e8] hover:bg-zinc-50 border border-zinc-200 font-semibold px-4 py-2.5 rounded-full text-sm transition-colors cursor-pointer shadow-sm focus:outline-none"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Crear contacto
                          </button>

                          {/* + Cliente Button - Hidden if ALL selected contacts are already clients */}
                          {hasSelectedNonClients && (
                            <button
                              onClick={() => handleCreateClientSheets()}
                              disabled={isCreatingClient}
                              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2.5 rounded-full text-xs transition-all cursor-pointer shadow-md shadow-purple-500/20 focus:outline-none disabled:opacity-50 animate-fadeIn"
                              title="Crear pestaña de cliente en Google Sheets para los contactos seleccionados"
                            >
                              {isCreatingClient ? (
                                <>
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                                  Creando...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 text-white" />
                                  + Cliente
                                </>
                              )}
                            </button>
                          )}

                          {/* Select All Checkbox */}
                          {filteredContacts.length > 0 && (
                            <label className="flex items-center gap-2 text-xs text-zinc-500 font-semibold cursor-pointer hover:text-zinc-800 transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                                onChange={handleSelectAllContacts}
                                className="w-4 h-4 rounded border-zinc-300 text-[#1a73e8] focus:ring-[#1a73e8]"
                              />
                              Seleccionar todos
                            </label>
                          )}
                        </div>

                        {/* Search in Google Contacts */}
                        <div className="relative w-full sm:max-w-xs">
                          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar contacto..."
                            className="w-full bg-zinc-50 border border-zinc-200 focus:border-[#1a73e8] rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none transition-all text-zinc-900"
                          />
                        </div>
                      </div>

                      {/* Title: Contactos (X) */}
                      <div className="text-zinc-500 text-xs font-semibold">
                        Contactos ({filteredContacts.length})
                      </div>

                      {/* Vertical List of Contacts */}
                      <div className="divide-y divide-zinc-100">
                        {filteredContacts.map((contact, idx) => {
                          const isSelected = selectedContacts.has(contact.email);
                          const fullName = `${contact.Nombre} ${contact.Apellido}`.trim();
                          const sheetInfo = clientSheets[fullName] || clientSheets[contact.Nombre] || (contact.email ? clientSheets[contact.email] : null);
                          const hasClientSheet = !!(sheetInfo && sheetInfo.exists);
                          const isInactive = hasClientSheet && sheetInfo.status === 'Inactivo';

                          return (
                            <div 
                              key={contact.email || idx} 
                              className={`flex items-center justify-between py-3.5 hover:bg-zinc-50 rounded-xl px-4 -mx-4 transition-all group ${
                                isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''
                              } ${isInactive ? 'opacity-60 bg-zinc-100/60 grayscale-[25%]' : ''}`}
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                {/* Selection Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleContactSelection(contact.email)}
                                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />

                                {/* Blue circular profile avatar (Disabled if Inactive) */}
                                <button
                                  type="button"
                                  disabled={isInactive}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isInactive) {
                                      handleAvatarClick(contact);
                                    }
                                  }}
                                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 shadow-sm focus:outline-none ${
                                    isInactive 
                                      ? 'bg-zinc-300 text-zinc-400 cursor-not-allowed opacity-50' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110 active:scale-95 cursor-pointer'
                                  }`}
                                  title={isInactive ? "Cliente Inactivo - Ficha inhabilitada" : "Ver ficha completa de cliente y su historial"}
                                >
                                  <svg className="w-5 h-5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-semibold ${isInactive ? 'text-zinc-500 line-through' : 'text-zinc-950'}`}>
                                      {contact.Nombre} {contact.Apellido}
                                    </h4>
                                    {isInactive && (
                                      <span className="text-[9px] font-black text-zinc-500 bg-zinc-200 border border-zinc-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Inactivo
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-500 block truncate font-medium">
                                    {contact.email}
                                  </span>
                                </div>
                              </div>

                              {/* Actions, Vibrant Green Switch (Replaces Copy Icon) and detail */}
                              <div className="flex items-center gap-3">
                                {contact.Telefono && (
                                  <span className="text-[10px] text-zinc-500 bg-zinc-100 border border-zinc-200 py-1 px-2.5 rounded-full font-medium hidden sm:inline-block">
                                    {contact.Telefono}
                                  </span>
                                )}

                                {/* If contact has a client sheet: show exact iOS green pill switch from Image 1. Otherwise leave space empty. */}
                                {hasClientSheet ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleClientStatus(fullName, sheetInfo.status);
                                    }}
                                    disabled={togglingClient === fullName}
                                    className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-all duration-200 ease-in-out focus:outline-none ${
                                      !isInactive 
                                        ? 'bg-[#22c55e] border-2 border-[#22c55e]' 
                                        : 'bg-zinc-300 border-2 border-zinc-300'
                                    } ${togglingClient === fullName ? 'opacity-50 cursor-wait' : ''}`}
                                    title={isInactive ? 'Cliente Inactivo (Clic para Activar)' : 'Cliente Activo (Clic para Desactivar)'}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-6 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                        !isInactive ? 'translate-x-[20px]' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}

                        {filteredContacts.length === 0 && (
                          <div className="text-center py-12 text-zinc-400 text-xs">
                            No se encontraron contactos en tu agenda.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* STICKY BOTTOM ACTIONS BAR */}
      {selectedContacts.size > 0 && activeTab === 'contacts' && (
        <>
          {/* Mobile Bottom Bar (Fixed to bottom screen edge on mobile phones) */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-purple-200 p-3 shadow-2xl z-40 animate-slideUp flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-bold text-zinc-800">
                Seleccionados: <span className="text-purple-600 font-extrabold text-sm">{selectedContacts.size}</span>
              </span>
              <button
                onClick={() => setSelectedContacts(new Set())}
                className="text-zinc-500 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none max-w-full">
              {hasSelectedNonClients && (
                <button
                  onClick={() => handleCreateClientSheets()}
                  disabled={isCreatingClient}
                  className="bg-purple-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-md shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingClient ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                      <span>+ Cliente</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => openGmailComposeModal()}
                className="bg-purple-600 text-white text-xs font-extrabold px-4 py-2 rounded-full shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Nuevo Correo</span>
              </button>

              <button
                onClick={() => initializeTemplate('resolucion')}
                className="bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-bold px-4 py-2 rounded-full shrink-0 cursor-pointer"
              >
                Enviar Resolución
              </button>

              <button
                onClick={() => initializeTemplate('subi_acuerdo')}
                className="bg-[#c2e7ff] text-[#001d35] text-xs font-bold px-4 py-2 rounded-full shrink-0 cursor-pointer"
              >
                Enviar Subí Acuerdo
              </button>
            </div>
          </div>

          {/* Desktop Floating Bottom Bar (Pill Bar centered on Desktop) */}
          <div className="hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-zinc-200 text-zinc-900 py-3.5 px-7 rounded-full shadow-2xl items-center gap-6 z-40 animate-slideUp">
            <div className="text-xs font-bold shrink-0 text-zinc-800">
              Seleccionados: <span className="text-purple-600 font-extrabold text-sm">{selectedContacts.size}</span> contactos
            </div>
            
            <div className="w-px h-6 bg-zinc-250"></div>
            
            <div className="flex items-center gap-3">
              {/* Button + Cliente - Hidden if ALL selected contacts are already clients */}
              {hasSelectedNonClients && (
                <button
                  onClick={() => handleCreateClientSheets()}
                  disabled={isCreatingClient}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-md shadow-purple-500/20 flex items-center gap-1.5 focus:outline-none disabled:opacity-50 animate-fadeIn"
                >
                  {isCreatingClient ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-white" />
                      + Cliente
                    </>
                  )}
                </button>
              )}

              {/* Button 0: Nuevo Correo */}
              <button
                onClick={() => openGmailComposeModal()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-md shadow-purple-500/20 flex items-center gap-1.5 focus:outline-none"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                Nuevo Correo
              </button>

              {/* Button 1: Resolución */}
              <button
                onClick={() => initializeTemplate('resolucion')}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300/80 text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm focus:outline-none"
              >
                Enviar Resolución
              </button>
              
              {/* Button 2: Subí acuerdo */}
              <button
                onClick={() => initializeTemplate('subi_acuerdo')}
                className="bg-[#c2e7ff] hover:bg-[#a5dbf9] text-[#001d35] text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm focus:outline-none"
              >
                Enviar Subí Acuerdo
              </button>
              
              {/* Clear Selection */}
              <button
                onClick={() => setSelectedContacts(new Set())}
                className="text-zinc-500 hover:text-zinc-900 text-xs font-semibold px-3 py-2 transition-colors cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>
          </div>
        </>
      )}

      {/* CONFIRMATION EMAIL SENDING MODAL */}
      {isConfirmSendModalOpen && activeTemplate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-fadeIn p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-650 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Previsualizar y Confirmar Envío</h3>
              </div>
              <button 
                onClick={() => setIsConfirmSendModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary info */}
              <div className="bg-[#f0f4f9] border-l-4 border-blue-600 rounded-r-2xl p-4 text-sm text-zinc-800 space-y-1.5 shadow-sm">
                <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Enviar correo a:
                </div>
                <div className="font-mono text-[13px] bg-white border border-zinc-200 p-3 rounded-xl break-all leading-normal max-h-24 overflow-y-auto font-bold text-blue-700 shadow-inner">
                  {Array.from(selectedContacts).join(', ')}
                </div>
              </div>

              {/* Subject Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Asunto del correo</span>
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3.5 px-4 text-xs text-zinc-900 font-semibold focus:outline-none transition-colors"
                />
              </div>

              {/* Body Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Cuerpo del correo</span>
                <textarea
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  rows={12}
                  className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl p-4 text-xs text-zinc-800 font-mono whitespace-pre-wrap leading-relaxed focus:outline-none transition-colors resize-y min-h-[250px]"
                />
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-100 shrink-0 mt-auto bg-zinc-50">
              <button
                type="button"
                onClick={() => setIsConfirmSendModalOpen(false)}
                className="bg-transparent hover:bg-zinc-200/50 text-zinc-600 border border-transparent px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendEmails}
                disabled={isSendingEmails}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmails ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-800 animate-spin"></div>
                    Enviando correos...
                  </>
                ) : (
                  'Confirmar y Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. CREATE CONTACT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 animate-fadeIn p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-650" />
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">Crear nuevo contacto</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej: Lola"
                    className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none text-zinc-900 placeholder:text-zinc-400 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Apellido</label>
                  <input
                    type="text"
                    value={newApellido}
                    onChange={(e) => setNewApellido(e.target.value)}
                    placeholder="Ej: Sánchez"
                    className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none text-zinc-900 placeholder:text-zinc-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ej: nombre@correo.com"
                  className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none text-zinc-900 placeholder:text-zinc-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Teléfono</label>
                <input
                  type="text"
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  placeholder="Ej: 0221 672-3254"
                  className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none text-zinc-900 placeholder:text-zinc-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Dirección</label>
                <input
                  type="text"
                  value={newDireccion}
                  onChange={(e) => setNewDireccion(e.target.value)}
                  placeholder="Ej: Calle 123..."
                  className="w-full bg-white border border-zinc-200 focus:border-purple-500/50 rounded-xl py-3 px-4 text-xs focus:outline-none text-zinc-900 placeholder:text-zinc-400 transition-colors"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-transparent hover:bg-zinc-200/50 text-zinc-650 border border-transparent px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-800 animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar contacto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Viewing Email Content */}
      {isViewEmailModalOpen && selectedEmailMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 text-zinc-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 pb-4 mb-4">
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                    Detalle del Correo
                  </span>
                  {selectedEmailMeta.Para ? (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Enviado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Recibido
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 leading-snug">
                  {selectedEmailMeta.Asunto || selectedEmailDetails?.subject || '(Sin Asunto)'}
                </h3>
              </div>
              <button
                onClick={() => setIsViewEmailModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 p-2 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 border border-zinc-100 p-4 rounded-2xl mb-4 text-xs">
              <div>
                <span className="text-zinc-400 font-bold uppercase block text-[9px] tracking-wider">
                  {selectedEmailMeta.Para ? 'Para' : 'De'}
                </span>
                <span className="text-zinc-800 font-semibold">{selectedEmailMeta.Para || selectedEmailMeta.De || selectedEmailMeta.Email}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-bold uppercase block text-[9px] tracking-wider">Email</span>
                <span className="text-zinc-800 font-mono select-all">{selectedEmailMeta.Email}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-bold uppercase block text-[9px] tracking-wider">Fecha</span>
                <span className="text-zinc-700 font-medium">
                  {selectedEmailMeta.Fecha ? new Date(selectedEmailMeta.Fecha).toLocaleString('es-AR') : 'Reciente'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 font-bold uppercase block text-[9px] tracking-wider">ID de Gmail</span>
                <span className="text-zinc-600 font-mono text-[11px] select-all">{selectedEmailMeta.ID}</span>
              </div>
            </div>

            {/* Email Body Container (Light Background) */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50">
              {isLoadingEmailDetails ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-zinc-500">
                  <RefreshCw className="w-7 h-7 text-purple-600 animate-spin" />
                  <span className="text-xs font-semibold">Obteniendo cuerpo completo desde Gmail...</span>
                </div>
              ) : emailDetailsError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Nota de vista previa:
                  </p>
                  <p className="text-zinc-600">{emailDetailsError}</p>
                </div>
              ) : selectedEmailDetails?.body ? (
                <div 
                  className="prose prose-slate prose-sm max-w-none text-zinc-800 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: selectedEmailDetails.body }}
                />
              ) : selectedEmailDetails?.plainBody ? (
                <pre className="text-xs text-zinc-800 whitespace-pre-wrap font-sans leading-relaxed bg-white p-5 rounded-xl border border-zinc-200/80 shadow-sm">
                  {selectedEmailDetails.plainBody}
                </pre>
              ) : (
                <div className="text-xs text-zinc-500 italic py-12 text-center">
                  Sin vista previa de cuerpo en el registro local.
                </div>
              )}

              {/* Display Attachments if available */}
              {selectedEmailDetails?.attachments && selectedEmailDetails.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
                  <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    Archivos adjuntos ({selectedEmailDetails.attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmailDetails.attachments.map((att: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        className="bg-white hover:bg-purple-50 text-zinc-800 hover:text-purple-900 border border-zinc-200 hover:border-purple-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer group"
                        title="Haz clic para descargar archivo"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span className="truncate max-w-[180px] font-medium">{att.name}</span>
                        {att.size > 0 && (
                          <span className="text-[10px] text-zinc-400 font-mono">({(att.size / 1024).toFixed(1)} KB)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-4">
              <a
                href={`https://mail.google.com/mail/?authuser=abordajeintegraldeconflictos@gmail.com#search/subject%3A${encodeURIComponent('"' + (selectedEmailMeta.Asunto || '') + '"')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                Abrir en Gmail Web <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setIsViewEmailModalOpen(false)}
                className="bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-200/80 px-7 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GMAIL-STYLE COMPOSE EMAIL MODAL */}
      {isGmailComposeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-zinc-300 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 text-zinc-900 h-[85vh] sm:h-[620px]">
            {/* Modal Window Header (Gmail Style) */}
            <div className="bg-[#f2f6fc] border-b border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0 select-none">
              <span className="text-xs font-bold text-zinc-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Mensaje nuevo
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGmailComposeOpen(false)}
                  className="text-zinc-500 hover:text-zinc-800 p-1.5 rounded-md hover:bg-zinc-200/60 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recipient Row (Para) */}
            <div className="border-b border-zinc-200 px-4 py-2.5 flex items-start gap-3 text-xs bg-white shrink-0">
              <span className="text-zinc-400 font-medium py-1 shrink-0 w-12">Para</span>
              <div className="flex-1 flex flex-wrap gap-1.5 items-center max-h-24 overflow-y-auto">
                {contacts.filter((c) => selectedContacts.has(c.email)).map((contact) => (
                  <span
                    key={contact.email}
                    className="bg-purple-50 text-purple-900 border border-purple-200/80 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{contact.Nombre} {contact.Apellido}</span>
                    <span className="text-purple-400 text-[10px] font-mono">&lt;{contact.email}&gt;</span>
                  </span>
                ))}
                {selectedContacts.size === 0 && (
                  <span className="text-zinc-400 italic py-1">Selecciona contactos en la lista principal</span>
                )}
              </div>
            </div>

            {/* Subject Row (Asunto) */}
            <div className="border-b border-zinc-200 px-4 py-2 flex items-center gap-3 text-xs bg-white shrink-0">
              <span className="text-zinc-400 font-medium shrink-0 w-12">Asunto</span>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Asunto"
                className="flex-1 bg-transparent py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-medium"
              />
            </div>

            {/* Body Text Area & Attachments */}
            <div className="flex-1 p-4 bg-white overflow-y-auto flex flex-col justify-between">
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Escribe aquí tu correo electrónico..."
                className="w-full flex-1 bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none resize-none font-sans leading-relaxed p-2"
              />

              {/* Display Attached Files if any */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-100 mt-2">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-50 text-purple-900 border border-purple-200/80 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <span className="text-[10px] text-purple-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-purple-400 hover:text-purple-700 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gmail-Style Bottom Action Toolbar */}
            <div className="bg-[#f2f6fc] border-t border-zinc-200 p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Enviar Button (Celeste Claro) */}
                <button
                  type="button"
                  onClick={handleSendCustomEmail}
                  disabled={isSendingCustomEmail}
                  className="bg-[#c2e7ff] hover:bg-[#a5dbf9] text-[#001d35] border border-[#b2ddf7] px-6 py-2.5 rounded-full text-xs font-extrabold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingCustomEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#001d35]/30 border-t-[#001d35] animate-spin"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar <Send className="w-3.5 h-3.5 text-[#001d35]" />
                    </>
                  )}
                </button>

                {/* Paperclip Button for Attachments */}
                <label
                  className="p-2 text-zinc-600 hover:text-purple-600 hover:bg-zinc-200/60 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                  title="Adjuntar archivo"
                >
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const newFiles = Array.from(e.target.files);
                        setAttachedFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>

                {/* Microphone Button (Redacción por Voz & N8N Transcribe Webhook) */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isTranscribingVoice}
                  className={`p-2 rounded-full transition-all flex items-center gap-2 text-xs font-bold cursor-pointer ${
                    isVoiceRecording
                      ? 'bg-red-500 text-white shadow-md animate-pulse px-3'
                      : isTranscribingVoice
                      ? 'bg-purple-100 text-purple-700 px-3 cursor-wait'
                      : 'text-zinc-600 hover:text-purple-600 hover:bg-zinc-200/60'
                  }`}
                  title={isVoiceRecording ? "Detener grabación de voz" : "Redactar correo por voz (N8N Transcribe)"}
                >
                  {isTranscribingVoice ? (
                    <>
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                      <span>Transcribiendo...</span>
                    </>
                  ) : isVoiceRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current text-white animate-bounce" />
                      <span>
                        {String(Math.floor(voiceRecordingTime / 60)).padStart(2, '0')}:
                        {String(voiceRecordingTime % 60).padStart(2, '0')} (Detener)
                      </span>
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                {/* Formato Bonito IA Button (Sparkles) */}
                <button
                  type="button"
                  onClick={handlePolishEmailWithAI}
                  disabled={isPolishingEmail || !composeBody.trim()}
                  className={`p-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isPolishingEmail
                      ? 'bg-purple-100 text-purple-700 px-3 cursor-wait'
                      : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 shadow-2xs'
                  }`}
                  title="Dar formato bonito profesional con IA"
                >
                  {isPolishingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                      <span>Formateando IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      <span>Formato Bonito IA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Discard Draft Button */}
              <button
                type="button"
                onClick={() => setIsGmailComposeOpen(false)}
                className="text-zinc-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                title="Descartar borrador"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESUMEN DE CREACIÓN DE CLIENTES */}
      {clientCreationResultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-purple-200 rounded-3xl p-6 sm:p-8 max-w-md w-full flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 text-zinc-900">
            
            {/* Top Icon Badge */}
            <div className="flex justify-center mb-3">
              {clientCreationResultModal.created.length > 0 && clientCreationResultModal.alreadyExisting.length > 0 ? (
                <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-widest bg-purple-100 border border-purple-200 px-3.5 py-1 rounded-full">
                  Resultado del Procesamiento
                </span>
              ) : clientCreationResultModal.alreadyExisting.length > 0 ? (
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full">
                  Cliente Existente
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
                  Creación Exitosa
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-zinc-900 text-center leading-snug mb-5">
              {clientCreationResultModal.created.length > 0 && clientCreationResultModal.alreadyExisting.length > 0
                ? 'Resumen de Creación de Clientes'
                : clientCreationResultModal.alreadyExisting.length > 0
                ? '¡Este cliente ya fue creado previamente!'
                : '¡Cliente(s) creado(s) con éxito!'}
            </h3>

            {/* List Containers */}
            <div className="space-y-3 mb-6">
              {/* Section 1: Nuevos Clientes Creados */}
              {clientCreationResultModal.created.length > 0 && (
                <div className="bg-emerald-50/90 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    Cliente(s) Creado(s) Ahora ({clientCreationResultModal.created.length})
                  </span>
                  <div className="space-y-1 pl-5">
                    {clientCreationResultModal.created.map((name, idx) => (
                      <p key={idx} className="text-xs font-bold text-emerald-950">
                        • {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Clientes Previamente Existentes */}
              {clientCreationResultModal.alreadyExisting.length > 0 && (
                <div className="bg-purple-50/90 border border-purple-200 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                    Ya Se Encontraba(n) Creado(s) ({clientCreationResultModal.alreadyExisting.length})
                  </span>
                  <div className="space-y-1 pl-5">
                    {clientCreationResultModal.alreadyExisting.map((name, idx) => (
                      <p key={idx} className="text-xs font-bold text-purple-950">
                        • {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setClientCreationResultModal(null)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 px-6 rounded-2xl text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Prompt: Cliente no registrado (SI / NO) */}
      {unregisteredClientPromptModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-zinc-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-zinc-100 space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-zinc-900 leading-tight">Cliente no registrado</h3>
                <p className="text-xs text-zinc-500 font-medium">Sincronización con Google Sheets</p>
              </div>
            </div>

            <div className="space-y-3 bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl">
              <p className="text-sm font-semibold text-zinc-800">
                {unregisteredClientPromptModal.unregisteredContacts.length === 1 ? (
                  <>Este cliente <span className="font-black text-purple-700">"{unregisteredClientPromptModal.unregisteredContacts[0].Nombre} {unregisteredClientPromptModal.unregisteredContacts[0].Apellido}"</span> no se encuentra registrado.</>
                ) : (
                  <>Hay <span className="font-black text-purple-700">{unregisteredClientPromptModal.unregisteredContacts.length} clientes</span> que no se encuentran registrados.</>
                )}
              </p>
              <p className="text-xs font-bold text-zinc-700">
                ¿Desea registrarlo?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={unregisteredClientPromptModal.onSkipRegister}
                className="px-6 py-2.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                NO
              </button>
              <button
                type="button"
                onClick={unregisteredClientPromptModal.onConfirmRegister}
                className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
              >
                SÍ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA COMPLETA DE CLIENTE */}
      {isClientDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-white text-zinc-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-zinc-100 overflow-hidden animate-scaleUp">
            
            {/* Header / Banner Morado */}
            <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 p-4 sm:p-7 text-white relative">
              <button
                type="button"
                onClick={() => setIsClientDetailsModalOpen(false)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 sm:gap-4 pr-6">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40 shrink-0 shadow-lg">
                  <User className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 style={{ color: '#ffffff' }} className="!text-white text-lg sm:text-2xl font-black tracking-tight drop-shadow-md">
                      {clientDetailsData?.clientInfo.Nombre} {clientDetailsData?.clientInfo.Apellido}
                    </h2>
                    {clientDetailsData?.clientInfo.Estado === 'Activo' && (
                      <span style={{ color: '#a7f3d0' }} className="text-[10px] font-black bg-emerald-500/30 !text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Activo
                      </span>
                    )}
                    {clientDetailsData?.clientInfo.Estado === 'Inactivo' && (
                      <span style={{ color: '#e4e4e7' }} className="text-[10px] font-black bg-zinc-500/30 !text-zinc-200 border border-zinc-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#ffffff' }} className="!text-white text-xs font-bold flex items-center gap-1.5 mt-0.5 sm:mt-1 opacity-90 truncate max-w-[240px] sm:max-w-none">
                    <Mail className="w-3.5 h-3.5 text-white shrink-0" />
                    {clientDetailsData?.clientInfo.Email || 'Sin email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {isLoadingClientDetails ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-3 border-purple-600 border-t-transparent animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-zinc-500">Cargando la información del cliente desde Google Sheets...</p>
                </div>
              ) : clientDetailsData ? (
                <>
                  {/* Grid de Datos Principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                    <div>
                      <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-wider block mb-0.5">
                        Fecha de Alta
                      </span>
                      <span className="font-bold text-zinc-900 text-xs">
                        {clientDetailsData.clientInfo.FechaAlta || 'No registrada'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-wider block mb-0.5">
                        Trámite
                      </span>
                      <span className="font-bold text-zinc-900 text-xs">
                        {clientDetailsData.clientInfo.Tramite || 'Alta de Cliente'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-wider block mb-0.5">
                        Estado Actual
                      </span>
                      <span className="font-bold text-zinc-900 text-xs">
                        {clientDetailsData.clientInfo.Estado || 'Activo'}
                      </span>
                    </div>
                  </div>

                  {/* Sección: Notas de Registro y Eventos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        Notas de Registro & Histórico ({clientDetailsData.notes.length})
                      </h4>
                    </div>

                    {clientDetailsData.notes.length > 0 ? (
                      <div className="space-y-2">
                        {clientDetailsData.notes.map((item, idx) => {
                          const isEditingThis = editingNoteRow === item.row;
                          return (
                            <div key={idx} className="bg-zinc-50 border border-zinc-200/80 p-3.5 rounded-2xl flex flex-col gap-2 transition-all">
                              {isEditingThis ? (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Texto de la Nota</label>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handlePolishNoteWithAI('edit')}
                                          disabled={(isPolishingNote && notePolishTarget === 'edit') || !editingNoteText.trim()}
                                          className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                            isPolishingNote && notePolishTarget === 'edit'
                                              ? 'bg-purple-100 text-purple-700 cursor-wait'
                                              : 'text-purple-700 hover:bg-purple-100 border border-purple-200 bg-white'
                                          }`}
                                          title="Dar formato profesional a la nota con IA"
                                        >
                                          {isPolishingNote && notePolishTarget === 'edit' ? (
                                            <>
                                              <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
                                              <span>Formateando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="w-3 h-3 text-purple-600 fill-purple-200" />
                                              <span>Formato Bonito IA</span>
                                            </>
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteVoiceRecording('edit')}
                                          disabled={isNoteTranscribingVoice && noteVoiceTarget === 'edit'}
                                          className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                                            isNoteVoiceRecording && noteVoiceTarget === 'edit'
                                              ? 'bg-red-500 text-white shadow-xs animate-pulse'
                                              : isNoteTranscribingVoice && noteVoiceTarget === 'edit'
                                              ? 'bg-purple-100 text-purple-700 cursor-wait'
                                              : 'text-purple-700 hover:bg-purple-100 border border-purple-200 bg-white'
                                          }`}
                                          title={isNoteVoiceRecording && noteVoiceTarget === 'edit' ? "Detener grabación" : "Dictar nota por voz"}
                                        >
                                          {isNoteTranscribingVoice && noteVoiceTarget === 'edit' ? (
                                            <>
                                              <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
                                              <span>Transcribiendo...</span>
                                            </>
                                          ) : isNoteVoiceRecording && noteVoiceTarget === 'edit' ? (
                                            <>
                                              <Square className="w-2.5 h-2.5 fill-current text-white animate-bounce" />
                                              <span>
                                                {String(Math.floor(noteVoiceRecordingTime / 60)).padStart(2, '0')}:
                                                {String(noteVoiceRecordingTime % 60).padStart(2, '0')} (Detener)
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <Mic className="w-3 h-3 text-purple-600" />
                                              <span>Dictar voz</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <textarea
                                      value={editingNoteText}
                                      onChange={(e) => setEditingNoteText(e.target.value)}
                                      rows={2}
                                      className="w-full bg-white border border-purple-300 focus:border-purple-600 rounded-xl p-2.5 text-xs font-medium text-zinc-900 focus:outline-none"
                                    />
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Fecha</label>
                                      <input
                                        type="text"
                                        value={editingNoteDate}
                                        onChange={(e) => setEditingNoteDate(e.target.value)}
                                        className="w-full bg-white border border-purple-300 focus:border-purple-600 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 focus:outline-none"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 sm:pt-4">
                                      <button
                                        type="button"
                                        onClick={() => setEditingNoteRow(null)}
                                        className="px-3 py-1 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 text-xs font-bold cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingNote}
                                        onClick={handleSaveEditNote}
                                        className="px-4 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        {isSavingNote ? 'Guardando...' : 'Guardar'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-medium text-zinc-800 text-xs leading-relaxed">
                                      {item.nota}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-start">
                                    <span className="text-[10px] font-extrabold text-zinc-500 bg-zinc-200/70 px-2.5 py-1 rounded-full">
                                      {item.fecha}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditNote(item)}
                                      className="p-1 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                      title="Editar nota y fecha"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNote(item.row)}
                                      className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Eliminar nota"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-zinc-400 italic text-xs bg-zinc-50 p-4 rounded-2xl border border-dashed border-zinc-200 text-center">
                        No hay notas adicionales registradas en su pestaña.
                      </p>
                    )}

                    {/* Formulario para Agregar Nota Nueva / Botón + Agregar Nota debajo de la última nota */}
                    {isAddingNote ? (
                      <div className="bg-purple-50/80 border border-purple-200 p-4 rounded-2xl space-y-3 animate-fadeIn mt-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-purple-600" />
                            Nueva Nota de Seguimiento
                          </h5>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePolishNoteWithAI('new')}
                              disabled={(isPolishingNote && notePolishTarget === 'new') || !newNoteText.trim()}
                              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isPolishingNote && notePolishTarget === 'new'
                                  ? 'bg-purple-100 text-purple-700 cursor-wait'
                                  : 'text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 shadow-2xs'
                              }`}
                              title="Dar formato profesional a la nota con IA"
                            >
                              {isPolishingNote && notePolishTarget === 'new' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                                  <span>Formateando...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-200" />
                                  <span>Formato Bonito IA</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleNoteVoiceRecording('new')}
                              disabled={isNoteTranscribingVoice && noteVoiceTarget === 'new'}
                              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                                isNoteVoiceRecording && noteVoiceTarget === 'new'
                                  ? 'bg-red-500 text-white shadow-md animate-pulse'
                                  : isNoteTranscribingVoice && noteVoiceTarget === 'new'
                                  ? 'bg-purple-100 text-purple-700 cursor-wait'
                                  : 'text-purple-700 bg-white hover:bg-purple-100 border border-purple-200 shadow-2xs'
                              }`}
                              title={isNoteVoiceRecording && noteVoiceTarget === 'new' ? "Detener grabación de voz" : "Dictar nota por voz"}
                            >
                              {isNoteTranscribingVoice && noteVoiceTarget === 'new' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                                  <span>Transcribiendo...</span>
                                </>
                              ) : isNoteVoiceRecording && noteVoiceTarget === 'new' ? (
                                <>
                                  <Square className="w-3 h-3 fill-current text-white animate-bounce" />
                                  <span>
                                    {String(Math.floor(noteVoiceRecordingTime / 60)).padStart(2, '0')}:
                                    {String(noteVoiceRecordingTime % 60).padStart(2, '0')} (Detener)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Dictar por voz</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Escribe o dicta la nota de seguimiento..."
                          rows={2}
                          className="w-full bg-white border border-purple-200 focus:border-purple-600 rounded-xl p-3 text-xs font-medium text-zinc-900 focus:outline-none shadow-xs"
                        />
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[10px] font-bold text-purple-700 uppercase">Fecha:</span>
                            <input
                              type="text"
                              value={newNoteDate}
                              onChange={(e) => setNewNoteDate(e.target.value)}
                              className="bg-white border border-purple-200 focus:border-purple-600 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 focus:outline-none w-full sm:w-48"
                            />
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setIsAddingNote(false)}
                              className="px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSavingNote || !newNoteText.trim()}
                              onClick={handleSaveNewNote}
                              className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleStartAddNote}
                          className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50 text-purple-700 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer group"
                        >
                          <Plus className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                          + Agregar Nota
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sección: Historial de Correos (Columnas I a M) */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      Historial de Correos (Enviados & Recibidos) ({clientDetailsData.emails.length})
                    </h4>

                    {clientDetailsData.emails.length > 0 ? (
                      <div className="space-y-2.5">
                        {clientDetailsData.emails.map((mail, idx) => (
                          <div key={idx} className="bg-emerald-50/40 border border-emerald-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  mail.tipo === 'Enviado' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {mail.tipo}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-500">
                                  {mail.fecha}
                                </span>
                              </div>
                              <p className="font-bold text-zinc-900 text-xs truncate">
                                {mail.asunto}
                              </p>
                            </div>

                            {/* Link / Botón ejecutable para abrir contenido del email */}
                            {mail.emailId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsClientDetailsModalOpen(false);
                                  handleOpenEmailModal({
                                    ID: mail.emailId,
                                    Asunto: mail.asunto,
                                    Fecha: mail.fecha,
                                    Email: clientDetailsData.clientInfo.Email
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 self-start sm:self-center"
                                title="Ver contenido completo del correo y adjuntos en EstudioLab"
                              >
                                ID: {mail.emailId.substring(0, 8)}...
                                <Eye className="w-3.5 h-3.5 text-purple-600" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">Sin ID</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 italic text-xs bg-zinc-50 p-4 rounded-2xl border border-dashed border-zinc-200 text-center">
                        No hay correos registrados aún en las columnas verdes de su pestaña.
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsClientDetailsModalOpen(false)}
                className="px-6 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PROMPT PARA CREAR CLIENTE DESDE EL HOMBRECITO AZUL */}
      {noClientSheetPromptModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100 animate-scaleUp space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900">
                  ¡Sin Ficha de Cliente!
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Verificación en fichas_clientes
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-700 leading-relaxed bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
              Este contacto <span className="font-extrabold text-purple-900">"{noClientSheetPromptModal.fullName}"</span> no tiene ficha de cliente. <br />
              <span className="font-extrabold text-zinc-900 block mt-1.5 text-sm">¿Desea crearla ahora?</span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNoClientSheetPromptModal({ isOpen: false, contact: null, fullName: '' })}
                className="px-5 py-2.5 rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-100 text-xs font-extrabold transition-all cursor-pointer"
              >
                NO
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateClientFromAvatar}
                className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 text-white" />
                SÍ, crear ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARGANDO / CREANDO FICHA DE CLIENTE */}
      {isCreatingClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white text-zinc-900 rounded-3xl max-w-md w-full p-8 shadow-2xl border border-purple-100 flex flex-col items-center text-center space-y-6 animate-scaleUp">
            
            {/* Spinner animado con icono */}
            <div className="relative flex items-center justify-center w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <UserPlus className="w-7 h-7 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-purple-950 tracking-tight">
                Creando Ficha de Cliente
              </h3>
              <p className="text-xs font-semibold text-zinc-700 leading-relaxed bg-purple-50/80 border border-purple-100 p-4 rounded-2xl">
                Aguarde, estamos creando la ficha del cliente <br />
                <span className="font-black text-purple-900 text-sm block mt-1.5 drop-shadow-xs">
                  {creatingClientName || 'Cliente'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              Sincronizando con Google Sheets...
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
