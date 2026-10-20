import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createEmergencyRequest,
  getCurrentUser,
  getEmergencyRequests,
  getHealthcareFacilities,
  loginAccount,
  logoutAccount,
  registerAccount,
  setAuthToken,
} from './api';

const COLORS = {
  background: '#F4F7FB',
  ink: '#14233B',
  muted: '#77849A',
  red: '#E84755',
  navy: '#14233B',
  teal: '#169B91',
  white: '#FFFFFF',
  line: '#E8EDF4',
};

const TABS = [
  { id: 'home', icon: '⌂', label: 'Beranda' },
  { id: 'history', icon: '◷', label: 'Aktivitas' },
  { id: 'plans', icon: '◇', label: 'Paket' },
  { id: 'profile', icon: '○', label: 'Profil' },
];

function Button({ title, onPress, secondary = false, style, disabled = false }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabledButton, style]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}

function DataFeedback({ loading, error, onRetry }) {
  if (loading) {
    return <View style={styles.dataFeedback}><ActivityIndicator color={COLORS.teal} size="small" /><Text style={styles.emptyText}>Memuat data dari server MedRespons…</Text></View>;
  }
  if (error) {
    return (
      <View style={styles.dataError}>
        <Text style={styles.dataErrorText}>{error}</Text>
        <Pressable onPress={onRetry}><Text style={styles.dataRetry}>Coba lagi</Text></Pressable>
      </View>
    );
  }
  return null;
}

function SectionTitle({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={styles.link}>{action}</Text></Pressable> : null}
    </View>
  );
}

