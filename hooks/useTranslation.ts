import { useAuth } from '../context/AuthContext';
import { useCallback, useEffect, useState } from 'react';

export type TranslationKey =
  | 'menu.create_post'
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
  | 'sys.sync'
  // Contact
  | 'contact.title'
  | 'contact.fill_fields'
  | 'contact.success'
  | 'contact.failed'
  | 'contact.sent_title'
  | 'contact.sent_desc'
  | 'contact.send_another'
  | 'contact.desc'
  | 'contact.name_label'
  | 'contact.name_placeholder'
  | 'contact.email_label'
  | 'contact.email_placeholder'
  | 'contact.msg_label'
  | 'contact.msg_placeholder'
  | 'contact.sending_btn'
  | 'contact.send_btn'
  // Login
  | 'login.initializing'
  | 'login.sys_status'
  | 'login.authenticated'
  | 'login.open_dashboard'
  | 'login.awaiting_action'
  | 'login.check_inbox'
  | 'login.magic_sent_to'
  | 'login.click_to_signin'
  | 'login.diff_email'
  | 'login.auth_request'
  | 'login.member_login'
  | 'login.auth_desc'
  | 'login.placeholder'
  | 'login.sending_link'
  | 'login.send_link'
  | 'login.secure_system'
  | 'login.failed'
  | 'login.magic_sent_success'
  | 'login.signout_success'
  // Comments
  | 'comments.title'
  | 'comments.syncing'
  | 'comments.empty'
  | 'comments.add_placeholder'
  | 'comments.subject_placeholder'
  | 'comments.post_btn'
  | 'comments.cancel_btn'
  | 'comments.guidelines'
  // Votes & Sharing
  | 'votes.login_required'
  | 'votes.limit_reached'
  | 'votes.failed'
  | 'share.copied'
  | 'share.failed'
  | 'share.title'
  // Archive
  | 'archive.title'
  | 'archive.breadcrumb'
  | 'archive.applications'
  | 'archive.saved_posts'
  | 'archive.items'
  | 'archive.apps'
  | 'archive.posts'
  | 'archive.locked'
  | 'archive.empty_apps'
  | 'archive.empty_apps_sub'
  | 'archive.open_app'
  | 'archive.restore_desktop'
  | 'archive.auth_required'
  | 'archive.auth_required_sub'
  | 'archive.sign_in'
  | 'archive.loading_saved'
  | 'archive.no_saved'
  | 'archive.no_saved_sub'
  | 'archive.saved_date'
  | 'archive.read_post'
  | 'archive.remove_bookmark'
  // Profile Nodes/Posts UI
  | 'profile.no_bio'
  | 'profile.loading_nodes'
  | 'profile.edit_node'
  | 'profile.delete_node'
  | 'profile.draft'
  | 'profile.pub'
  | 'profile.click_to_edit'
  | 'profile.published_node'
  | 'profile.no_nodes'
  | 'profile.edit_post'
  | 'profile.delete_post'
  | 'profile.read_more'
  | 'profile.pending'
  | 'profile.post'
  | 'profile.open_post'
  | 'profile.no_posts'
  | 'profile.open_saved'
  | 'profile.no_saved'
  | 'profile.saved_badge'
  | 'profile.copied_success'
  | 'profile.copied_failed'
  | 'profile.create_node_failed'
  | 'profile.delete_node_failed'
  | 'profile.delete_node_success'
  | 'profile.delete_post_failed'
  | 'profile.delete_post_success'
  | 'profile.update_success'
  | 'profile.update_failed'
  // Search
  | 'search.placeholder'
  | 'search.no_results'
  | 'search.results_count'
  // Reader
  | 'reader.suggested'
  | 'reader.content_toc'
  | 'reader.login_to_save'
  | 'reader.unsave_failed'
  | 'reader.unsave_success'
  | 'reader.save_failed'
  | 'reader.save_success'
  // Menu Extra
  | 'menu.all_posts'
  | 'menu.blueprints'
  | 'menu.newspaper'
  | 'menu.member_access'
  // AppWindow / WindowRouter
  | 'appwindow.no_node_id'
  | 'appwindow.login_required_save'
  | 'appwindow.save_failed'
  | 'appwindow.publish_success'
  | 'appwindow.draft_success'
  | 'appwindow.link_copied'
  | 'appwindow.link_copy_failed'
  | 'appwindow.login_required_posts'
  | 'appwindow.post_save_failed'
  | 'appwindow.post_create_failed'
  | 'appwindow.post_published'
  | 'appwindow.saving'
  | 'appwindow.update'
  | 'appwindow.publish'
  | 'appwindow.save_draft'
  | 'appwindow.cover'
  | 'appwindow.node_theme'
  | 'appwindow.publishing'
  // 404 Page
  | 'notfound.title'
  | 'notfound.desc'
  | 'notfound.lost'
  | 'notfound.lost_desc'
  | 'notfound.return_btn'
  // Widget
  | 'widget.refresh'
  | 'widget.prev_page'
  | 'widget.next_page'
  | 'widget.open_post';

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
    'sys.sync': 'sync with system theme protocols',
    // Contact
    'contact.title': 'contact',
    'contact.fill_fields': 'please fill in all fields',
    'contact.success': 'message transmitted successfully',
    'contact.failed': 'failed to send message',
    'contact.sent_title': 'transmission complete',
    'contact.sent_desc': 'your message has been archived in the system. we will respond if action is required.',
    'contact.send_another': 'send another',
    'contact.desc': 'direct line for inquiries, collaborations, or system reports.',
    'contact.name_label': 'name',
    'contact.name_placeholder': 'your identity...',
    'contact.email_label': 'return email',
    'contact.email_placeholder': 'address@domain.com...',
    'contact.msg_label': 'message body',
    'contact.msg_placeholder': 'type your transmission here...',
    'contact.sending_btn': 'sending...',
    'contact.send_btn': 'send message',
    // Login
    'login.initializing': 'initializing subsystem...',
    'login.sys_status': 'system status',
    'login.authenticated': 'authenticated',
    'login.open_dashboard': 'open dashboard',
    'login.awaiting_action': 'awaiting action',
    'login.check_inbox': 'check your inbox',
    'login.magic_sent_to': 'we sent a magic link to',
    'login.click_to_signin': 'click it to sign in.',
    'login.diff_email': 'enter different email',
    'login.auth_request': 'authentication request',
    'login.member_login': 'member login',
    'login.auth_desc': 'auth link will be sent to your email address. no password required.',
    'login.placeholder': 'name@domain.com',
    'login.sending_link': 'sending link...',
    'login.send_link': 'send magic link',
    'login.secure_system': 'secure access system',
    'login.failed': 'login failed',
    'login.magic_sent_success': 'magic link sent. check your inbox.',
    'login.signout_success': 'signed out successfully',
    // Comments
    'comments.title': 'comments',
    'comments.syncing': 'syncing discussion',
    'comments.empty': 'no comments yet. be the first to comment!',
    'comments.add_placeholder': 'add a comment...',
    'comments.subject_placeholder': 'subject (optional)',
    'comments.post_btn': 'post',
    'comments.cancel_btn': 'cancel',
    'comments.guidelines': 'guidelines: please keep the discussion civil and constructive.',
    // Votes & Sharing
    'votes.login_required': 'please log in to vote',
    'votes.limit_reached': 'you have reached the limit',
    'votes.failed': 'failed to save vote',
    'share.copied': 'link copied to clipboard!',
    'share.failed': 'failed to copy link',
    'share.title': 'share link',
    // Archive
    'archive.title': 'archive explorer',
    'archive.breadcrumb': 'archive',
    'archive.applications': 'applications',
    'archive.saved_posts': 'saved posts',
    'archive.items': 'items',
    'archive.apps': 'apps',
    'archive.posts': 'posts',
    'archive.locked': 'locked',
    'archive.empty_apps': 'applications folder is empty.',
    'archive.empty_apps_sub': 'drag and drop desktop icons to archive them.',
    'archive.open_app': 'open app',
    'archive.restore_desktop': 'restore to desktop',
    'archive.auth_required': 'authentication required',
    'archive.auth_required_sub': 'you must be logged in to view your bookmarked articles.',
    'archive.sign_in': 'sign in',
    'archive.loading_saved': 'loading saved posts...',
    'archive.no_saved': 'no saved posts found.',
    'archive.no_saved_sub': 'posts saved from the reader view will appear here.',
    'archive.saved_date': 'saved',
    'archive.read_post': 'read post',
    'archive.remove_bookmark': 'remove bookmark',
    // Profile Nodes/Posts UI
    'profile.no_bio': 'no bio yet',
    'profile.loading_nodes': 'loading nodes...',
    'profile.edit_node': 'edit node',
    'profile.delete_node': 'delete node',
    'profile.draft': 'draft',
    'profile.pub': 'pub',
    'profile.click_to_edit': 'click to edit',
    'profile.published_node': 'published node',
    'profile.no_nodes': 'no nodes yet',
    'profile.edit_post': 'edit post',
    'profile.delete_post': 'delete post',
    'profile.read_more': 'open the full post to read more',
    'profile.pending': 'pending',
    'profile.post': 'post',
    'profile.open_post': 'open post',
    'profile.no_posts': 'no posts yet',
    'profile.open_saved': 'open saved post',
    'profile.no_saved': 'no saved posts yet',
    'profile.saved_badge': 'saved',
    'profile.copied_success': 'link copied',
    'profile.copied_failed': 'failed to copy link',
    'profile.create_node_failed': 'failed to create node',
    'profile.delete_node_failed': 'failed to delete node',
    'profile.delete_node_success': 'node deleted',
    'profile.delete_post_failed': 'failed to delete post',
    'profile.delete_post_success': 'post deleted',
    'profile.update_success': 'profile updated successfully',
    'profile.update_failed': 'failed to update profile',
    // Search
    'search.placeholder': 'search blog posts...',
    'search.no_results': 'no results found for',
    'search.results_count': 'results',
    // Reader
    'reader.suggested': 'suggested posts',
    'reader.content_toc': 'Content',
    'reader.login_to_save': 'please log in to save posts',
    'reader.unsave_failed': 'failed to remove bookmark',
    'reader.unsave_success': 'removed from saved posts',
    'reader.save_failed': 'failed to save post',
    'reader.save_success': 'post saved to your profile',
    // Menu Extra
    'menu.create_post': 'editor',
    'menu.all_posts': 'all posts',
    'menu.blueprints': 'blueprints',
    'menu.newspaper': 'newspaper',
    'menu.member_access': 'member access',
    // AppWindow / WindowRouter
    'appwindow.no_node_id': 'no node id — open from my profile to edit',
    'appwindow.login_required_save': 'you must be logged in to save',
    'appwindow.save_failed': 'failed to save',
    'appwindow.publish_success': 'node published!',
    'appwindow.draft_success': 'draft saved',
    'appwindow.link_copied': 'node link copied',
    'appwindow.link_copy_failed': 'failed to copy node link',
    'appwindow.login_required_posts': 'you must be logged in to save posts',
    'appwindow.post_save_failed': 'failed to save post',
    'appwindow.post_create_failed': 'failed to create post',
    'appwindow.post_published': 'post published!',
    'appwindow.saving': 'saving...',
    'appwindow.update': 'update',
    'appwindow.publish': 'publish',
    'appwindow.save_draft': 'save draft',
    'appwindow.cover': 'cover',
    'appwindow.node_theme': 'node theme',
    'appwindow.publishing': 'publishing...',
    // 404 Page
    'notfound.title': '404 - Page Not Found',
    'notfound.desc': 'The page you are looking for does not exist on World in Making.',
    'notfound.lost': 'lost in space',
    'notfound.lost_desc': 'the transmission you are looking for could not be found or has been moved to a different coordinate.',
    'notfound.return_btn': 'return to orbit',
    // Widget
    'widget.refresh': 'refresh trending',
    'widget.prev_page': 'previous page',
    'widget.next_page': 'next page',
    'widget.open_post': 'open post'
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
    'sys.sync': 'sistem tema protokolleriyle eşitle',
    // Contact
    'contact.title': 'iletişim',
    'contact.fill_fields': 'lütfen tüm alanları doldurun',
    'contact.success': 'mesaj başarıyla iletildi',
    'contact.failed': 'mesaj gönderilemedi',
    'contact.sent_title': 'iletim tamamlandı',
    'contact.sent_desc': 'mesajınız sisteme arşivlendi. gerekirse dönüş yapacağız.',
    'contact.send_another': 'yeni mesaj gönder',
    'contact.desc': 'sorular, iş birlikleri veya sistem raporları için doğrudan iletişim hattı.',
    'contact.name_label': 'isim',
    'contact.name_placeholder': 'kimliğiniz...',
    'contact.email_label': 'yanıt e-postası',
    'contact.email_placeholder': 'adres@alanadi.com...',
    'contact.msg_label': 'mesaj içeriği',
    'contact.msg_placeholder': 'mesajınızı buraya yazın...',
    'contact.sending_btn': 'gönderiliyor...',
    'contact.send_btn': 'mesajı gönder',
    // Login
    'login.initializing': 'alt sistem başlatılıyor...',
    'login.sys_status': 'sistem durumu',
    'login.authenticated': 'kimlik doğrulandı',
    'login.open_dashboard': 'paneli aç',
    'login.awaiting_action': 'eylem bekleniyor',
    'login.check_inbox': 'gelen kutunuzu kontrol edin',
    'login.magic_sent_to': 'giriş bağlantısını şuraya gönderdik:',
    'login.click_to_signin': 'giriş yapmak için bağlantıya tıklayın.',
    'login.diff_email': 'farklı bir e-posta girin',
    'login.auth_request': 'kimlik doğrulama isteği',
    'login.member_login': 'üye girişi',
    'login.auth_desc': 'giriş bağlantısı e-posta adresinize gönderilecektir. şifre gerekmez.',
    'login.placeholder': 'isim@alanadi.com',
    'login.sending_link': 'bağlantı gönderiliyor...',
    'login.send_link': 'bağlantı gönder',
    'login.secure_system': 'güvenli erişim sistemi',
    'login.failed': 'giriş başarısız',
    'login.magic_sent_success': 'bağlantı gönderildi. gelen kutunuzu kontrol edin.',
    'login.signout_success': 'başarıyla çıkış yapıldı',
    // Comments
    'comments.title': 'yorumlar',
    'comments.syncing': 'tartışma senkronize ediliyor',
    'comments.empty': 'henüz yorum yok. ilk yorumu siz yapın!',
    'comments.add_placeholder': 'bir yorum ekle...',
    'comments.subject_placeholder': 'konu (isteğe bağlı)',
    'comments.post_btn': 'paylaş',
    'comments.cancel_btn': 'iptal',
    'comments.guidelines': 'kurallar: lütfen tartışmayı saygılı ve yapıcı tutun.',
    // Votes & Sharing
    'votes.login_required': 'oy vermek için lütfen giriş yapın',
    'votes.limit_reached': 'sınıra ulaştınız',
    'votes.failed': 'oy kaydedilemedi',
    'share.copied': 'bağlantı panoya kopyalandı!',
    'share.failed': 'bağlantı kopyalanamadı',
    'share.title': 'bağlantıyı paylaş',
    // Archive
    'archive.title': 'arşiv gezgini',
    'archive.breadcrumb': 'arşiv',
    'archive.applications': 'uygulamalar',
    'archive.saved_posts': 'kaydedilen yazılar',
    'archive.items': 'öğe',
    'archive.apps': 'uygulama',
    'archive.posts': 'yazı',
    'archive.locked': 'kilitli',
    'archive.empty_apps': 'uygulamalar klasörü boş.',
    'archive.empty_apps_sub': 'arşivlemek için masaüstü simgelerini sürükleyip bırakın.',
    'archive.open_app': 'uygulamayı aç',
    'archive.restore_desktop': 'masaüstüne geri yükle',
    'archive.auth_required': 'kimlik doğrulama gerekli',
    'archive.auth_required_sub': 'yer işareti eklediğiniz makaleleri görüntülemek için giriş yapmalısınız.',
    'archive.sign_in': 'giriş yap',
    'archive.loading_saved': 'kaydedilen yazılar yükleniyor...',
    'archive.no_saved': 'kaydedilmiş yazı bulunamadı.',
    'archive.no_saved_sub': 'okuyucu görünümünden kaydedilen yazılar burada görünecektir.',
    'archive.saved_date': 'kaydedildi',
    'archive.read_post': 'yazıyı oku',
    'archive.remove_bookmark': 'yer işaretini kaldır',
    // Profile Nodes/Posts UI
    'profile.no_bio': 'henüz biyografi yok',
    'profile.loading_nodes': 'düğümler yükleniyor...',
    'profile.edit_node': 'düğümü düzenle',
    'profile.delete_node': 'düğümü sil',
    'profile.draft': 'taslak',
    'profile.pub': 'yay',
    'profile.click_to_edit': 'düzenlemek için tıkla',
    'profile.published_node': 'yayınlanmış düğüm',
    'profile.no_nodes': 'henüz düğüm yok',
    'profile.edit_post': 'gönderiyi düzenle',
    'profile.delete_post': 'gönderiyi sil',
    'profile.read_more': 'daha fazlasını okumak için tam gönderiyi açın',
    'profile.pending': 'onay bekliyor',
    'profile.post': 'gönderi',
    'profile.open_post': 'gönderiyi aç',
    'profile.no_posts': 'henüz gönderi yok',
    'profile.open_saved': 'kaydedilen gönderiyi aç',
    'profile.no_saved': 'henüz kaydedilmiş gönderi yok',
    'profile.saved_badge': 'kaydedildi',
    'profile.copied_success': 'bağlantı kopyalandı',
    'profile.copied_failed': 'bağlantı kopyalanamadı',
    'profile.create_node_failed': 'düğüm oluşturulamadı',
    'profile.delete_node_failed': 'düğüm silinemedi',
    'profile.delete_node_success': 'düğüm silindi',
    'profile.delete_post_failed': 'gönderi silinemedi',
    'profile.delete_post_success': 'gönderi silindi',
    'profile.update_success': 'profil başarıyla güncellendi',
    'profile.update_failed': 'profil güncellenemedi',
    // Search
    'search.placeholder': 'blog gönderilerinde ara...',
    'search.no_results': 'sonuç bulunamadı:',
    'search.results_count': 'sonuç',
    // Reader
    'reader.suggested': 'önerilen yazılar',
    'reader.content_toc': 'İçindekiler',
    'reader.login_to_save': 'gönderileri kaydetmek için lütfen giriş yapın',
    'reader.unsave_failed': 'yer işareti kaldırılamadı',
    'reader.unsave_success': 'kaydedilen yazılardan kaldırıldı',
    'reader.save_failed': 'gönderi kaydedilemedi',
    'reader.save_success': 'gönderi profilinize kaydedildi',
    // Menu Extra
    'menu.create_post': 'editör',
    'menu.all_posts': 'tüm yazılar',
    'menu.blueprints': 'planlar',
    'menu.newspaper': 'gazete',
    'menu.member_access': 'üye girişi',
    // AppWindow / WindowRouter
    'appwindow.no_node_id': 'düğüm kimliği yok — düzenlemek için profilimden açın',
    'appwindow.login_required_save': 'kaydetmek için giriş yapmış olmalısınız',
    'appwindow.save_failed': 'kaydetme başarısız oldu',
    'appwindow.publish_success': 'düğüm yayınlandı!',
    'appwindow.draft_success': 'taslak kaydedildi',
    'appwindow.link_copied': 'düğüm bağlantısı kopyalandı',
    'appwindow.link_copy_failed': 'düğüm bağlantısı kopyalanamadı',
    'appwindow.login_required_posts': 'gönderileri kaydetmek için giriş yapmış olmalısınız',
    'appwindow.post_save_failed': 'gönderi kaydedilemedi',
    'appwindow.post_create_failed': 'gönderi oluşturulamadı',
    'appwindow.post_published': 'gönderi yayınlandı!',
    'appwindow.saving': 'kaydediliyor...',
    'appwindow.update': 'güncelle',
    'appwindow.publish': 'yayınla',
    'appwindow.save_draft': 'taslağı kaydet',
    'appwindow.cover': 'kapak',
    'appwindow.node_theme': 'düğüm teması',
    'appwindow.publishing': 'yayınlanıyor...',
    // 404 Page
    'notfound.title': '404 - Sayfa Bulunamadı',
    'notfound.desc': 'Aradığınız sayfa World in Making üzerinde bulunmuyor.',
    'notfound.lost': 'uzayda kayboldun',
    'notfound.lost_desc': 'aradığınız yayın bulunamadı veya farklı bir koordinata taşındı.',
    'notfound.return_btn': 'yörüngeye geri dön',
    // Widget
    'widget.refresh': 'trendleri yenile',
    'widget.prev_page': 'önceki sayfa',
    'widget.next_page': 'sonraki sayfa',
    'widget.open_post': 'gönderiyi aç'
  }
};

export function useTranslation() {
  const { profile } = useAuth();
  const [guestLang, setGuestLang] = useState<string>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred_language');
      if (stored) {
        setGuestLang(stored);
      }
    }
  }, []);

  const lang = (profile?.preferred_language || guestLang) === 'tr' ? 'tr' : 'en';

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] || translations['en'][key] || key;
  }, [lang]);

  return { t, lang };
}
