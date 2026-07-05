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
  | 'search.type_to_search'
  | 'menu.signed_in_as'
  | 'menu.about_title'
  | 'menu.about_h1'
  | 'menu.about_p1'
  | 'menu.about_p2'
  | 'menu.about_p3'
  | 'menu.about_p4'
  | 'menu.about_p5'
  | 'menu.about_p6'
  | 'menu.about_p7'
  | 'menu.about_p8'
  | 'menu.about_p9'
  | 'menu.about_author'
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
  | 'loading.posts'
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
    'search.type_to_search': 'type at least 2 characters to search...',
    'menu.signed_in_as': 'signed in as',
    'menu.about_title': 'About WorldInMaking',
    'menu.about_h1': 'i am mustafa ali.',
    'menu.about_p1': 'worldinmaking (wim) began from a simple but unsettling intuition: the world is not something we merely inhabit — it is something continuously being formed.',
    'menu.about_p2': 'what appears stable is often the result of repetition. what feels natural is usually constructed. institutions harden over time and begin to look inevitable. moral language disguises power. economic systems present themselves as neutral mechanisms. even desire carries the marks of history.',
    'menu.about_p3': 'this project exists in that unstable space where certainty starts to fracture.',
    'menu.about_p4': 'worldinmaking (wim) is an independent writing and research platform where ideas are not treated as finished monuments but as living structures — open to interrogation, reinterpretation, and reconstruction. rather than offering definitive answers, it lingers with tension. it questions what presents itself as obvious. it returns to inherited concepts not to preserve them, but to test their foundations.',
    'menu.about_p5': 'the sacred, the ethical, the political, the psychological — none are approached as fixed domains. they intersect. they shape one another. they produce the world we move through every day without noticing its architecture.',
    'menu.about_p6': 'to think is not a passive act. thought participates in construction.',
    'menu.about_p7': 'to question is already to intervene.',
    'menu.about_p8': 'worldinmaking (wim) is an ongoing attempt to remain intellectually restless — to resist comfort, to slow down judgment, and to take ideas seriously in a time that prefers immediacy.',
    'menu.about_p9': 'if the world is still in formation, then responsibility begins with attention.',
    'menu.about_author': '— mustafa ali',
    'profile.edit': 'edit profile',
    'profile.save': 'save changes',
    'profile.cancel': 'cancel',
    'profile.language': 'language',
    'posts.title': 'Posts',
    'posts.empty': 'No posts found in the selected language.',
    'posts.search': 'search posts...',
    'posts.author': 'author',
    'loading.posts': 'loading posts...',
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
    'search.type_to_search': 'aramak için en az 2 karakter yazın...',
    'menu.signed_in_as': 'oturum açıldı:',
    'menu.about_title': 'WorldInMaking Hakkında',
    'menu.about_h1': 'ben mustafa ali.',
    'menu.about_p1': 'worldinmaking (wim) basit ama rahatsız edici bir sezgiden doğdu: dünya yalnızca içinde yaşadığımız bir şey değil — sürekli olarak şekillenmekte olan bir şeydir.',
    'menu.about_p2': 'istikrarlı görünen şey genellikle tekrarın sonucudur. doğal hissettiren şey genellikle inşa edilmiştir. kurumlar zamanla sertleşir ve kaçınılmaz görünmeye başlar. ahlaki dil iktidarı gizler. ekonomik sistemler kendilerini tarafsız mekanizmalar olarak sunarlar. arzu bile tarihin izlerini taşır.',
    'menu.about_p3': 'bu proje, kesinliğin çatlamaya başladığı o istikrarsız alanda var olmaktadır.',
    'menu.about_p4': 'worldinmaking (wim), fikirlerin tamamlanmış anıtlar olarak değil, yaşayan yapılar olarak ele alındığı bağımsız bir yazma ve araştırma platformudur — sorgulamaya, yeniden yorumlamaya ve yeniden inşaya açıktır. kesin yanıtlar sunmak yerine gerilimle oyalanır. bariz olarak sunulan şeyi sorgular. miras alınan kavramlara onları korumak için değil, temellerini test etmek için geri döner.',
    'menu.about_p5': 'kutsal, etik, politik, psikolojik — hiçbiri sabit alanlar olarak ele alınmaz. kesişirler. birbirlerini şekillendirirler. mimarisini fark etmeden her gün içinde hareket ettiğimiz dünyayı üretirler.',
    'menu.about_p6': 'düşünmek pasif bir eylem değildir. düşünce inşaya katılır.',
    'menu.about_p7': 'sorgulamak zaten müdahale etmektir.',
    'menu.about_p8': 'worldinmaking (wim), entelektüel olarak huzursuz kalmaya yönelik devam eden bir girişimdir — rahatlığa direnmek, yargıyı yavaşlatmak ve dolaysızlığı tercih eden bir zamanda fikirleri ciddiye almak.',
    'menu.about_p9': 'dünya hala oluşum halindeyse, o zaman sorumluluk dikkatle başlar.',
    'menu.about_author': '— mustafa ali',
    'profile.edit': 'profili düzenle',
    'profile.save': 'değişiklikleri kaydet',
    'profile.cancel': 'iptal',
    'profile.language': 'dil',
    'posts.title': 'Gönderiler',
    'posts.empty': 'Seçilen dilde gönderi bulunamadı.',
    'posts.search': 'gönderilerde ara...',
    'posts.author': 'yazar',
    'loading.posts': 'gönderiler yükleniyor...',
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
