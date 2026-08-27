import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

export interface AppUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

const provider = new GoogleAuthProvider();

// Request all necessary Workspace scopes
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.addons.student',
  'https://www.googleapis.com/auth/classroom.addons.teacher',
  'https://www.googleapis.com/auth/classroom.announcements',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/classroom.guardianlinks.me.readonly',
  'https://www.googleapis.com/auth/classroom.guardianlinks.students',
  'https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.profile.photos',
  'https://www.googleapis.com/auth/classroom.push-notifications',
  'https://www.googleapis.com/auth/classroom.rosters',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/classroom.topics',
  'https://www.googleapis.com/auth/classroom.topics.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings'
];

SCOPES.forEach(scope => provider.addScope(scope));

let cachedAccessToken: string | null = null;
let cachedUser: AppUser | null = null;

declare global {
  interface Window {
    google?: any;
  }
}

export const initAuth = (
  onAuthSuccess?: (user: AppUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check sessionStorage first for active session
  try {
    const savedToken = sessionStorage.getItem('sss_access_token');
    const savedUserStr = sessionStorage.getItem('sss_user_info');
    if (savedToken && savedUserStr) {
      cachedAccessToken = savedToken;
      cachedUser = JSON.parse(savedUserStr);
      if (onAuthSuccess && cachedUser) {
        onAuthSuccess(cachedUser, savedToken);
      }
    }
  } catch (e) {
    console.error('Failed to parse saved session:', e);
  }

  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const appUser: AppUser = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      };
      if (cachedAccessToken) {
        cachedUser = appUser;
        sessionStorage.setItem('sss_access_token', cachedAccessToken);
        sessionStorage.setItem('sss_user_info', JSON.stringify(appUser));
        if (onAuthSuccess) onAuthSuccess(appUser, cachedAccessToken);
      }
    } else {
      if (!sessionStorage.getItem('sss_access_token')) {
        cachedAccessToken = null;
        cachedUser = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

const signInWithGSI = (scopesStr: string, clientId: string): Promise<{ user: AppUser; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('GIS not loaded'));
    }
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopesStr,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(tokenResponse);
          }
          const accessToken = tokenResponse.access_token;
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userData = await userRes.json();
            const appUser: AppUser = {
              displayName: userData.name || userData.email || 'Người dùng Google',
              email: userData.email || '',
              photoURL: userData.picture || null,
              uid: userData.sub || 'google-user'
            };
            resolve({ user: appUser, accessToken });
          } catch (e) {
            resolve({
              user: {
                displayName: 'Người dùng Google',
                email: '',
                photoURL: null,
                uid: 'google-user'
              },
              accessToken
            });
          }
        },
        error_callback: (err: any) => {
          reject(err);
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
};

const syncUserToPostgres = async (user: AppUser) => {
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoURL
      })
    });
  } catch (err) {
    console.warn('Failed to sync user to database:', err);
  }
};

export const googleSignIn = async (): Promise<{ user: AppUser; accessToken: string } | null> => {
  // 1. Try Google Identity Services first if available (bypasses Firebase Auth authorized domain restriction for OAuth token)
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    try {
      const res = await signInWithGSI(SCOPES.join(' '), firebaseConfig.oAuthClientId);
      cachedAccessToken = res.accessToken;
      cachedUser = res.user;
      sessionStorage.setItem('sss_access_token', res.accessToken);
      sessionStorage.setItem('sss_user_info', JSON.stringify(res.user));
      syncUserToPostgres(res.user);
      return res;
    } catch (gsiErr: any) {
      console.warn('GIS login failed, falling back to Firebase Auth:', gsiErr);
      if (gsiErr?.type === 'popup_closed' || gsiErr?.error === 'popup_closed_by_user') {
        const err: any = new Error('User closed the login popup');
        err.code = 'auth/popup-closed-by-user';
        throw err;
      }
    }
  }

  // 2. Fallback to Firebase Auth signInWithPopup
  provider.setCustomParameters({
    prompt: 'consent'
  });
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    const appUser: AppUser = {
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      uid: result.user.uid
    };

    cachedAccessToken = credential.accessToken;
    cachedUser = appUser;
    sessionStorage.setItem('sss_access_token', cachedAccessToken);
    sessionStorage.setItem('sss_user_info', JSON.stringify(appUser));
    syncUserToPostgres(appUser);
    return { user: appUser, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Auth sign in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  const savedToken = sessionStorage.getItem('sss_access_token');
  if (savedToken) {
    cachedAccessToken = savedToken;
    return savedToken;
  }
  return null;
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.error('Error signing out of Firebase:', e);
  }
  cachedAccessToken = null;
  cachedUser = null;
  sessionStorage.removeItem('sss_access_token');
  sessionStorage.removeItem('sss_user_info');
};

