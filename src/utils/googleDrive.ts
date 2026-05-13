/**
 * Utility for Google Drive Integration
 * Handles authentication and file operations (read/write).
 */

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

// Load the Google API scripts
export const loadGoogleScripts = (): Promise<void> => {
  return new Promise((resolve) => {
    if (gapiInited && gisInited) return resolve();

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      (window as any).gapi.load('client', async () => {
        await (window as any).gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        if (gisInited) resolve();
      });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at usage
      });
      gisInited = true;
      if (gapiInited) resolve();
    };
    document.body.appendChild(gisScript);
  });
};

export const authenticateGoogle = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          reject(resp);
        }
        resolve(resp.access_token);
      };

      if ((window as any).gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (err) {
      reject(err);
    }
  });
};

export const uploadToDrive = async (name: string, blob: Blob, fileId?: string): Promise<string | null> => {
  try {
    const metadata = {
      name: name,
      mimeType: 'application/pdf',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    const response = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${(window as any).gapi.client.getToken().access_token}`,
      },
      body: form,
    });

    const result = await response.json();
    return result.id;
  } catch (err) {
    console.error('[GoogleDrive] Upload failed:', err);
    return null;
  }
};
