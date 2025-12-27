-- Dursun Kaya Mustafa kullanıcısına Admin yetkisi ver
-- Bu komutu Supabase SQL Editor'de çalıştır.
-- EĞER "0 rows affected" diyorsa, kullanıcı henüz siteye giriş yapmamış demektir. Önce giriş yap, sonra tekrar çalıştır.

update profiles
set role = 'admin'
where id in (
  select id from auth.users where email = 'dursunkayamustafa@gmail.com'
);