function AuthScreen({ mode, onModeChange, onSubmit, loading, error, showRegisterPrompt }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isRegister = mode === 'register';

  const submit = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (isRegister && !fullName.trim()) return Alert.alert('Nama belum diisi', 'Masukkan nama lengkap Anda.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return Alert.alert('Email tidak valid', 'Periksa kembali alamat email Anda.');
    if (password.length < 8) return Alert.alert('Password terlalu pendek', 'Gunakan minimal 8 karakter.');
    if (isRegister && password !== confirmPassword) return Alert.alert('Password tidak cocok', 'Ulangi password dengan benar.');
    onSubmit({ fullName: fullName.trim(), email: cleanEmail, password });
  };

  return (
    <KeyboardAvoidingView style={styles.authScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.authBrandMark}><Text style={styles.authBrandIcon}>✚</Text></View>
        <Text style={styles.authBrand}>MedRespons</Text>
        <Text style={styles.authTagline}>Bantuan medis, lebih dekat.</Text>
        <View style={styles.authCard}>
          <Text style={styles.authTitle}>{isRegister ? 'Buat akun baru' : 'Selamat datang kembali'}</Text>
          <Text style={styles.authDescription}>{isRegister ? 'Daftar untuk mengakses layanan MedRespons.' : 'Masuk menggunakan akun MedRespons Anda.'}</Text>

          {isRegister ? <AuthField label="Nama lengkap" placeholder="Nama Anda" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={120} accessibilityLabel="Nama lengkap" /> : null}
          <AuthField label="Email" placeholder="nama@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" maxLength={254} accessibilityLabel="Email" />
          <AuthField label="Password" placeholder="Minimal 8 karakter" value={password} onChangeText={setPassword} autoComplete={isRegister ? 'new-password' : 'current-password'} textContentType={isRegister ? 'newPassword' : 'password'} maxLength={128} secureTextEntry={!passwordVisible} accessibilityLabel="Password" />
          {isRegister ? <AuthField label="Ulangi password" placeholder="Masukkan ulang password" value={confirmPassword} onChangeText={setConfirmPassword} autoComplete="new-password" textContentType="newPassword" maxLength={128} secureTextEntry={!passwordVisible} accessibilityLabel="Ulangi password" /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Sembunyikan password' : 'Tampilkan password'} onPress={() => setPasswordVisible((visible) => !visible)} style={styles.passwordToggle}>
            <Text style={styles.passwordToggleText}>{passwordVisible ? 'Sembunyikan password' : 'Tampilkan password'}</Text>
          </Pressable>

          {error ? <Text accessibilityRole="alert" style={styles.authError}>{error}</Text> : null}
          {showRegisterPrompt ? (
            <Pressable disabled={loading} onPress={() => onModeChange('register')} accessibilityRole="button">
              <Text style={styles.authSwitchLink}>Belum punya akun? Daftar dulu</Text>
            </Pressable>
          ) : null}
          <Button title={loading ? 'MOHON TUNGGU…' : isRegister ? 'BUAT AKUN' : 'MASUK'} onPress={submit} disabled={loading} style={styles.authSubmit} />
          <View style={styles.authSwitchRow}>
            <Text style={styles.authSwitchText}>{isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}</Text>
            <Pressable disabled={loading} onPress={() => onModeChange(isRegister ? 'login' : 'register')} accessibilityRole="button">
              <Text style={styles.authSwitchLink}>{isRegister ? 'Masuk' : 'Daftar'}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.authFootnote}>Dengan melanjutkan, data akun Anda digunakan untuk mengelola permintaan layanan MedRespons.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthField({ label, accessibilityLabel, ...inputProps }) {
  return (
    <View style={styles.authFieldGroup}>
      <Text style={styles.authFieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        placeholderTextColor="#9AA5B5"
        style={styles.authInput}
        returnKeyType="next"
        {...inputProps}
      />
    </View>
  );
}

function HomeScreen({ onRequest, onHistory, onFacilities, onRefresh, history, historyLoading, historyError, userName }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.eyebrow}>SELAMAT PAGI 👋</Text>
          <Text style={styles.greeting}>{userName}</Text>
        </View>
        <Pressable style={styles.notificationButton} onPress={() => Alert.alert('Notifikasi', 'Belum ada notifikasi baru.')}>
          <Text style={styles.notificationIcon}>♧</Text>
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <View style={styles.emergencyCard}>
        <View style={styles.emergencyTop}>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>SIAGA 24 JAM</Text></View>
          <Text style={styles.ambulanceEmoji}>🚑</Text>
        </View>
        <Text style={styles.emergencyTitle}>Butuh bantuan{ '\n' }medis sekarang?</Text>
        <Text style={styles.emergencyDescription}>Ambulans terdekat siap membantu Anda dan keluarga.</Text>
        <Pressable onPress={onRequest} style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]}>
          <Text style={styles.sosIcon}>＋</Text>
          <Text style={styles.sosText}>PANGGIL AMBULANS</Text>
          <Text style={styles.sosArrow}>→</Text>
        </Pressable>
        <Text style={styles.emergencyFootnote}>Respons cepat · Tim medis terverifikasi</Text>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statCard}><Text style={styles.statIcon}>⏱</Text><Text style={styles.statValue}>~8 menit</Text><Text style={styles.statLabel}>Rata-rata tiba</Text></View>
        <View style={styles.statCard}><Text style={styles.statIcon}>✚</Text><Text style={styles.statValue}>24 unit</Text><Text style={styles.statLabel}>Ambulans siaga</Text></View>
      </View>

      <SectionTitle title="Akses cepat" />
      <View style={styles.shortcutRow}>
        <Pressable style={styles.shortcut} onPress={onRequest}><Text style={[styles.shortcutIcon, { backgroundColor: '#FFF0F0' }]}>📍</Text><Text style={styles.shortcutLabel}>Lokasi darurat</Text></Pressable>
        <Pressable style={styles.shortcut} onPress={onFacilities}><Text style={[styles.shortcutIcon, { backgroundColor: '#EAF8F6' }]}>🏥</Text><Text style={styles.shortcutLabel}>Fasilitas medis</Text></Pressable>
        <Pressable style={styles.shortcut} onPress={() => Linking.openURL('tel:119').catch(() => Alert.alert('Hotline darurat', 'Hubungi 119 melalui aplikasi telepon.'))}><Text style={[styles.shortcutIcon, { backgroundColor: '#FFF6E7' }]}>☎</Text><Text style={styles.shortcutLabel}>Hotline 119</Text></Pressable>
      </View>

      <SectionTitle title="Aktivitas terakhir" action="Lihat semua" onAction={onHistory} />
      <DataFeedback loading={historyLoading} error={historyError} onRetry={onRefresh} />
      {!historyLoading && !historyError && history.length ? history.slice(0, 2).map((item) => <HistoryCard key={item.id} item={item} />) : null}
      {!historyLoading && !historyError && !history.length ? (
        <View style={styles.emptyCard}><Text style={styles.emptyIcon}>♡</Text><Text style={styles.emptyText}>Belum ada riwayat permintaan.</Text></View>
      ) : null}

      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>✦</Text>
        <View style={styles.tipContent}><Text style={styles.tipTitle}>Tips keselamatan</Text><Text style={styles.tipText}>Simpan alamat rumah dan kontak keluarga agar bantuan lebih cepat.</Text></View>
        <Text style={styles.tipArrow}>›</Text>
      </View>
    </ScrollView>
  );
}

