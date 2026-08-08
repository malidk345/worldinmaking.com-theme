# WIM AI & Notebook Uygulaması Entegrasyonu - Kapsamlı Rapor

Bu rapor, projedeki "Markdown Notebook" uygulamasının temel çalışma prensiplerini ve "WIM AI" adlı yapay zeka botunun bu ekosisteme nasıl entegre olduğunu analiz eder. Ayrıca gelecekteki geliştirmeler için öneriler sunar.

## 1. Sistem Mimarisi ve Notebook Çalışma Prensibi

Projedeki Notebook sistemi (`src/notebook-app/lib/components/MarkdownNotebook`), "local-first" prensibiyle çalışan ve Markdown formatını veri depolama katmanı (source of truth) olarak kullanan zengin bir metin editörüdür.

*   **Veri Modeli (Document Model):** Tüm veriler düz markdown formatında saklanır (`lib/components/MarkdownNotebook/markdown.ts`). Editör çalışırken markdown string'i, `NotebookDocument` ve `NotebookBlockNode`lardan oluşan bir AST'ye (Abstract Syntax Tree) ayrıştırılır. `parseMarkdownNotebook` ve `serializeMarkdownNotebook` fonksiyonları ile editör ve kaynak arasında çift yönlü güvenilir dönüşüm (round-trip) sağlanır.
*   **Editör Mimarisi (Single Editing Host):** Editör (`.MarkdownNotebook__canvas`), tek bir `contenteditable` (düzenlenebilir) kapsayıcı içinde çalışır. Blok elementler de (liste, tablo) kendi `contenteditable` özelliklerine sahip olsa bile, tarayıcı native klavye eventleri (`keydown`, `beforeinput`) en üst katmanda dinlenir ve imleç (selection) pozisyonuna göre uygun işlem yapılır. `handleRootEditableKeyDown` ve native `beforeinput` fonksiyonlarıyla DOM ağacının React döngüsünün dışında bozulması engellenir.
*   **Senkronizasyon ve Çakışma Yönetimi:** `value` (lokal içerik) ve `remoteValue` (sunucu içeriği) ayrı tutulur. Kullanıcı eşzamanlı değişiklik yaptığında, arka planda çalışan üç yönlü (three-way) merge algoritması (`mergeNotebookMarkdownChanges`) ile çakışmalar lokal, baz (base) ve uzak (remote) versiyonlar birleştirilerek çözülür.

## 2. WIM AI Botunun Çalışma Mekanizması

WIM AI (notebook sistemine entegre asistan botu), kullanıcıların içerik oluşturmasına, bağlamı analiz etmesine ve verileri sorgulamasına olanak tanır. Kod tabanında `notebookAI.ts` üzerinden ve `CollaboratorsBanner.tsx`'teki etkinliklerde (Activity Item) yer alır.

*   **AI Prompting Sistemi:**
    *   Kullanıcı boş bir blokta `/` ile veya format tool üzerinden (ask AI about selection vb.) AI menüsünü tetikleyebilir.
    *   Sistem, seçilen alan (`selectionAIActions`) veya inline notebook içerikleri bazında sorguları alır. `getAskAISelectionQuery` ve `getAskAIInlineNotebookQuery` ile yapay zekaya bağlam sağlanır.
*   **Streaming (Canlı Akış) ve Yanıt İşleme:**
    *   Yapay zeka yanıtları anlık akış (stream) olarak markdown belgesine yansıtılır. `notebookAI.ts` içerisindeki `streamNotebookAIResponseMarkdown` ve `replaceNotebookAIResponseMarkdown` fonksiyonları, gelen yanıtları mevcut ağaca (node'lara) entegre eder.
    *   `replaceNotebookAIResponseMarkdown` metodu, WIM AI'nin ürettiği cevabı, kullanıcıların mevcut işini bölmeden (örneğin imlecin veya seçili nodun altına), doğru düğüm endeksini hesaplayarak (fingerprint eşleştirme yöntemiyle) yerine koyar.
*   **Özel Komponentler ve Insight'lar:** AI yanıtlarında `<insight>` etiketleri `<Query>` bileşenlerine dönüştürülerek PostHog benzeri analiz panoları veya veritabanı sorgu görünümü doğrudan not defterine gömülür.
*   **Görünüm (UI) Entegrasyonu:** `CollaboratorsBanner.tsx` içindeki banner, WIM AI'yi gerçek bir işbirlikçi (collaborator) gibi listeler ("Generated summary report & insights" aktiviteleri). AI yazı yazarken `NOTEBOOK_AI_WRITING_PLACEHOLDER` ("Thinking...") gösterilir ve `isAIWriting` durumunda bloğa özel animasyon/tasarım eklenir.

## 3. Gelecek Geliştirme (Development) Önerileri

Mevcut sistem oldukça gelişmiş bir AST mimarisi kullansa da WIM AI ve Notebook entegrasyonunu bir üst seviyeye taşımak için şu öneriler değerlendirilebilir:

1.  **AI Yanıtlarını Paralel Görüntüleme (Ghost Text / Diff View):**
    *   Şu an AI, metni doğrudan ağaca `replace` ederek yerleştiriyor. Kullanıcı metni değiştirmek/geliştirmek istediğinde eski metin kaybolabiliyor veya overwrite ediliyor.
    *   *Öneri:* GitHub Copilot tarzı "Ghost Text" mekanizması veya mevcut `MarkdownTextDiff` komponenti kullanılarak "Kabul Et / Reddet" (Accept/Reject) diff arayüzü eklenebilir. Böylece kullanıcı AI'ın önerisini tam olarak görmeden metni değiştirmemiş olur.
2.  **Context (Bağlam) Farkındalığının Artırılması:**
    *   WIM AI şu an sadece seçili bloğu veya lokal imleç bağlamını okuyup (`getAskAISelectionQuery`) cevap üretiyor.
    *   *Öneri:* AI, tüm dokümanı bir "vektör bellek (RAG - Retrieval-Augmented Generation)" veya özetleme (summarization) modülü üzerinden anlayabilirse; dokümanın çok yukarısındaki başlıklarla bağlantılı içerik üretebilir. `mergeNotebookMarkdownChanges` içine AI bağlamını dahil eden (AI Context Window) özel bir state tutulabilir.
3.  **Proaktif WIM AI Önerileri (Smart Suggestions):**
    *   Kullanıcı yazarken sadece istendiğinde değil, belli kalıplar fark edildiğinde (örneğin "RCA Raporu" şablonu açıldığında), WIM AI sayfa kenarında proaktif tavsiyelerde (floating suggestions) bulunabilir.
4.  **Performans Optimizasyonu (O(N) Render):**
    *   Büyük not defterlerinde her keystroke (tuş vuruşu) sırasında `parseMarkdownNotebook` çağrılması yük oluşturabilir.
    *   *Öneri:* Tüm belgeyi her karakter basımında baştan parse etmek yerine, sadece imlecin olduğu ve `replaceNotebookAIResponseMarkdown`'un çalıştığı lokal AST düğümü güncellenmeli (Incremental AST update). React içindeki hooklar (`useMemo` vb.) O(N*M) darboğazlarından kaçınacak şekilde, sadece değişen (dirty) düğümleri render etmelidir (Project "Bolt" performans kriterlerine istinaden).
