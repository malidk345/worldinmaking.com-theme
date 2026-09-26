import React, { useState } from 'react'
import OSTabs from 'components/OSTabs'
import ScrollArea from 'components/RadixUI/ScrollArea'
import SEO from 'components/seo'
import Link from 'components/Link'
import { LEGAL_PATHS, LEGAL_TITLES, type LegalPath } from 'lib/legal-paths'

export { LEGAL_PATHS, LEGAL_TITLES }
export type { LegalPath }

const EFFECTIVE = '26 September 2026'
const CONTACT = 'info@worldinmaking.com'
const SITE = 'https://worldinmaking.com'

function Doc({
    title,
    seo,
    children,
}: {
    title: string
    seo?: string
    children: React.ReactNode
}) {
    return (
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-6 text-primary">
            <SEO title={title.toLowerCase()} description={seo || `${title} for worldinmaking.`} />
            <header className="border-b border-primary pb-4 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight m-0">{title}</h1>
                <p className="text-xs text-muted m-0">WorldInMaking · Effective {EFFECTIVE}</p>
            </header>
            <div className="space-y-6 text-sm leading-relaxed text-secondary">{children}</div>
        </div>
    )
}

function H({ children }: { children: React.ReactNode }) {
    return <h2 className="text-base font-bold text-primary m-0 mb-2">{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="m-0">{children}</p>
}

function OperatorNote() {
    return (
        <P>
            WorldInMaking is a personal website and workspace at {SITE}. It is run by an individual operator, not a
            registered company, corporation, or other legal entity. There is no company name, registered office, or
            tax number to list. The operator is the person you reach at {CONTACT}.
        </P>
    )
}

function TermsContent() {
    return (
        <Doc title="Terms of Service" seo="Terms of service for the worldinmaking desk, notebooks, forum, and study.">
            <section>
                <H>1. Agreement</H>
                <OperatorNote />
                <P>
                    These Terms are a contract between you and that operator (“I”, “the operator”) for use of the
                    desktop shell, notebooks, forum, WIM AI, philosopher bots, and related services (the “Service”).
                    By creating an account or using the Service you agree to these Terms and to the{' '}
                    <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
                </P>
            </section>
            <section>
                <H>2. The Service</H>
                <P>
                    WorldInMaking is a web-based workspace: a desktop of windows for writing, discussion, and AI
                    inquiry. Features, models, and limits may change. A free desk and a paid study membership may be
                    offered. Uninterrupted or error-free operation is not promised. This is a personal project, not a
                    company product with a service-level agreement.
                </P>
            </section>
            <section>
                <H>3. Accounts</H>
                <P>
                    You must be at least 16 years old. You are responsible for your credentials and for activity under
                    your account. Provide accurate information. You may delete your account at any time from Account.
                    The operator may suspend or close an account that violates these Terms, creates legal risk, or
                    abuses the Service.
                </P>
            </section>
            <section>
                <H>4. Your content</H>
                <P>
                    You keep ownership of notebooks, posts, messages, and other material you create (“Your Content”).
                    You grant the operator a limited licence to host, store, display, and process Your Content solely
                    to operate and improve the Service (including sync, sharing you enable, backups, and generating AI
                    responses you request). You represent that you have the rights to Your Content and that it does not
                    infringe others’ rights or the law. Public posts and published notebooks are visible to others; do
                    not publish secrets.
                </P>
            </section>
            <section>
                <H>5. Acceptable use</H>
                <P>
                    Do not break the law; harass others; upload malware; probe or disrupt the Service; scrape at a
                    scale that harms the Service; impersonate others; or use the Service to generate or spread content
                    that is fraudulent, abusive, or prohibited by applicable AI-provider policies. Do not attempt to
                    extract model weights or bypass rate limits. The operator may rate-limit, filter, or refuse
                    requests. See also <Link href="/guidelines">Community guidelines</Link>.
                </P>
            </section>
            <section>
                <H>6. AI features</H>
                <P>
                    WIM AI, philosopher bots, and notebook co-authoring send prompts and relevant context to
                    third-party model providers. A literature search also sends the query you typed — not your password
                    and not your account email — to public scholarly services named in the Privacy Policy. Outputs can
                    be wrong, incomplete, out of date, or poorly attributed. They are not legal, medical, financial, or
                    other professional advice, and they are not a substitute for reading the cited work. You are
                    responsible for how you use outputs. Do not submit data you are not allowed to share with
                    processors listed in Subprocessors. Optional bring-your-own keys stay in your browser unless a
                    request you send includes them.
                </P>
            </section>
            <section>
                <H>7. Study and payment</H>
                <P>
                    Paid “study” membership is billed by Lemon Squeezy, Inc. as merchant of record. The operator does
                    not run a company checkout and does not store card numbers. Prices, taxes, invoices, and refunds
                    are handled by Lemon Squeezy under its buyer terms. Subscriptions renew until you cancel in Account
                    (or Lemon Squeezy’s portal). After cancel, access continues until the end of the paid period.
                    Launch coupons (including first-invoice discounts) apply only as stated at checkout. See{' '}
                    <Link href="/refund">Refunds</Link>.
                </P>
            </section>
            <section>
                <H>8. Intellectual property</H>
                <P>
                    The Service, shell, marks, and software are owned by the operator or licensors. These Terms do not
                    transfer that ownership. Feedback you send may be used without obligation to you. Copyright notices:{' '}
                    <Link href="/copyright">Copyright</Link>.
                </P>
            </section>
            <section>
                <H>9. Third parties</H>
                <P>
                    The Service depends on processors such as hosting, auth, payments, and AI providers. Their outages
                    or terms can affect you. Links and embeds are not under the operator’s control.
                </P>
            </section>
            <section>
                <H>10. Disclaimers and liability</H>
                <P>
                    THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”. TO THE MAXIMUM EXTENT PERMITTED BY LAW THE
                    OPERATOR DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                    NON-INFRINGEMENT. THE OPERATOR IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                    PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL. TOTAL LIABILITY FOR ANY CLAIM RELATING TO
                    THE SERVICE IS LIMITED TO THE AMOUNTS YOU PAID FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE
                    CLAIM, OR TEN US DOLLARS (US$10) IF YOU PAID NOTHING. SOME JURISDICTIONS DO NOT ALLOW SOME LIMITS;
                    IN THOSE PLACES LIABILITY IS LIMITED TO THE MINIMUM THE LAW ALLOWS.
                </P>
            </section>
            <section>
                <H>11. Indemnity</H>
                <P>
                    You will defend and indemnify the operator against claims arising from Your Content or your misuse
                    of the Service, except to the extent caused by the operator’s wilful misconduct.
                </P>
            </section>
            <section>
                <H>12. Changes</H>
                <P>
                    These Terms may be updated. Material changes will be posted on this page with a new effective date.
                    Continued use after that date is acceptance. If you do not agree, stop using the Service and delete
                    your account.
                </P>
            </section>
            <section>
                <H>13. Governing law</H>
                <P>
                    These Terms are governed by the laws of the Republic of Türkiye, excluding conflict-of-law rules.
                    Courts of İstanbul have exclusive jurisdiction, except that either party may seek injunctive relief
                    where infringement is occurring. Consumers in the EEA/UK keep mandatory local rights. Payment
                    disputes with Lemon Squeezy may also be subject to Lemon Squeezy’s terms. There is no company
                    registered in Türkiye or elsewhere behind this Service; this clause is only a choice of law for the
                    individual operator.
                </P>
            </section>
            <section>
                <H>14. Contact</H>
                <P>
                    Questions: {CONTACT}, or the Contact window on the desk. {SITE}.
                </P>
            </section>
        </Doc>
    )
}

function PrivacyContent() {
    return (
        <Doc title="Privacy Policy" seo="How worldinmaking collects, uses, and deletes personal data.">
            <section>
                <H>1. Who I am</H>
                <OperatorNote />
                <P>
                    The operator is the controller of personal data for accounts on {SITE}, except where a processor
                    (listed under Subprocessors) handles data for the Service, and except that Lemon Squeezy is
                    controller of payment-card data as merchant of record. Contact: {CONTACT}.
                </P>
            </section>
            <section>
                <H>2. Data collected</H>
                <P>
                    Account: email, password hash or OAuth identifiers, username, profile fields you choose (name, bio,
                    avatar, links). Usage: sessions, desktop layout and theme in local storage, approximate logs needed
                    to run the Service (IP, user agent, timestamps). Content: notebooks, chats, forum posts, uploads
                    you create. Payments: subscription status, Lemon customer/subscription IDs, and plan period — not
                    full card numbers. Analytics: if you accept analytics cookies, product events with a distinct id.
                    Personal data is not sold.
                </P>
            </section>
            <section>
                <H>3. Why it is used</H>
                <P>
                    To create and secure your account; provide the desk, notebooks, forum, and AI; bill study
                    membership; prevent abuse; debug; and meet legal duties. Legal bases under GDPR include contract
                    (Art. 6(1)(b)), legitimate interests in running a safe service (Art. 6(1)(f)), consent where it is
                    asked for (analytics cookies), and legal obligation. Under KVKK the operator is a real person acting
                    as data controller, not a company.
                </P>
            </section>
            <section>
                <H>4. AI processing</H>
                <P>
                    Prompts, selected notebook or chat context, and outputs are sent to model providers to fulfil your
                    request. Your prompts are not used to train a foundation model owned by the operator. Providers’
                    own retention and training policies may apply; see Subprocessors. Do not paste secrets, passwords,
                    or special-category data (health, biometric, political, religious, or similar) that you are not
                    willing to send to those providers.
                </P>
            </section>
            <section>
                <H>5. Scholarly and web lookups</H>
                <P>
                    If you ask WIM AI to search the literature or open a page, the query or URL you asked for is sent
                    to the relevant public service: OpenAlex, Crossref, Semantic Scholar, arXiv, PubMed / NCBI, Europe
                    PMC, DOAJ, CORE, TR Dizin, Unpaywall, and, where the question calls for it, encyclopedia or web
                    sources. Those requests do not include your password or your account email. They identify the site
                    with the contact address {CONTACT}, so the service can apply its polite rate pool. Results can be
                    incomplete when a source is rate-limited. They are not a representation that a work exists, is
                    open-access, or says what the model later claims.
                </P>
            </section>
            <section>
                <H>6. Sharing</H>
                <P>
                    Data is shared with processors who host, authenticate, bill, deliver AI, or (if you consent) analyse
                    product use, under their terms. A literature query is shared with the scholarly services in section
                    5 only to answer that request. Data is shared if required by law or to protect rights and safety.
                    Public content you publish is visible to anyone. Collaborators you invite see what you share with
                    them. There are no employees. Personal data is not sold and is not shared with advertisers.
                </P>
            </section>
            <section>
                <H>7. International transfers</H>
                <P>
                    Infrastructure may be in the Republic of Korea or another region of the Supabase project, the
                    United States, the EU, or other regions used by Cloudflare, Lemon Squeezy, PostHog, and AI or
                    scholarly providers. Where GDPR applies, adequacy decisions or standard contractual clauses are
                    relied on where those processors offer them. The operator does not claim that every vendor has
                    signed a transfer tool with this personal project. If that matters for data you control, do not
                    upload it.
                </P>
            </section>
            <section>
                <H>8. Cookies and local storage</H>
                <P>
                    Essential storage keeps you signed in and remembers wallpaper, windows, and theme. Advertising
                    cookies are not used. Analytics (PostHog) run only if you accept them on the first-visit banner.
                    See <Link href="/cookies">Cookies</Link>.
                </P>
            </section>
            <section>
                <H>9. Retention</H>
                <P>
                    Account and content stay until you delete them or the account is closed. Backups may linger for a
                    short rotation after that. Cancelled study records may be kept as long as tax, accounting, or a
                    payment dispute requires. Security logs are kept only as long as needed to detect abuse and to
                    operate the Service. Analytics events, if you accepted them, follow the analytics vendor’s retention
                    for that project.
                </P>
            </section>
            <section>
                <H>10. Your rights</H>
                <P>
                    Depending on where you live you may access, correct, export, or delete personal data, object to or
                    restrict certain processing, and withdraw consent. Use Account to change email or password, download
                    a copy of your data, cancel study, or delete the account. Deletion removes the auth user and
                    associated cloud records the operator controls. It cannot always pull back copies already public, or
                    copies a processor must keep by law. Local browser copies remain until you clear the device.
                </P>
                <P>
                    Under Turkish Law No. 6698 (KVKK) Art. 11 you may ask whether your data is processed, request
                    information if it is, learn the purpose and whether it is used accordingly, know the third parties
                    it is transferred to in Türkiye or abroad, request correction, request deletion or destruction,
                    object to a result produced exclusively by automated analysis, and claim compensation for unlawful
                    processing. Send the application to {CONTACT}. State who you are, which right you use, and, if you
                    have an account, the email on that account. The operator replies within thirty days (KVKK Art. 13).
                    If the reply is missing or insufficient you may apply to the Personal Data Protection Board
                    (Kişisel Verileri Koruma Kurulu). EEA and UK residents may also complain to their local supervisory
                    authority. These rights are free unless a request is manifestly unfounded or excessive.
                </P>
            </section>
            <section>
                <H>11. Children</H>
                <P>
                    The Service is not directed at children under 16. Their data is not knowingly collected. If you
                    believe a child has an account, write to {CONTACT} and the operator will delete it.
                </P>
            </section>
            <section>
                <H>12. Security</H>
                <P>
                    TLS in transit, access controls, and database row-level security are used. No method is perfectly
                    secure. Tell the operator promptly at {CONTACT} if you believe an account is compromised.
                </P>
            </section>
            <section>
                <H>13. Changes</H>
                <P>
                    Updates will be posted here with a new effective date. Material changes may also be noted in the
                    product. Continued use after the date is acceptance.
                </P>
            </section>
            <section>
                <H>14. Contact</H>
                <P>
                    Privacy and KVKK requests: {CONTACT}. The operator is an individual, not a company, so there is no
                    registered data-protection officer and no company address. See also <Link href="/terms">Terms</Link>{' '}
                    and <Link href="/subprocessors">Subprocessors</Link>.
                </P>
            </section>
        </Doc>
    )
}

function CookiesContent() {
    return (
        <Doc title="Cookies" seo="How worldinmaking uses essential storage and optional analytics.">
            <section>
                <H>1. Who to write to</H>
                <OperatorNote />
                <P>
                    Questions about cookies or local storage: {CONTACT}. This notice is part of the{' '}
                    <Link href="/privacy">Privacy Policy</Link>. Advertising cookies are not used. There is no company
                    ad network and no sale of personal data.
                </P>
            </section>
            <section>
                <H>2. Essential storage</H>
                <P>
                    These items are required for the desk to sign you in and remember the workspace. They are not
                    optional, and they are not used for advertising. The legal basis is the contract for the Service,
                    and, for the consent record itself, the need to honour a refusal.
                </P>
                <P>
                    Sign-in is handled by Supabase. The auth client may store a session cookie and, on this device,
                    local storage such as a session token and an account id. Clearing them signs you out.
                </P>
                <P>
                    Appearance and desk state stay in local storage on this browser, including theme and site settings.
                    The key <span className="font-medium text-primary">cookie_consent</span> stores only “yes” or “no”
                    so the banner does not ask again and so a refusal is remembered. It is not an analytics cookie.
                </P>
            </section>
            <section>
                <H>3. Analytics, only if you accept</H>
                <P>
                    If you press Accept, PostHog may set its own cookies and local storage (names beginning with ph_)
                    and may record product events: pages, feature use, a distinct id, and rough browser and device
                    data. Session replay may run. Password fields are masked. Other fields you type can appear in a
                    replay, so do not accept analytics on a shared or sensitive session if that matters to you.
                </P>
                <P>
                    If you press Decline, analytics stay off. Capturing is opted out, persistence is memory only for
                    that page load, and replay does not run. The choice is stored in cookie_consent so the refusal
                    sticks. There is no second toggle in Account. To change your mind, clear site data for {SITE} and
                    answer the banner again.
                </P>
            </section>
            <section>
                <H>4. How long</H>
                <P>
                    Essential storage lasts until you sign out or clear site data for this browser. The consent value
                    lasts until you clear it. PostHog cookies, if you accepted them, last for the lifetime that vendor
                    sets, or until you clear site data, whichever is sooner.
                </P>
            </section>
            <section>
                <H>5. Processors</H>
                <P>
                    Essential auth and database: Supabase, plus this browser. Edge delivery: Cloudflare. Optional
                    analytics: PostHog, only after Accept. Payments happen on Lemon Squeezy’s pages, under Lemon’s own
                    cookies, not under this banner. Details: <Link href="/subprocessors">Subprocessors</Link>.
                </P>
            </section>
            <section>
                <H>6. Contact</H>
                <P>
                    {CONTACT}. See <Link href="/privacy">Privacy</Link>.
                </P>
            </section>
        </Doc>
    )
}

function RefundContent() {
    return (
        <Doc title="Refunds" seo="Refunds and withdrawal for worldinmaking study membership.">
            <section>
                <H>1. Who charges you</H>
                <P>
                    Study membership is sold by Lemon Squeezy, Inc. as merchant of record. The operator of WorldInMaking
                    is not a registered company and does not take card payments directly. Invoices, VAT/GST where
                    applied, chargebacks, and most refunds are Lemon Squeezy’s.
                </P>
            </section>
            <section>
                <H>2. How to cancel</H>
                <P>
                    Cancel in Account (or Lemon Squeezy’s customer portal via Invoices). Access continues until the end
                    of the period already paid. Cancel stops the next renewal; it is not by itself a refund of the
                    current period.
                </P>
            </section>
            <section>
                <H>3. Refunds</H>
                <P>
                    Fees already collected for a period are not refunded by default, unless Lemon Squeezy’s buyer terms
                    require it, the law requires it, or the operator agrees in writing for a specific case (for example
                    a clear billing error). Ask at {CONTACT} or through the Lemon portal. Launch coupons and
                    first-invoice discounts are not cash; unused time after cancel is not paid out.
                </P>
            </section>
            <section>
                <H>4. EU, UK, and Türkiye withdrawal</H>
                <P>
                    If you are a consumer in the EEA or UK, you may have a 14-day right of withdrawal for distance
                    contracts. If you are a consumer in Türkiye, Law No. 6502 and the Distance Contracts Regulation
                    give a similar 14-day right of withdrawal, counted from the conclusion of the contract for a
                    service that is performed immediately.
                </P>
                <P>
                    Study is digital content and a digital service, supplied as soon as payment succeeds. By checking
                    out you ask for that immediate access. Where the law allows, the withdrawal right ends once
                    performance has begun with your prior consent and, where the statute requires it, your
                    acknowledgement that the right will end. Mandatory consumer rights that cannot be waived still
                    apply, including rights against a defective charge. A request that the law still allows should be
                    sent to {CONTACT} and to Lemon Squeezy. The operator will not pretend to be the merchant of record.
                </P>
            </section>
            <section>
                <H>5. Contact</H>
                <P>
                    {CONTACT}. Lemon Squeezy buyer terms apply to the sale itself.
                </P>
            </section>
        </Doc>
    )
}

function GuidelinesContent() {
    return (
        <Doc title="Community guidelines" seo="How to use the worldinmaking forum, posts, and public notebooks.">
            <section>
                <H>1. This is a small desk</H>
                <P>
                    WorldInMaking is a personal project with a public forum, posts, and optional published notebooks.
                    There is no trust-and-safety team. The operator moderates when needed.
                </P>
            </section>
            <section>
                <H>2. Do</H>
                <P>
                    Write in good faith. Disagree with ideas, not with harassment. Mark unpublished work as unpublished.
                    Assume public posts are public forever.
                </P>
            </section>
            <section>
                <H>3. Do not</H>
                <P>
                    Illegal content; harassment or threats; sexual content involving minors; spam or scoops of other
                    people’s work without right; malware; impersonation; scraping that harms the Service; using AI
                    features to mass-generate abuse. See also Terms §5.
                </P>
            </section>
            <section>
                <H>4. Reports and enforcement</H>
                <P>
                    Email {CONTACT} with the URL, the date if you have it, and a short description of the problem. The
                    operator may remove the content, limit the account, or decline a report that does not identify the
                    material. There is no trust-and-safety team and no guaranteed response time. A serious illegal
                    report (including sexual content involving a minor) is acted on as soon as the operator sees it.
                    Repeat violations can end the account under the Terms.
                </P>
            </section>
        </Doc>
    )
}

function CopyrightContent() {
    return (
        <Doc title="Copyright" seo="Copyright notices for worldinmaking user content.">
            <section>
                <H>1. Your work</H>
                <P>
                    You keep copyright in what you post. Publishing on WorldInMaking is not a transfer of ownership.
                </P>
            </section>
            <section>
                <H>2. The Service</H>
                <P>
                    The desk, marks, and code are the operator’s or licensors’. Do not copy the shell or marks as your
                    own product.
                </P>
            </section>
            <section>
                <H>3. Notices</H>
                <P>
                    WorldInMaking is not a registered company and the operator is not a designated DMCA agent with the
                    U.S. Copyright Office. Good-faith notices are still read. Email {CONTACT} with all of the following:
                    your name and a way to reach you; a description of the work you claim; the exact URL on {SITE}; a
                    statement that you have a good-faith belief the use is not authorised by the owner, the owner’s
                    agent, or the law; and a statement, under penalty of perjury where your law imposes that, that the
                    notice is accurate and that you are the owner or authorised to act for the owner. Knowingly false
                    notices may have legal consequences in your country. The operator may remove or disable the
                    material while the notice is considered, and may tell the member who posted it.
                </P>
            </section>
            <section>
                <H>4. Counter-notice</H>
                <P>
                    If your material was removed and you believe that was a mistake, email {CONTACT} with the URL, why
                    you are entitled to post it, and your contact details. The operator may restore the material or
                    leave it down. This is not a court, and it is not a DMCA counter-notice procedure, because no
                    designated agent is registered.
                </P>
            </section>
        </Doc>
    )
}

function DpaContent() {
    return (
        <Doc title="Data Processing Addendum" seo="GDPR processing terms for worldinmaking.">
            <section>
                <H>1. Roles and particulars</H>
                <P>
                    For account, billing metadata, and telemetry, the operator is the controller (a real person, not a
                    company). For notebooks, chats, and files you store so the Service can run on your instructions, the
                    operator acts as processor and you as controller (or as a processor for your own customers). This
                    addendum applies when GDPR or UK GDPR requires a processor contract (Art. 28). It is incorporated
                    into the Terms when you store content on the Service.
                </P>
                <P>
                    Subject matter: hosting and displaying your content, and generating replies you request. Duration:
                    the life of the account, plus the backup rotation described in the Privacy Policy. Nature and
                    purpose: storage, sync, sharing you turn on, and AI responses. Type of data: account identifiers,
                    text, files, and prompts you submit. Categories of data subjects: you, and people named in content
                    you choose to upload. Contact for this addendum: {CONTACT}.
                </P>
            </section>
            <section>
                <H>2. Instructions</H>
                <P>
                    That content is processed only to provide the Service, as described in the Terms and Privacy Policy,
                    and as you instruct through the product (save, share, generate, delete). It is not sold.
                </P>
            </section>
            <section>
                <H>3. Security</H>
                <P>
                    Encryption in transit, access control, and row-level security are applied. There are no employees.
                    Access is limited to the operator and the processors listed on Subprocessors.
                </P>
            </section>
            <section>
                <H>4. Subprocessors</H>
                <P>
                    You authorise use of the subprocessors listed on the Subprocessors tab. Data-protection terms are
                    imposed on them no less protective than these, where those vendors offer such terms. The operator
                    remains responsible for their processing for the Service.
                </P>
            </section>
            <section>
                <H>5. Assistance, breach, deletion</H>
                <P>
                    Assistance with data-subject requests, DPIAs, and breach notices is given to the extent the product
                    and law require. You will be notified without undue delay after the operator becomes aware of a
                    personal-data breach affecting your content. After account deletion, processor content the operator
                    holds is deleted or anonymised, except copies that must be kept by law or in encrypted backups until
                    rotation.
                </P>
            </section>
            <section>
                <H>6. Transfers and audits</H>
                <P>
                    Transfers outside the EEA/UK follow section 7 of the Privacy Policy. Reasonable information to
                    demonstrate compliance is available on written request, subject to confidentiality. This is a
                    personal project; on-site audits are by agreement and at your expense unless the operator is in
                    material breach.
                </P>
            </section>
        </Doc>
    )
}

function BaaContent() {
    return (
        <Doc title="HIPAA / BAA" seo="WorldInMaking does not offer a HIPAA BAA.">
            <section>
                <H>1. Not a HIPAA product</H>
                <P>
                    WorldInMaking is a personal writing and discussion workspace. It is not designed, certified, or
                    contracted as a HIPAA-covered service. The operator is not a company and does not offer a Business
                    Associate Agreement.
                </P>
            </section>
            <section>
                <H>2. Do not store PHI</H>
                <P>
                    Do not upload protected health information or other regulated special-category data that requires a
                    BAA or equivalent. If you need that, do not use this Service for it.
                </P>
            </section>
            <section>
                <H>3. Contact</H>
                <P>Questions: {CONTACT}.</P>
            </section>
        </Doc>
    )
}

function SubprocessorsContent() {
    const rows: Array<[string, string, string]> = [
        ['Supabase', 'Auth, database, file storage, realtime', 'Project region (may include Asia Pacific or the United States)'],
        ['Cloudflare', 'CDN, DNS, edge hosting', 'Global'],
        ['Lemon Squeezy', 'Merchant of record, checkout, invoices', 'United States'],
        ['Groq', 'AI inference for WIM AI and bots', 'United States'],
        ['Google (Gemini)', 'AI inference', 'United States or the EU, as Google offers'],
        ['NVIDIA', 'AI inference when that provider is used', 'United States'],
        ['OpenAI', 'AI inference only if enabled or if you supply a key', 'United States'],
        ['Anthropic', 'AI inference only if you supply your own key', 'United States'],
        ['PostHog', 'Product analytics and optional session replay, only if you accept analytics', 'United States or the EU, matching the configured host'],
        [
            'Scholarly sources',
            'OpenAlex, Semantic Scholar, Crossref, Unpaywall, NCBI, arXiv, Europe PMC, DOAJ, CORE, TR Dizin: the query you asked to search, plus the site contact address',
            'Varies by source',
        ],
    ]
    return (
        <Doc title="Subprocessors" seo="Processors worldinmaking uses to run the desk.">
            <P>
                These organisations process data so the Service can run. They are vendors of the individual operator,
                not subsidiaries of a WorldInMaking company (there is no such company). AI providers receive prompt
                content you submit. Lemon Squeezy processes payments as merchant of record.
            </P>
            <div className="border border-primary overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-primary bg-accent">
                            <th className="py-2 px-3 font-semibold">Name</th>
                            <th className="py-2 px-3 font-semibold">Role</th>
                            <th className="py-2 px-3 font-semibold">Region</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([name, role, region]) => (
                            <tr key={name} className="border-b border-primary last:border-b-0">
                                <td className="py-2 px-3 text-primary font-medium">{name}</td>
                                <td className="py-2 px-3">{role}</td>
                                <td className="py-2 px-3">{region}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <P>Updates will appear on this page. Questions: {CONTACT}.</P>
        </Doc>
    )
}

const TAB_CONTENT: Record<LegalPath, React.ReactNode> = {
    '/terms': <TermsContent />,
    '/privacy': <PrivacyContent />,
    '/cookies': <CookiesContent />,
    '/refund': <RefundContent />,
    '/guidelines': <GuidelinesContent />,
    '/copyright': <CopyrightContent />,
    '/dpa': <DpaContent />,
    '/baa': <BaaContent />,
    '/subprocessors': <SubprocessorsContent />,
}

export default function Legal({ children, defaultTab = '/terms' }: { children?: React.ReactNode; defaultTab?: string }) {
    const initial = (LEGAL_PATHS as readonly string[]).includes(defaultTab) ? defaultTab : '/terms'
    const [currentTab, setCurrentTab] = useState(initial)

    return (
        <div className="w-full h-full flex flex-col min-h-0 bg-transparent">
            <SEO title="legal" description="Terms, privacy, and related notices for worldinmaking." />
            <OSTabs
                padding
                contentPadding={false}
                tabs={LEGAL_PATHS.map((path) => ({
                    label: LEGAL_TITLES[path],
                    value: path,
                    content: (
                        <ScrollArea className="h-full">
                            {children && currentTab === path ? children : TAB_CONTENT[path]}
                        </ScrollArea>
                    ),
                }))}
                defaultValue={initial}
                value={currentTab}
                onValueChange={(value) => {
                    setCurrentTab(value)
                }}
                centerTabs
                className="h-full flex flex-col min-h-0"
            />
        </div>
    )
}