function HistoryCard({ item }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyIcon}><Text style={styles.historyAmbulance}>🚑</Text></View>
      <View style={styles.historyInfo}>
        <View style={styles.historyTitleRow}><Text style={styles.historyId}>{item.id}</Text><Text style={[styles.statusPill, item.tone === 'red' && styles.statusRed]}>{item.status}</Text></View>
        <Text style={styles.historyPlace}>{item.place}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <Text style={styles.historyChevron}>›</Text>
    </View>
  );
}

function RequestScreen({ onBack, onSubmit, isSubmitting, submitError }) {
  const [patient, setPatient] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!patient.trim() || !condition.trim() || !location.trim()) {
      Alert.alert('Data belum lengkap', 'Isi nama pasien, kondisi darurat, dan lokasi penjemputan.');
      return;
    }
    onSubmit({ patient: patient.trim(), condition: condition.trim(), location: location.trim(), notes: notes.trim() });
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
          <View><Text style={styles.eyebrow}>LAYANAN DARURAT</Text><Text style={styles.pageTitle}>Panggil ambulans</Text></View>
        </View>
        <View style={styles.noticeCard}><Text style={styles.noticeIcon}>ⓘ</Text><Text style={styles.noticeText}>Jika kondisi mengancam nyawa, hubungi hotline 119 sambil menunggu bantuan.</Text></View>
        <Text style={styles.formSectionTitle}>Informasi pasien</Text>
        <Field label="Nama pasien" placeholder="Nama lengkap pasien" value={patient} onChangeText={setPatient} />
        <Field label="Kondisi darurat" placeholder="Contoh: sesak napas, kecelakaan" value={condition} onChangeText={setCondition} />
        <Text style={styles.formSectionTitle}>Lokasi penjemputan</Text>
        <Field label="Alamat lengkap" placeholder="Nama jalan, nomor, kelurahan" value={location} onChangeText={setLocation} />
        <Pressable style={styles.locationButton} onPress={() => Alert.alert('Lokasi perangkat', 'Pastikan izin lokasi aktif. Untuk saat ini, masukkan alamat penjemputan secara manual.') }>
          <Text style={styles.locationPin}>⌖</Text><Text style={styles.locationButtonText}>Gunakan lokasi saya</Text><Text style={styles.locationArrow}>›</Text>
        </Pressable>
        <Field label="Catatan untuk tim medis (opsional)" placeholder="Akses rumah, kondisi khusus, dll." value={notes} onChangeText={setNotes} multiline />
        <View style={styles.dispatchNote}><Text style={styles.dispatchIcon}>⚡</Text><Text style={styles.dispatchText}>Ambulans terdekat akan dihubungi setelah permintaan dikirim.</Text></View>
        <DataFeedback loading={isSubmitting} error={submitError} onRetry={submit} />
        <Button title={isSubmitting ? 'MENGIRIM PERMINTAAN…' : 'KIRIM PERMINTAAN DARURAT  →'} onPress={submit} disabled={isSubmitting} style={styles.submitButton} />
        <Text style={styles.disclaimer}>Dengan mengirim permintaan, Anda menyetujui penggunaan informasi ini untuk koordinasi layanan darurat.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#9AA5B5" style={[styles.input, inputProps.multiline && styles.multilineInput]} {...inputProps} />
    </View>
  );
}

function HistoryScreen({ history, loading, error, onRefresh }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>PERJALANAN ANDA</Text><Text style={styles.pageTitle}>Aktivitas</Text></View></View>
      <Text style={styles.pageDescription}>Pantau permintaan ambulans dan riwayat layanan Anda.</Text>
      <View style={styles.historyFilter}><Text style={styles.filterSelected}>Semua</Text><Text style={styles.filterText}>Berlangsung</Text><Text style={styles.filterText}>Selesai</Text></View>
      <DataFeedback loading={loading} error={error} onRetry={onRefresh} />
      {!loading && !error && history.length ? history.map((item) => <HistoryCard key={item.id} item={item} />) : null}
      {!loading && !error && !history.length ? <View style={styles.emptyLarge}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>Belum ada aktivitas</Text><Text style={styles.emptyText}>Riwayat permintaan ambulans Anda akan muncul di sini.</Text></View> : null}
    </ScrollView>
  );
}

function FacilityCard({ facility }) {
  return (
    <View style={styles.facilityCard}>
      <View style={styles.facilityIcon}><Text style={styles.facilityEmoji}>🏥</Text></View>
      <View style={styles.facilityInfo}>
        <View style={styles.facilityTitleRow}>
          <Text style={styles.facilityName}>{facility.name}</Text>
          {facility.isSample ? <Text style={styles.sampleBadge}>DEMO</Text> : null}
        </View>
        <Text style={styles.facilityAddress}>{facility.address}</Text>
        {facility.services.length ? <Text style={styles.facilityServices}>{facility.services.join(' · ')}</Text> : null}
        {facility.phone ? <Text style={styles.facilityPhone}>☎ {facility.phone}</Text> : null}
      </View>
    </View>
  );
}

