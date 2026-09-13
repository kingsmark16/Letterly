import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import styles from "../terms/page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Letterly",
  description:
    "How Letterly collects, uses, shares, and protects information across private pages and visitor responses.",
};

const lastUpdated = "September 13, 2026";
// Replace with the monitored legal address before public launch.
const legalContact = "legal@letterly.app";

const contents = [
  { id: "scope", label: "Scope and responsibility" },
  { id: "information", label: "Information you provide" },
  { id: "accounts", label: "Accounts and sign in" },
  { id: "content", label: "Letters, pages, and media" },
  { id: "responses", label: "Visitor responses" },
  { id: "reports", label: "Reports and support" },
  { id: "automatic", label: "Information collected automatically" },
  { id: "cookies", label: "Cookies and storage" },
  { id: "uses", label: "How we use information" },
  { id: "legal-bases", label: "Legal bases and choices" },
  { id: "sharing", label: "Pages and sharing" },
  { id: "disclosures", label: "When we disclose information" },
  { id: "providers", label: "Service providers" },
  { id: "international", label: "International processing" },
  { id: "retention", label: "Retention and deletion" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children's privacy" },
  { id: "rights", label: "Your rights and choices" },
  { id: "third-party", label: "Third party services" },
  { id: "changes-contact", label: "Changes and contact" },
] as const;

type PrivacySection = {
  id: (typeof contents)[number]["id"];
  number: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  afterBullets?: readonly string[];
};

const sections: readonly PrivacySection[] = [
  {
    id: "scope",
    number: "01",
    title: "Scope and responsibility",
    paragraphs: [
      'This Privacy Policy explains how the Letterly operator ("Letterly", "we", "us", or "our") handles personal information when you visit the Letterly website, sign in, create or manage a page, open a public page, submit a response, upload media, report content, or contact us. These activities are together called the "Service".',
      "This notice applies to information processed through Letterly and does not replace the privacy notice of a sign in provider, media service, or other third party that you choose to use.",
      "The operating entity, postal address, and any appointed data protection officer have not yet been entered in this private beta. Before public launch, the operator must publish those details and confirm this notice with qualified legal counsel.",
      "For privacy questions, rights requests, or safety concerns, contact " +
        legalContact +
        ". Please do not send a password or unnecessary sensitive information by email.",
    ],
  },
  {
    id: "information",
    number: "02",
    title: "Information you provide",
    paragraphs: [
      "We collect information when you choose to give it to us, when another person sends it through a Letterly page, or when a feature needs it to work. The exact fields depend on the page, template, and action you use.",
    ],
    bullets: [
      "Account information, such as your name, email address, profile image, provider account identifier, and email verification state.",
      "Page information, such as a page title, slug, draft text, settings, publishing state, template choice, questions, answers, and private replies.",
      "Media information, such as uploaded image or audio files, captions, titles, file type, file size, checksums, dimensions, and processing state.",
      "Visitor information, such as answers, private messages, question text shown at the time of submission, submission time, and the page that received the response.",
      "Safety and support information, such as a report reason, an optional report message, the page being reported, and details you include in a support or legal request.",
    ],
  },
  {
    id: "accounts",
    number: "03",
    title: "Accounts and sign in",
    paragraphs: [
      "Creators need an account to create, save, edit, publish, and manage pages. The private beta can use Google or Facebook sign in when those providers are configured. We receive the account details that the provider makes available to complete authentication and maintain your Letterly account.",
      "Our authentication service also processes session records and security information such as session creation, expiry, sign in IP address, and user agent. These records help us keep an account signed in, detect misuse, and revoke access when needed.",
      "The sign in provider may independently collect information about your provider account, device, and use of its service. Review that provider's privacy notice before connecting it to Letterly. Letterly does not receive your provider password.",
      "Some information is required to create and secure a creator account. If you do not provide it, we may not be able to provide creator features, but you can still open an eligible public page without a Letterly account.",
    ],
  },
  {
    id: "content",
    number: "04",
    title: "Letters, pages, and media",
    paragraphs: [
      "We process the text, settings, template data, questions, media, and other material you add to a page so that we can save your draft, render the chosen design, preview it, publish it, deliver it to people with the link, and show responses in your workspace.",
      "A password protected page needs a protected password representation and page scoped unlock proof. We do not need to display the password in your page or workspace. A password is an optional access control, not a guarantee that a recipient cannot copy or share what they see.",
      "Uploaded images and audio are processed for the selected page. We retain the metadata needed to validate, transform, serve, replace, and remove those files. You should upload only material you own or have permission to use, and you should avoid placing highly sensitive information in a page unless the recipient truly needs it.",
      "Drafts are intended to stay private until you publish them. Once you publish, the content becomes available to people who can reach the page link, subject to the template and access settings you choose.",
    ],
  },
  {
    id: "responses",
    number: "05",
    title: "Visitor responses",
    paragraphs: [
      "A visitor can answer questions or leave a private message when the creator enables those features. A visitor does not need a Letterly account for an eligible public page. We process the response, the question or prompt shown with it, the page identifier, and the time it was submitted so that we can deliver it to the page creator.",
      "The public response flow uses a random browser token and stores a one way hash of that token with the submission. This helps limit duplicate or abusive submissions without making the raw browser token part of the response record.",
      "The page creator can read, mark, and delete responses through the creator workspace. A response is intended to be private to that creator within Letterly, but the creator may copy, save, or share it outside the Service. Letterly may access, preserve, restrict, or remove a response when needed for security, moderation, legal compliance, or reliable operation.",
      "Please do not include passwords, financial details, government identifiers, precise location, or another person's sensitive information in a response unless there is a lawful and necessary reason.",
    ],
  },
  {
    id: "reports",
    number: "06",
    title: "Reports and support",
    paragraphs: [
      "A person can report a public page without an account. We process the selected reason, the page identifier, any optional message, and the technical details needed to prevent abuse and investigate the report. We may ask for more information if a report cannot be understood or located.",
      "If you contact support, privacy, or legal, we process the contact details and message you provide, together with the status and history of the request. We use this information to respond, keep a record of our decision, and protect people from repeated abuse.",
      "Reports about imminent danger or suspected child exploitation should also go to local emergency services or the appropriate authority. Letterly is not an emergency response service.",
    ],
  },
  {
    id: "automatic",
    number: "07",
    title: "Information collected automatically",
    paragraphs: [
      "When a browser requests the Service, our hosting, API, and security layers may receive technical information that is sent with the request or needed to answer it. Depending on the route and environment, this can include:",
    ],
    bullets: [
      "IP address or another network address, used for rate limiting, abuse prevention, security, and operational logs.",
      "Browser and device information, such as user agent, language, operating system signals, and request headers.",
      "Request details, such as time, route, status, request identifier, response timing, and coarse error metadata.",
      "Security events, such as failed unlock attempts, suspicious traffic, moderation actions, and access control decisions.",
      "A random public browser token and page scoped unlock cookies that help public pages support responses and protected content.",
    ],
  },
  {
    id: "cookies",
    number: "08",
    title: "Cookies and storage",
    paragraphs: [
      "Letterly uses cookies and similar browser storage for features that cannot work without them. The current implementation is designed around necessary cookies rather than advertising cookies.",
    ],
    bullets: [
      "Authentication cookies keep a creator signed in and protect authenticated requests.",
      "The letterly_browser cookie gives a public browser a stable, random scope for visitor response limits. It is HTTP only, uses a lax same site setting, and is not the visitor's name.",
      "A page scoped unlock cookie remembers that a visitor passed a supported page password. It is separate from the creator's account session and can be revoked when the page password changes.",
      "Security and preference storage may be used when a particular feature requires it. The operator must update this notice before adding analytics, advertising, or cross site tracking cookies.",
    ],
  },
  {
    id: "uses",
    number: "09",
    title: "How we use information",
    paragraphs: [
      "We use personal information for the following purposes, limited to what the relevant feature needs:",
    ],
    bullets: [
      "Provide the Service, including account access, drafts, page rendering, publishing, media delivery, page unlocking, and visitor responses.",
      "Communicate with you about account access, support requests, safety reports, service changes, and legal notices.",
      "Keep the Service secure, including rate limiting, fraud and abuse prevention, session protection, password checks, incident response, and access control.",
      "Review and act on reports, protect children and other vulnerable people, enforce the Terms and Conditions, and comply with lawful requests.",
      "Maintain reliable infrastructure, troubleshoot errors, measure performance, and improve the Service using bounded operational information.",
      "Create backups, recover from failures, resolve disputes, establish or defend legal claims, and meet accounting or record keeping duties where applicable.",
    ],
  },
  {
    id: "legal-bases",
    number: "10",
    title: "Legal bases and choices",
    paragraphs: [
      "If a data protection law such as the GDPR or a similar law applies to you, we will process your information on a lawful basis that matches the activity. The final operator should confirm the exact legal bases for each jurisdiction before public launch.",
    ],
    bullets: [
      "Contract or steps before a contract, when we create your account, save your page, publish your link, or deliver a response you asked us to deliver.",
      "Legitimate interests, when we secure the Service, prevent abuse, maintain reliable infrastructure, moderate harmful content, answer support requests, and defend our rights. We balance these interests against your privacy.",
      "Legal obligations, when we must keep a record, respond to valid legal process, protect a person, or meet a regulatory requirement.",
      "Consent, when we ask for it for a clearly optional activity. You can withdraw consent at any time, but withdrawal does not affect processing that already happened lawfully or processing that has another legal basis.",
      "Vital interests or another lawful safety basis, where recognized by the law that applies and needed to respond to a serious threat to a person.",
    ],
    afterBullets: [
      "Letterly does not use personal information to make decisions that have legal or similarly significant effects on you. Automated signals may help identify rate limits, suspicious activity, or content for review, but they are safeguards and not a substitute for the rights and review process required by law.",
    ],
  },
  {
    id: "sharing",
    number: "11",
    title: "Pages and sharing",
    paragraphs: [
      "Publishing is an intentional sharing action. People who have a published page link may be able to view the page, its enabled media, and its template interactions. If you add a password on a supported template, visitors must pass that check before protected content is returned.",
      "A page link, QR code, password, or noindex setting is not a promise of secrecy. A recipient can copy, screenshot, download, or reshare content outside Letterly. Search engines and other websites may also keep copies if someone shares a page beyond the controls available in the Service.",
      "Visitor answers and private messages are delivered to the creator of the page and are not intended to be publicly listed by Letterly. A creator can still use or disclose a response outside the Service, so choose what you submit carefully.",
      "Unpublished drafts are not part of the public page projection. Technical backups, caches, security records, or copies made by another person may take time to disappear after you unpublish or delete a page.",
    ],
  },
  {
    id: "disclosures",
    number: "12",
    title: "When we disclose information",
    paragraphs: [
      "We disclose information only for a purpose described in this notice or when the law permits or requires it. Recipients can include:",
      "Letterly does not sell personal information or use it for cross context behavioral advertising as part of this private beta. The operator must confirm that practice and update this notice before introducing advertising, data sharing for advertising, or a new monetization model.",
    ],
    bullets: [
      "The page creator and people who receive a page because the creator published and shared it.",
      "Service providers that host, store, authenticate, process media, rate limit, monitor, secure, or support Letterly under our instructions.",
      "Authorities, courts, regulators, or professional advisers when disclosure is needed to follow law, respond to valid process, protect people, or establish or defend legal rights.",
      "A successor, buyer, or professional adviser involved in a merger, financing, acquisition, reorganization, or sale of all or part of the Service, subject to appropriate confidentiality and legal safeguards.",
      "You or another person when you direct us to share the information or give permission for a specific disclosure.",
    ],
  },
  {
    id: "providers",
    number: "13",
    title: "Service providers",
    paragraphs: [
      "Letterly relies on carefully scoped infrastructure providers to run the Service. The current implementation may use the following categories and vendors, depending on the environment:",
    ],
    bullets: [
      "Authentication, such as Better Auth and the Google or Facebook provider you select.",
      "Application hosting and a hosted PostgreSQL database for accounts, pages, responses, reports, and operational records.",
      "S3 compatible object storage, such as Cloudflare R2, for private page media.",
      "A Redis compatible store for rate limits, short lived unlock proofs, and other temporary security state when enabled.",
      "Error and performance monitoring, such as Sentry, when the operator enables it. Monitoring is configured to avoid sending letter text and visitor responses in diagnostic events.",
    ],
    afterBullets: [
      "These providers may process personal information on our behalf and may have their own subprocessors. Before public launch, the operator should publish a current vendor list, processing locations, contract terms, and the correct contact details for each required jurisdiction.",
    ],
  },
  {
    id: "international",
    number: "14",
    title: "International processing",
    paragraphs: [
      "Letterly and its service providers may process personal information in countries other than the one where you live. Those countries may have privacy rules that differ from yours.",
      "Where a law requires safeguards for an international transfer, the operator will use an accepted transfer mechanism, such as an adequacy decision, standard contractual clauses, or another lawful safeguard. The operator should identify the relevant locations and safeguards before public launch.",
      "You can contact " +
        legalContact +
        " to ask about the transfer mechanism that applies to your information. Do not include account passwords in a transfer request.",
    ],
  },
  {
    id: "retention",
    number: "15",
    title: "Retention and deletion",
    paragraphs: [
      "We keep information only for as long as it is needed for the purpose collected, a feature you asked us to provide, a legal obligation, a safety investigation, a dispute, or secure recovery. Retention depends on the type of information and the page lifecycle.",
    ],
    bullets: [
      "Account and session information is kept while the account is active and for a limited period needed to close the account, prevent abuse, resolve disputes, or meet legal duties.",
      "Drafts, published pages, questions, settings, and media are kept until you delete them, the page expires or is removed, or we need a limited recovery copy for security and reliability.",
      "Visitor responses are kept while they are available to the creator, until the creator deletes them, or until a safety, legal, or operational retention rule requires another action.",
      "Reports, moderation actions, appeals, and audit records are retained for a finite operational period. The current private beta default for moderation retention is 730 days, subject to legal holds and a final legal review.",
      "Technical logs, rate limit state, unlock proofs, and diagnostics are kept for the shortest period that supports security, troubleshooting, and reliable service. Exact periods depend on the environment and must be documented before public launch.",
      "Necessary browser cookies remain until their expiry or until you clear them. The public browser scope cookie is configured for up to one year unless it is removed sooner.",
    ],
    afterBullets: [
      "When you delete information, it may remain briefly in encrypted backups, security records, legal holds, or de identified operational records. We remove or isolate it when those purposes end. Deleting a page cannot remove copies that a recipient made outside Letterly.",
    ],
  },
  {
    id: "security",
    number: "16",
    title: "Security",
    paragraphs: [
      "Letterly uses technical and organizational safeguards intended to protect personal information. These include encrypted transport in production, HTTP only and same site cookie settings where appropriate, access controls, signed visitor and unlock tokens, protected password handling, checksums for uploaded media, bounded request bodies, rate limits, and redacted operational monitoring.",
      "Access to creator content and visitor responses is limited by the page and account permissions enforced by the Service. We do not put private response text in public page projections, and monitoring events should not contain letter text or visitor responses.",
      "No online service is perfectly secure. If you believe an account, page, password, or response has been exposed, contact " +
        legalContact +
        " promptly and include the page link or account email only when needed to investigate.",
    ],
  },
  {
    id: "children",
    number: "17",
    title: "Children's privacy",
    paragraphs: [
      "Letterly is a general audience service for personal communication and is not directed to children under 13. The product may be used by people of different ages where lawful, but a child should use it only with the involvement of a parent or legal guardian when required.",
      "We do not knowingly collect personal information from a child under 13 in a way that requires verifiable parental consent. If we learn that a child provided information that requires consent, we will take steps required by applicable law, which may include obtaining consent, limiting use, or deleting the information.",
      "A parent or guardian can contact " +
        legalContact +
        " to ask us to review, delete, or stop collecting a child's information. We may need to verify the requester's identity and relationship to the child before acting.",
      "Never use Letterly to groom, sexualize, exploit, threaten, or endanger a child. Do not request a child's location, school, passwords, private contact details, or intimate media. Report suspected exploitation to local authorities as well as Letterly.",
    ],
  },
  {
    id: "rights",
    number: "18",
    title: "Your rights and choices",
    paragraphs: [
      "Depending on where you live, you may have rights over personal information, including access, correction, deletion, restriction, objection, portability, and withdrawal of consent. You may also have the right to complain to your local data protection authority.",
      "Some laws provide additional rights, such as the right to know the categories of information collected, opt out of sale or sharing, limit certain sensitive information uses, or receive equal service when you exercise a right. Letterly does not currently sell personal information, but the operator must confirm the applicable rights and notices for each jurisdiction.",
      "To make a request, email " +
        legalContact +
        " with the account email, page link, or other detail that helps us locate the information and the right you want to exercise. Do not send a password, full government identifier, or the contents of a private letter unless we specifically request a secure process.",
      "We may ask for reasonable information to verify your identity and protect another person's privacy. We normally respond within the period required by applicable law. If we cannot complete a request, we will explain why and tell you about any available appeal or complaint route.",
      "Creators can also use the available page controls to unpublish, delete pages, and delete visitor responses. Visitors who want a response removed should contact the page creator first or contact us when the creator cannot be reached or the issue involves safety or legal rights.",
    ],
  },
  {
    id: "third-party",
    number: "19",
    title: "Third party services",
    paragraphs: [
      "The Service can link to or depend on services that Letterly does not control, including Google, Facebook, storage infrastructure, media delivery, and links that a creator places in a page. Those services have their own privacy notices and terms.",
      "When you follow a third party link, use a third party sign in, or load a third party media service, that provider may collect information directly from your browser. Letterly is not responsible for a third party's privacy practices, availability, or security. Review the provider's notice before sharing information through it.",
      "A creator remains responsible for having the permission needed to publish another person's name, image, voice, writing, or private information. Letterly does not turn a third party link into a private channel.",
    ],
  },
  {
    id: "changes-contact",
    number: "20",
    title: "Changes and contact",
    paragraphs: [
      "We may update this Privacy Policy when the Service, our providers, our data practices, or the law changes. We will update the date at the top of this page and, where a change is material and notice is practical, provide additional notice. The updated notice applies from its effective date.",
      "This private beta document is a complete product draft, but it is not legal advice. Before public launch, the operator must confirm its legal identity and address, vendor list, data locations, retention schedule, children’s privacy process, rights workflow, cookie choices, complaint route, and any jurisdiction specific disclosures.",
      "Questions, rights requests, privacy complaints, and legal notices may be sent to " +
        legalContact +
        ". We will use the information in the request only to understand, verify, respond to, and document the request, subject to the retention rules in this notice.",
    ],
  },
] as const;

function BrandMark(): React.JSX.Element {
  return (
    <Image
      className={styles.brandLogo}
      src={appLogo}
      alt=""
      aria-hidden="true"
      width={264}
      height={72}
      priority
    />
  );
}

export function PrivacyDocument(): React.JSX.Element {
  return (
    <article className={styles.document}>
      <aside className={styles.reviewNotice} role="note">
        <strong>Before public launch</strong>
        <p>
          This is a complete product draft, not legal advice. Confirm the
          operator details, vendor list, transfer safeguards, retention
          schedule, children’s privacy process, and rights workflow with a
          qualified lawyer.
        </p>
      </aside>

      {sections.map((section) => (
        <section
          className={styles.termsSection}
          id={section.id}
          key={section.id}
          aria-labelledby={section.id + "-title"}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>
              {Number(section.number)}
            </span>
            <h2 id={section.id + "-title"}>{section.title}</h2>
          </div>
          <div className={styles.sectionBody}>
            {section.paragraphs.map((paragraph, index) => (
              <p key={section.id + "-paragraph-" + index}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.afterBullets?.map((paragraph, index) => (
              <p key={section.id + "-after-" + index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}

      <div className={styles.documentContact}>
        <a href={"mailto:" + legalContact}>Contact Letterly privacy</a>
      </div>
    </article>
  );
}

export default function PrivacyPage(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Letterly home">
            <BrandMark />
          </Link>
          <nav className={styles.headerNav} aria-label="Legal page navigation">
            <Link href="/">Back to Letterly</Link>
            <Link className={styles.headerAction} href="/sign-in">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="privacy-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Private beta legal draft</p>
            <h1 id="privacy-title">Privacy Policy</h1>
            <p className={styles.heroDescription}>
              A clear account of the information Letterly handles while you
              make, share, open, and answer a personal page.
            </p>
            <div className={styles.metaRow}>
              <span>Last updated</span>
              <time dateTime="2026-09-13">{lastUpdated}</time>
            </div>
          </div>

          <aside className={styles.heroNote} aria-label="Privacy at a glance">
            <p className={styles.noteLabel}>At a glance</p>
            <ul>
              <li>Drafts stay private until a creator publishes.</li>
              <li>Visitors can respond without creating an account.</li>
              <li>We do not sell letter text or visitor responses.</li>
              <li>Necessary cookies support sign in and page access.</li>
            </ul>
          </aside>
        </section>

        <div className={styles.contentGrid}>
          <aside className={styles.toc} aria-label="Privacy Policy contents">
            <p className={styles.tocLabel}>On this page</p>
            <nav>
              <ol>
                {contents.map((item) => (
                  <li key={item.id}>
                    <a href={"#" + item.id}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className={styles.document}>
            <aside className={styles.reviewNotice} role="note">
              <strong>Before public launch</strong>
              <p>
                This is a complete product draft, not legal advice. Confirm the
                operator details, vendor list, transfer safeguards, retention
                schedule, children’s privacy process, and rights workflow with a
                qualified lawyer.
              </p>
            </aside>

            {sections.map((section) => (
              <section
                className={styles.termsSection}
                id={section.id}
                key={section.id}
                aria-labelledby={section.id + "-title"}
              >
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>
                    {Number(section.number)}
                  </span>
                  <h2 id={section.id + "-title"}>{section.title}</h2>
                </div>
                <div className={styles.sectionBody}>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={section.id + "-paragraph-" + index}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                  {section.afterBullets?.map((paragraph, index) => (
                    <p key={section.id + "-after-" + index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <div className={styles.documentContact}>
              <a href={"mailto:" + legalContact}>Contact Letterly privacy</a>
            </div>
          </article>
        </div>
      </main>

      <footer className={styles.footer}>
        <div>
          <Link href="/" aria-label="Return to the Letterly home page">
            <BrandMark />
          </Link>
          <p>A private place for the words that matter.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/templates">Templates</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/privacy" aria-current="page">
            Privacy
          </Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Letterly
        </p>
      </footer>
    </div>
  );
}
