export interface Profile {
  id: string;
  name: string;
  photoBase64: string; // reference image in base64
  photoUrl: string; // local blob/data URL for rendering
  createdAt: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  matchedProfileId?: string | null;
  matchedProfileName?: string | null;
  confidence?: number | null;
}

export interface OrganizeResult {
  fileId: string;
  fileName: string;
  matchedProfileId: string | null;
  matchedProfileName: string | null;
  confidence: number;
  subfolderId?: string;
  status: 'matched' | 'unmatched' | 'error';
  error?: string;
}

export interface ProcessLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