function FacilitiesScreen({ onBack, facilities, loading, error, onRetry, onSearch }) {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  useEffect(() => {
    const refreshTimer = setInterval(() => onSearch(activeSearch), 5000);
    return () => clearInterval(refreshTimer);
  }, [activeSearch, onSearch]);

  const searchFacilities = () => {
    const query = search.trim();
    setActiveSearch(query);
    onSearch(query);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
        <View><Text style={styles.eyebrow}>DIREKTORI MEDRESPONS</Text><Text style={styles.pageTitle}>Fasilitas medis</Text></View>
      </View>
      <Text style={styles.pageDescription}>Daftar fasilitas dimuat dari API MedRespons. Hubungi fasilitas secara langsung untuk memverifikasi informasi.</Text>
      <View style={styles.facilitySearchRow}>
        <TextInput
          accessibilityLabel="Cari fasilitas medis"
          placeholder="Cari nama, lokasi, atau layanan"
          placeholderTextColor="#9AA5B5"
          style={styles.facilitySearchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={searchFacilities}
          returnKeyType="search"
        />
        <Pressable accessibilityRole="button" onPress={searchFacilities} style={styles.facilitySearchButton}><Text style={styles.facilitySearchButtonText}>Cari</Text></Pressable>
      </View>
      <DataFeedback loading={loading} error={error} onRetry={() => onRetry(search.trim())} />
      {!loading && !error && facilities.length ? facilities.map((facility) => <FacilityCard key={facility.id} facility={facility} />) : null}
      {!loading && !error && !facilities.length ? <View style={styles.emptyLarge}><Text style={styles.emptyIcon}>🏥</Text><Text style={styles.emptyTitle}>Fasilitas tidak ditemukan</Text><Text style={styles.emptyText}>Coba kata kunci atau pencarian lain.</Text></View> : null}
      <View style={styles.facilityNotice}><Text style={styles.facilityNoticeTitle}>Informasi penting</Text><Text style={styles.facilityNoticeText}>Data bertanda DEMO adalah data simulasi, bukan rekomendasi atau direktori rumah sakit resmi. Untuk keadaan darurat, hubungi 119.</Text></View>
    </ScrollView>
  );
}

const PLANS = [
  { name: 'Basic', price: 'Gratis', description: 'Untuk kebutuhan darurat sesekali', features: ['Permintaan ambulans 24 jam', 'Informasi status permintaan', 'Dukungan hotline'], featured: false },
  { name: 'Prioritas', price: 'Rp49.000', description: 'Per bulan · respons lebih prioritas', features: ['Semua manfaat Basic', 'Prioritas dispatch', 'Riwayat layanan lengkap'], featured: true },
  { name: 'Keluarga', price: 'Rp99.000', description: 'Per bulan · hingga 5 anggota', features: ['Semua manfaat Prioritas', 'Perlindungan keluarga', 'Bantuan koordinasi rumah sakit'], featured: false },
];

function PlansScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>TENANG SETIAP SAAT</Text><Text style={styles.pageTitle}>Paket keanggotaan</Text></View></View>
      <Text style={styles.pageDescription}>Pilih perlindungan yang sesuai untuk Anda dan orang tersayang.</Text>
      {PLANS.map((plan) => (
        <View key={plan.name} style={[styles.planCard, plan.featured && styles.planFeatured]}>
          {plan.featured ? <Text style={styles.popularBadge}>PALING POPULER</Text> : null}
          <Text style={[styles.planName, plan.featured && styles.whiteText]}>{plan.name}</Text>
          <Text style={[styles.planDescription, plan.featured && styles.planDescriptionFeatured]}>{plan.description}</Text>
          <Text style={[styles.planPrice, plan.featured && styles.whiteText]}>{plan.price}<Text style={[styles.planPeriod, plan.featured && styles.planDescriptionFeatured]}>{plan.price === 'Gratis' ? '' : ' / bulan'}</Text></Text>
          <View style={styles.planDivider} />
          {plan.features.map((feature) => <View key={feature} style={styles.planFeature}><Text style={[styles.checkIcon, plan.featured && styles.whiteText]}>✓</Text><Text style={[styles.featureText, plan.featured && styles.planDescriptionFeatured]}>{feature}</Text></View>)}
          <Button title={plan.featured ? 'PILIH PAKET' : 'PELAJARI PAKET'} secondary={!plan.featured} onPress={() => Alert.alert('Keanggotaan', 'Paket akan tersedia setelah akun Anda terhubung.')} style={styles.planButton} />
        </View>
      ))}
      <Text style={styles.disclaimer}>Biaya layanan ambulans dapat berlaku sesuai jarak dan kondisi layanan.</Text>
    </ScrollView>
  );
}

