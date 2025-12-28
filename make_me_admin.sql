-- BU KOMUTU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Bu komut, belirtilen email adresine sahip kullanıcıyı 'admin' yapar.
-- DİKKAT: Komutu çalıştırmadan önce siteye o mail ile en az bir kez GİRİŞ YAPMIŞ olmanız gerekir.

update public.profiles
set role = 'admin'
where id in (
  select id from auth.users where email = 'dursunkayamustafa@gmail.com'
);

-- İşlem başarılı mı kontrol et:
select email, raw_user_meta_data->>'username' as name, role 
from auth.users 
join public.profiles on auth.users.id = public.profiles.id
where email = 'dursunkayamustafa@gmail.com';
