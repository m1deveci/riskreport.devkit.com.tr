const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6000';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'isg_expert' | 'viewer';
  is_active?: boolean;
  location_ids?: string[];
}

export async function signIn(email: string, password: string, turnstileToken?: string) {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, turnstileToken }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login başarısız');
    }

    const data = await res.json();

    // Başarılı login - token ve user'ı localStorage'a kaydet
    const token = data.token;
    const user = data.user;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    // Custom event tetikle (same-tab'ta storage event'i çalışmadığı için)
    window.dispatchEvent(new Event('auth-changed'));

    return { user, profile: user };
  } catch (error) {
    throw new Error(`Login hatası: ${(error as Error).message}`);
  }
}

export async function signOut() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Custom event tetikle
    window.dispatchEvent(new Event('auth-changed'));
  } catch (error) {
    throw new Error(`Logout hatası: ${(error as Error).message}`);
  }
}

export async function signUp(
  email: string,
  password: string,
  full_name: string,
  role: 'admin' | 'isg_expert' | 'viewer' = 'viewer',
  location_ids: string[] = []
) {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Yönetici yetkisi gereklidir');

    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name,
        email,
        password,
        role,
        location_ids,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Kullanıcı oluşturulamadı');
    }

    const data = await res.json();
    return { id: data.id, email, full_name, role, location_ids };
  } catch (error) {
    throw new Error(`Kayıt hatası: ${(error as Error).message}`);
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) return null;

    const user = JSON.parse(userStr);

    // Token doğrulaması yap
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      // Token geçersiz, localStorage'dan sil
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    return user as UserProfile;
  } catch (error) {
    console.error('getCurrentUser hatası:', error);
    return null;
  }
}

export async function resetPassword(email: string) {
  throw new Error('Şifre sıfırlama şu anda desteklenmemektedir');
}

export async function updatePassword(newPassword: string) {
  throw new Error('Şifre güncelleme şu anda desteklenmemektedir');
}

export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  (async () => {
    const user = await getCurrentUser();
    callback(user);
  })();

  // localStorage değişikliklerini dinle
  const handleStorageChange = async () => {
    const user = await getCurrentUser();
    callback(user);
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}