function ProfileScreen({ user, onLogout }) {
  const menu = [
    ['♙', 'Informasi pribadi'], ['⌖', 'Alamat tersimpan'], ['♧', 'Kontak darurat'], ['?', 'Pusat bantuan'], ['⚙', 'Pengaturan aplikasi'],
  ];
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>AKUN ANDA</Text><Text style={styles.pageTitle}>Profil</Text></View></View>
      <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.profileName}>{user.fullName}</Text><Text style={styles.profileEmail}>{user.email}</Text><Pressable onPress={() => Alert.alert('Profil', 'Akun MedRespons Anda sudah terhubung.')}><Text style={styles.editProfile}>Akun terverifikasi  ✓</Text></Pressable></View>
      <View style={styles.menuCard}>{menu.map(([icon, label]) => <Pressable key={label} style={styles.menuItem} onPress={() => Alert.alert(label, 'Fitur ini akan tersedia pada pembaruan berikutnya.')}><Text style={styles.menuIcon}>{icon}</Text><Text style={styles.menuLabel}>{label}</Text><Text style={styles.menuChevron}>›</Text></Pressable>)}</View>
      <Pressable style={styles.logoutButton} onPress={onLogout}><Text style={styles.logoutText}>Keluar dari akun</Text></Pressable>
      <Text style={styles.versionText}>MedRespons · Versi 1.0.0</Text>
    </ScrollView>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showRequest, setShowRequest] = useState(false);
  const [showFacilities, setShowFacilities] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authRegisterPrompt, setAuthRegisterPrompt] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const currentScreen = useMemo(() => {
    if (showRequest) return 'request';
    if (showFacilities) return 'facilities';
    return activeTab;
  }, [activeTab, showFacilities, showRequest]);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync('medrespons-auth-token'),
          SecureStore.getItemAsync('medrespons-auth-user'),
        ]);
        if (!token) return;

        setAuthToken(token);
        if (storedUser && mounted) setAuthUser(JSON.parse(storedUser));
        try {
          const currentUser = await getCurrentUser();
          if (!mounted) return;
          setAuthUser(currentUser);
          await SecureStore.setItemAsync('medrespons-auth-user', JSON.stringify(currentUser));
        } catch (error) {
          if (error.status === 401) {
            setAuthToken('');
            await SecureStore.deleteItemAsync('medrespons-auth-token');
            await SecureStore.deleteItemAsync('medrespons-auth-user');
            if (mounted) setAuthUser(null);
          } else if (!storedUser && mounted) {
            setAuthError(error.message || 'Tidak dapat memulihkan sesi akun.');
          }
        }
      } catch {
        if (mounted) setAuthError('Penyimpanan sesi tidak dapat dibuka. Silakan login kembali.');
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    restoreSession();
    return () => { mounted = false; };
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const requests = await getEmergencyRequests();
      setHistory(requests);
    } catch (error) {
      setHistory([]);
      setHistoryError(error.message || 'Gagal memuat data dari server.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadFacilities = useCallback(async (search = '') => {
    setFacilitiesLoading(true);
    setFacilitiesError('');
    try {
      setFacilities(await getHealthcareFacilities(search));
    } catch (error) {
      setFacilities([]);
      setFacilitiesError(error.message || 'Gagal memuat fasilitas medis dari API.');
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady && authUser) {
      loadHistory();
    } else if (authReady) {
      setHistory([]);
      setHistoryLoading(false);
    }
  }, [authReady, authUser, loadHistory]);

  useEffect(() => {
    if (!authReady || !authUser || !['home', 'history'].includes(currentScreen)) return undefined;
    const refreshTimer = setInterval(loadHistory, 5000);
    return () => clearInterval(refreshTimer);
  }, [authReady, authUser, currentScreen, loadHistory]);

  const submitAuth = async (credentials) => {
    setAuthLoading(true);
    setAuthError('');
    setAuthRegisterPrompt(false);
    try {
      const session = authMode === 'register'
        ? await registerAccount(credentials)
        : await loginAccount(credentials);
      setAuthToken(session.token);
      await SecureStore.setItemAsync('medrespons-auth-token', session.token);
      await SecureStore.setItemAsync('medrespons-auth-user', JSON.stringify(session.user));
      setAuthUser(session.user);
      setActiveTab('home');
    } catch (error) {
      try {
        await logoutAccount();
      } catch {
        // The server session will expire if local secure storage failed.
      }
      setAuthToken('');
      setAuthError(error.message || 'Autentikasi gagal. Silakan coba lagi.');
      setAuthRegisterPrompt(authMode === 'login' && error.status === 401);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await logoutAccount();
    } catch {
      // Hapus token lokal walau server sedang tidak dapat dijangkau.
    } finally {
      setAuthToken('');
      try {
        await Promise.all([
          SecureStore.deleteItemAsync('medrespons-auth-token'),
          SecureStore.deleteItemAsync('medrespons-auth-user'),
        ]);
      } catch {
        // Local UI still logs out if secure storage is unavailable.
      }
      setAuthUser(null);
      setHistory([]);
      setAuthMode('login');
      setActiveTab('home');
    }
  };

  const sendRequest = async (data) => {
    setIsSubmitting(true);
    setRequestError('');
    try {
      const item = await createEmergencyRequest(data);
      setHistory((items) => [item, ...items]);
      setHistoryError('');
      setShowRequest(false);
      setActiveTab('history');
      Alert.alert('Permintaan terkirim', 'Permintaan bantuan ambulans berhasil dikirim ke server MedRespons.');
    } catch (error) {
      setRequestError(error.message || 'Periksa koneksi dan konfigurasi server, lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScreen = () => {
    if (currentScreen === 'request') return <RequestScreen onBack={() => setShowRequest(false)} onSubmit={sendRequest} isSubmitting={isSubmitting} submitError={requestError} />;
    if (currentScreen === 'facilities') return <FacilitiesScreen onBack={() => setShowFacilities(false)} facilities={facilities} loading={facilitiesLoading} error={facilitiesError} onRetry={loadFacilities} onSearch={loadFacilities} />;
    if (currentScreen === 'history') return <HistoryScreen history={history} loading={historyLoading} error={historyError} onRefresh={loadHistory} />;
    if (currentScreen === 'plans') return <PlansScreen />;
    if (currentScreen === 'profile') return <ProfileScreen user={authUser} onLogout={signOut} />;
    return <HomeScreen userName={authUser.fullName} history={history} historyLoading={historyLoading} historyError={historyError} onRefresh={loadHistory} onRequest={() => setShowRequest(true)} onFacilities={() => { setShowFacilities(true); loadFacilities(''); }} onHistory={() => setActiveTab('history')} />;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.app}>
        {!authReady ? (
          <View style={styles.authLoading}><ActivityIndicator color={COLORS.teal} size="large" /><Text style={styles.authLoadingText}>Memeriksa sesi akun…</Text></View>
        ) : !authUser ? (
          <AuthScreen mode={authMode} onModeChange={(mode) => { setAuthError(''); setAuthRegisterPrompt(false); setAuthMode(mode); }} onSubmit={submitAuth} loading={authLoading} error={authError} showRegisterPrompt={authRegisterPrompt} />
        ) : (
          <>
            {renderScreen()}
            {!showRequest && !showFacilities ? (
              <View style={styles.tabBar}>
                {TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabItem}>
                      <Text style={[styles.tabIcon, selected && styles.tabIconSelected]}>{tab.icon}</Text>
                      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  app: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1 },
  authScreen: { flex: 1, backgroundColor: COLORS.background },
  authContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 30 },
  authBrandMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red, alignSelf: 'center', marginBottom: 10 },
  authBrandIcon: { color: COLORS.white, fontSize: 29, fontWeight: '900' },
  authBrand: { color: COLORS.ink, fontSize: 25, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  authTagline: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  authCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: COLORS.line },
  authTitle: { color: COLORS.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  authDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 6, marginBottom: 19 },
  authFieldGroup: { marginBottom: 13 },
  authFieldLabel: { color: '#506078', fontSize: 10, fontWeight: '800', marginBottom: 7 },
  authInput: { backgroundColor: '#FBFCFE', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: COLORS.ink, fontSize: 13, minHeight: 46 },
  passwordToggle: { alignSelf: 'flex-end', paddingVertical: 3, marginTop: -7, marginBottom: 9 },
  passwordToggleText: { color: COLORS.teal, fontSize: 10, fontWeight: '700' },
  authError: { color: '#B23844', backgroundColor: '#FFF0F0', borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, marginBottom: 10 },
  authSubmit: { minHeight: 50, marginTop: 3 },
  authSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 17 },
  authSwitchText: { color: COLORS.muted, fontSize: 11 },
  authSwitchLink: { color: COLORS.teal, fontSize: 11, fontWeight: '900' },
  authFootnote: { color: '#9AA5B5', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 17, paddingHorizontal: 12 },
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  authLoadingText: { color: COLORS.muted, fontSize: 12 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  greeting: { color: COLORS.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  notificationButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  notificationIcon: { color: COLORS.ink, fontSize: 22, transform: [{ rotate: '180deg' }] },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.red },
  emergencyCard: { padding: 20, borderRadius: 24, backgroundColor: COLORS.navy, overflow: 'hidden', marginBottom: 15 },
  emergencyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  livePill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#57D3A0' },
  liveText: { color: '#C8D5E7', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  ambulanceEmoji: { fontSize: 29 },
  emergencyTitle: { color: COLORS.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.7, lineHeight: 31, marginTop: 15 },
  emergencyDescription: { color: '#B7C2D3', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 17 },
  sosButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red, borderRadius: 14, minHeight: 53, gap: 9 },
  pressed: { opacity: 0.82 },
  sosIcon: { color: COLORS.white, fontSize: 22, fontWeight: '300' },
  sosText: { color: COLORS.white, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  sosArrow: { color: COLORS.white, fontSize: 19, marginLeft: 5 },
  emergencyFootnote: { color: '#A7B3C5', fontSize: 10, textAlign: 'center', marginTop: 12 },
  quickStats: { flexDirection: 'row', gap: 12, marginBottom: 23 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 17, padding: 14, minHeight: 97 },
  statIcon: { color: COLORS.teal, fontSize: 16, marginBottom: 8 },
  statValue: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 2 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  link: { color: COLORS.teal, fontSize: 11, fontWeight: '700' },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 23 },
  shortcut: { flex: 1, alignItems: 'center', gap: 8 },
  shortcutIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', textAlign: 'center', textAlignVertical: 'center', fontSize: 22 },
  shortcutLabel: { color: '#58677D', fontSize: 10, fontWeight: '600' },
  historyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  historyIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  historyAmbulance: { fontSize: 21 },
  historyInfo: { flex: 1 },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  historyId: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
  statusPill: { color: '#188365', backgroundColor: '#E8F7F1', borderRadius: 20, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, fontWeight: '800' },
  statusRed: { color: '#B23844', backgroundColor: '#FFF0F0' },
  historyPlace: { color: '#536178', fontSize: 10, marginBottom: 4 },
  historyDate: { color: '#9AA5B5', fontSize: 9 },
  historyChevron: { color: '#9AA5B5', fontSize: 24, paddingLeft: 5 },
  tipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF7F5', padding: 14, borderRadius: 16, marginTop: 6 },
  tipIcon: { color: COLORS.teal, fontSize: 19, marginRight: 11 },
  tipContent: { flex: 1 },
  tipTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  tipText: { color: '#68778B', fontSize: 10, lineHeight: 15 },
  tipArrow: { color: COLORS.teal, fontSize: 24, paddingLeft: 8 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, minHeight: 52 },
  pageTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  pageDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginBottom: 17 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.ink, fontSize: 31, lineHeight: 34, marginTop: -4 },
  noticeCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FFF2E6', padding: 13, borderRadius: 14, marginBottom: 20 },
  noticeIcon: { color: '#BE7423', fontSize: 18, fontWeight: '800' },
  noticeText: { color: '#80582D', fontSize: 10, flex: 1, lineHeight: 15 },
  formSectionTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800', marginTop: 5, marginBottom: 11 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { color: '#506078', fontSize: 10, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: COLORS.ink, fontSize: 12, minHeight: 45 },
  multilineInput: { minHeight: 82, textAlignVertical: 'top' },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#EAF7F5', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, marginTop: -4, marginBottom: 17 },
  locationPin: { color: COLORS.teal, fontSize: 19 },
  locationButtonText: { flex: 1, color: COLORS.teal, fontWeight: '800', fontSize: 11 },
  locationArrow: { color: COLORS.teal, fontSize: 20 },
  dispatchNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 12, borderRadius: 12, gap: 8, marginBottom: 16 },
  dispatchIcon: { fontSize: 17 },
  dispatchText: { color: '#67758A', fontSize: 10, flex: 1, lineHeight: 15 },
  button: { backgroundColor: COLORS.red, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: COLORS.white, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  buttonSecondary: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  buttonSecondaryText: { color: COLORS.ink },
  submitButton: { marginBottom: 12 },
  disclaimer: { color: '#9AA5B5', fontSize: 9, textAlign: 'center', lineHeight: 14, marginBottom: 12 },
  historyFilter: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  facilitySearchRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  facilitySearchInput: { flex: 1, minHeight: 46, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 12, color: COLORS.ink, fontSize: 11 },
  facilitySearchButton: { minWidth: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.teal, borderRadius: 12, paddingHorizontal: 12 },
  facilitySearchButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  facilityCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  facilityIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF8F6', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  facilityEmoji: { fontSize: 22 },
  facilityInfo: { flex: 1 },
  facilityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  facilityName: { flex: 1, color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  sampleBadge: { overflow: 'hidden', color: '#946315', backgroundColor: '#FFF4CE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: '900' },
  facilityAddress: { color: '#58677D', fontSize: 10, lineHeight: 15 },
  facilityServices: { color: COLORS.teal, fontSize: 9, fontWeight: '700', marginTop: 6 },
  facilityPhone: { color: COLORS.ink, fontSize: 10, fontWeight: '700', marginTop: 6 },
  facilityNotice: { backgroundColor: '#FFF6E7', borderRadius: 14, padding: 13, marginTop: 8 },
  facilityNoticeTitle: { color: '#80582D', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  facilityNoticeText: { color: '#80582D', fontSize: 9, lineHeight: 14 },
  filterSelected: { color: COLORS.white, backgroundColor: COLORS.navy, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 15, paddingVertical: 8, fontSize: 10, fontWeight: '800' },
  filterText: { color: '#68778B', backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 15, paddingVertical: 8, fontSize: 10, fontWeight: '700' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 22, marginBottom: 12 },
  emptyLarge: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 55 },
  emptyIcon: { color: '#A2B2C4', fontSize: 31, marginBottom: 8 },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: COLORS.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  dataFeedback: { alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 15, padding: 16, marginBottom: 12 },
  dataError: { alignItems: 'center', backgroundColor: '#FFF0F0', borderRadius: 15, padding: 16, marginBottom: 12, gap: 8 },
  dataErrorText: { color: '#9E3340', fontSize: 11, textAlign: 'center', lineHeight: 17 },
  dataRetry: { color: COLORS.teal, fontSize: 11, fontWeight: '800' },
  planCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 18, marginBottom: 13, borderWidth: 1, borderColor: COLORS.line },
  planFeatured: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  popularBadge: { color: '#FFCE9B', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 9 },
  planName: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  whiteText: { color: COLORS.white },
  planDescription: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
  planDescriptionFeatured: { color: '#B9C5D5' },
  planPrice: { color: COLORS.ink, fontSize: 22, fontWeight: '900', marginTop: 16 },
  planPeriod: { color: COLORS.muted, fontSize: 10, fontWeight: '500' },
  planDivider: { height: 1, backgroundColor: '#E7ECF2', opacity: 0.6, marginVertical: 14 },
  planFeature: { flexDirection: 'row', gap: 9, marginBottom: 10, alignItems: 'center' },
  checkIcon: { color: COLORS.teal, fontSize: 13, fontWeight: '900' },
  featureText: { color: '#59677C', fontSize: 10 },
  planButton: { marginTop: 8 },
  profileCard: { alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 20, padding: 22, marginBottom: 14 },
  avatar: { width: 66, height: 66, borderRadius: 23, backgroundColor: '#FDECEE', alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  avatarText: { color: COLORS.red, fontSize: 27, fontWeight: '900' },
  profileName: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  profileEmail: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  editProfile: { color: COLORS.teal, fontSize: 10, fontWeight: '800', marginTop: 12 },
  menuCard: { backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 14, marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', minHeight: 49, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' },
  menuIcon: { color: COLORS.teal, fontSize: 17, width: 32 },
  menuLabel: { color: '#41516A', flex: 1, fontSize: 11, fontWeight: '600' },
  menuChevron: { color: '#9AA5B5', fontSize: 20 },
  logoutButton: { alignItems: 'center', padding: 14 },
  logoutText: { color: COLORS.red, fontSize: 11, fontWeight: '800' },
  versionText: { color: '#A4AFBD', textAlign: 'center', fontSize: 9, marginBottom: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, minHeight: 66, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 5, borderTopWidth: 1, borderTopColor: '#EDF0F5' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIcon: { color: '#A2ADBC', fontSize: 22, fontWeight: '700', lineHeight: 25 },
  tabIconSelected: { color: COLORS.red },
  tabLabel: { color: '#96A1B1', fontSize: 9, fontWeight: '600' },
  tabLabelSelected: { color: COLORS.red, fontWeight: '800' },
});
