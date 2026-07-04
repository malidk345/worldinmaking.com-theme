import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

export type TranslationKey =
  // TaskBarMenu
  | 'menu.home'
  | 'menu.profile'
  | 'menu.community'
  | 'menu.forums'
  | 'menu.ideas'
  | 'menu.marginalia'
  | 'menu.dossiers'
  | 'menu.stations'
  | 'menu.transmissions'
  | 'menu.system_settings'
  | 'menu.force_restart'
  | 'menu.admin_dashboard'
  | 'menu.sign_out'
  | 'menu.sign_in'
  | 'wm.no_windows'
  | 'wm.open_app'
  | 'wm.title'
  | 'wm.managing'
  | 'wm.open_window'
  | 'wm.open_windows'
  | 'search.tooltip'
  // Profile
  | 'profile.edit'
  | 'profile.save'
  | 'profile.cancel'
  | 'profile.language'
  // Posts
  | 'posts.title'
  | 'posts.empty'
  | 'posts.search'
  | 'posts.author'
  // System Settings
  | 'sys.title'
  | 'sys.appearance'
  | 'sys.light'
  | 'sys.dark'
  | 'sys.dynamic'
  | 'sys.sync';

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    'menu.home': 'Home',
    'menu.profile': 'Profile',
    'menu.community': 'Community',
    'menu.forums': 'Forums',
    'menu.ideas': 'Ideas',
    'menu.marginalia': 'Marginalia Archive',
    'menu.dossiers': 'Curated Dossiers',
    'menu.stations': 'Atmospheric Stations',
    'menu.transmissions': 'Ephemeral Transmissions',
    'menu.system_settings': 'System Settings',
    'menu.force_restart': 'Force restart',
    'menu.admin_dashboard': 'Admin Dashboard',
    'menu.sign_out': 'Sign out',
    'menu.sign_in': 'Sign in',
    'wm.no_windows': 'No active windows',
    'wm.open_app': 'Open an app to see it here.',
    'wm.title': 'window manager',
    'wm.managing': 'Managing',
    'wm.open_window': 'open window.',
    'wm.open_windows': 'open windows.',
    'search.tooltip': 'search',
    'profile.edit': 'edit profile',
    'profile.save': 'save changes',
    'profile.cancel': 'cancel',
    'profile.language': 'language',
    'posts.title': 'Posts',
    'posts.empty': 'No posts found in the selected language.',
    'posts.search': 'search posts...',
    'posts.author': 'author',
    'sys.title': 'system settings',
    'sys.appearance': 'appearance mode',
    'sys.light': 'light mode',
    'sys.dark': 'dark mode',
    'sys.dynamic': 'dynamic accent color',
    'sys.sync': 'sync with system theme protocols'
  },
  tr: {
    'menu.home': 'Ana Sayfa',
    'menu.profile': 'Profil',
    'menu.community': 'Topluluk',
    'menu.forums': 'Forumlar',
    'menu.ideas': 'Fikirler',
    'menu.marginalia': 'Marginalia Arşivi',
    'menu.dossiers': 'Özel Dosyalar',
    'menu.stations': 'Atmosferik İstasyonlar',
    'menu.transmissions': 'Geçici Aktarımlar',
    'menu.system_settings': 'Sistem Ayarları',
    'menu.force_restart': 'Yeniden başlat',
    'menu.admin_dashboard': 'Yönetici Paneli',
    'menu.sign_out': 'Çıkış yap',
    'menu.sign_in': 'Giriş yap',
    'wm.no_windows': 'Aktif pencere yok',
    'wm.open_app': 'Görmek için bir uygulama açın.',
    'wm.title': 'pencere yöneticisi',
    'wm.managing': 'Yönetiliyor:',
    'wm.open_window': 'açık pencere.',
    'wm.open_windows': 'açık pencere.',
    'search.tooltip': 'ara',
    'profile.edit': 'profili düzenle',
    'profile.save': 'değişiklikleri kaydet',
    'profile.cancel': 'iptal',
    'profile.language': 'dil',
    'posts.title': 'Gönderiler',
    'posts.empty': 'Seçilen dilde gönderi bulunamadı.',
    'posts.search': 'gönderilerde ara...',
    'posts.author': 'yazar',
    'sys.title': 'sistem ayarları',
    'sys.appearance': 'görünüm modu',
    'sys.light': 'aydınlık mod',
    'sys.dark': 'karanlık mod',
    'sys.dynamic': 'dinamik vurgu rengi',
    'sys.sync': 'sistem tema protokolleriyle eşitle'
  }
};

export function useTranslation() {
  const { profile } = useAuth();
  const lang = profile?.preferred_language === 'tr' ? 'tr' : 'en';

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] || translations['en'][key] || key;
  }, [lang]);

  return { t, lang };
}
