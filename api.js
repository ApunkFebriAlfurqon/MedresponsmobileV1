const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
let authToken = '';

export const isApiConfigured = Boolean(API_BASE_URL);

export function setAuthToken(token) {
  authToken = token || '';
}

function requireApiUrl() {
  if (!API_BASE_URL) {
    throw new Error('URL API belum diatur. Isi EXPO_PUBLIC_API_URL di file .env.');
  }
}

async function request(path, options = {}) {
  requireApiUrl();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Periksa alamat API dan koneksi jaringan.');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.message || body.error || '';
    } catch {
      // Gunakan status HTTP jika respons server bukan JSON.
    }
    const error = new Error(detail || `Server mengembalikan HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

function unwrapData(payload) {
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

export async function registerAccount({ fullName, email, password }) {
  const payload = unwrapData(await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password }),
  }));
  if (!payload?.token || !payload?.user) throw new Error('Server tidak mengembalikan sesi login yang valid.');
  return payload;
}

export async function loginAccount({ email, password }) {
  const payload = unwrapData(await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));
  if (!payload?.token || !payload?.user) throw new Error('Server tidak mengembalikan sesi login yang valid.');
  return payload;
}

export async function getCurrentUser() {
  const payload = unwrapData(await request('/auth/me'));
  if (!payload?.user) throw new Error('Data akun tidak ditemukan.');
  return payload.user;
}

export async function logoutAccount() {
  return request('/auth/logout', { method: 'POST' });
}

function formatDate(value) {
  if (!value) return 'Waktu tidak tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS = {
  submitted: 'Terkirim',
  searching_ambulance: 'Mencari ambulans',
  assigned: 'Ambulans ditugaskan',
  in_transit: 'Dalam perjalanan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function mapEmergencyRequest(record) {
  const request = record || {};
  const status = request.status || 'submitted';
  return {
    id: String(request.id || 'Tanpa ID'),
    date: formatDate(request.createdAt || request.created_at),
    status: STATUS_LABELS[status] || status,
    place: request.pickup?.address || request.location || 'Lokasi tidak tersedia',
    tone: ['submitted', 'searching_ambulance', 'assigned', 'in_transit'].includes(status) ? 'red' : 'green',
  };
}

export async function getEmergencyRequests() {
  const payload = unwrapData(await request('/emergency-requests'));
  const records = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(records)) {
    throw new Error('Format respons API tidak sesuai: daftar permintaan harus berupa array.');
  }
  return records.map(mapEmergencyRequest);
}

export async function getHealthcareFacilities(search = '') {
  const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
  const payload = unwrapData(await request(`/healthcare-facilities${query}`));
  const records = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(records)) {
    throw new Error('Format respons direktori fasilitas kesehatan tidak sesuai.');
  }
  return records.map((facility) => ({
    id: String(facility.id || 'Tanpa ID'),
    name: String(facility.name || 'Fasilitas kesehatan'),
    address: String(facility.address || 'Alamat belum tersedia'),
    phone: facility.phone ? String(facility.phone) : '',
    services: Array.isArray(facility.emergencyServices) ? facility.emergencyServices.map(String) : [],
    isSample: Boolean(facility.isSample),
  }));
}

export async function createEmergencyRequest(data) {
  const payload = await request('/emergency-requests', {
    method: 'POST',
    body: JSON.stringify({
      patient: {
        name: data.patient,
        condition: data.condition,
      },
      pickup: {
        address: data.location,
      },
      notes: data.notes,
      status: 'submitted',
    }),
  });

  const record = unwrapData(payload);
  if (!record || typeof record !== 'object') {
    throw new Error('Server tidak mengembalikan data permintaan yang berhasil dibuat.');
  }
  return mapEmergencyRequest(record);
}
