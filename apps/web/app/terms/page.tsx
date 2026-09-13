import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import appLogo from "../../assets/images/app-logo.png";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Terms and Conditions | Letterly",
  description:
    "The terms that apply when you create, publish, visit, or respond to a Letterly page.",
};

const lastUpdated = "September 13, 2026";
// Replace with the monitored legal address before public launch.
const legalContact = "legal@letterly.app";

const contents = [
  { id: "agreement", label: "Agreement and scope" },
  { id: "eligibility", label: "Who may use Letterly" },
  { id: "accounts", label: "Accounts and security" },
  { id: "service", label: "The service and private beta" },
  { id: "pages", label: "Pages and publishing" },
  { id: "creator-content", label: "Creator content" },
  { id: "visitor-content", label: "Visitor content" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "moderation", label: "Reports and moderation" },
  { id: "privacy", label: "Privacy and security" },
  { id: "copyright", label: "Copyright and IP" },
  { id: "third-party", label: "Third party services" },
  { id: "no-advice", label: "No professional advice" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Liability" },
  { id: "indemnity", label: "Indemnity" },
  { id: "disputes", label: "Disputes" },
  { id: "changes", label: "Changes and termination" },
  { id: "general", label: "General terms" },
  { id: "contact", label: "Contact" },
] as const;

type TermsSection = {
  id: (typeof contents)[number]["id"];
  number: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

const sections: readonly TermsSection[] = [
  {
    id: "agreement",
    number: "01",
    title: "Agreement and scope",
    paragraphs: [
      `These Terms and Conditions are an agreement between you and Letterly ("Letterly", "we", "us", or "our"). They apply to the Letterly website, creator workspace, template gallery, page editor, public pages, visitor responses, media features, reporting tools, and any other service that links to these Terms (together, the "Service").`,
      "By visiting, creating an account, creating a page, opening a shared page, or submitting a response, you agree to these Terms. If you do not agree, do not use the Service.",
      "These Terms are written for the Letterly private beta. Letterly should publish the final operating entity, postal address, legal contact, privacy notice, and governing law before opening the Service to a wider audience.",
    ],
  },
  {
    id: "eligibility",
    number: "02",
    title: "Who may use Letterly",
    paragraphs: [
      "You may use Letterly only if you can form a binding agreement where you live and using the Service is lawful for you. Letterly is intended for personal, lawful communication and supports people of different ages where permitted by law.",
      "If you are under the age of majority or the age of digital consent in your location, use the Service only with the involvement and permission of a parent or legal guardian when required. A parent or guardian who permits a young person to use Letterly accepts these Terms on their behalf and remains responsible for supervision.",
      "Letterly must never be used to groom, sexualize, exploit, threaten, endanger, or otherwise harm a child. Do not request a child's private contact details, location, school, passwords, or images for an unsafe purpose.",
    ],
  },
  {
    id: "accounts",
    number: "03",
    title: "Accounts and security",
    paragraphs: [
      "Creators need an account to create, save, edit, publish, and manage pages. The available sign in providers may include Google and Facebook. You are responsible for the information you submit to your chosen provider and for following that provider's terms.",
      "Keep your account and connected sign in credentials secure. Do not share access, impersonate another person, create an account for someone else without permission, or use an account after we have asked you to stop. Tell us promptly if you believe an account or page has been accessed without permission.",
      "You are responsible for activity performed through your account unless the activity resulted from Letterly's failure to use reasonable security measures. We may require additional verification or temporarily limit access to protect the Service, other users, or the public.",
    ],
  },
  {
    id: "service",
    number: "04",
    title: "The service and private beta",
    paragraphs: [
      "Letterly provides a place to choose a supported template, write and arrange content, add optional media or questions, preview a page, publish it, and share a link or QR code. Visitors can open published pages without an account and can respond when the creator enables responses.",
      "The Service is provided as a private beta. Features, templates, limits, supported media types, and availability may change as we learn and improve. We may add, remove, pause, or restrict a feature, including a template specific capability, with or without advance notice when needed for safety, maintenance, or legal reasons.",
      "Letterly currently does not charge for the private beta. If we introduce fees, subscriptions, or paid features, we will show the applicable price, billing timing, renewal, cancellation, and refund terms before a charge is made.",
    ],
  },
  {
    id: "pages",
    number: "05",
    title: "Pages and publishing",
    paragraphs: [
      "A creator controls the content and lifecycle of their pages. Drafts are intended to remain private while the creator works. A page becomes available to people with its link only after the creator deliberately publishes it.",
      "Anyone who has a published page link may be able to open that page. A password is an optional access feature for supported templates, not a promise of absolute security. Do not use Letterly as the only protection for information that would cause serious harm if disclosed.",
      "A QR code is only another way to reach a page's canonical link. It is not an access control mechanism. Creators are responsible for sharing links, passwords, media, and page content thoughtfully and for making sure the people depicted or named have any permission required by law.",
      "Creators may edit, unpublish, archive, or delete pages through the features available to their account. A published page may remain accessible for a short period during caching, indexing, backup, or technical recovery, and deletion may not immediately remove copies made by other people.",
    ],
  },
  {
    id: "creator-content",
    number: "06",
    title: "Creator content and permissions",
    paragraphs: [
      "You keep ownership of the letters, messages, images, audio, questions, replies, and other material you submit or attach to a page (your Creator Content). You are responsible for Creator Content and for the way you use it.",
      "You give Letterly a worldwide, nonexclusive, royalty free license to host, store, reproduce, format, transmit, display, and otherwise process Creator Content only as needed to provide, secure, maintain, moderate, back up, and support the Service. This includes showing a published page to the people who access its link and delivering visitor responses to the page creator.",
      "The license continues only for as long as needed for those purposes. It ends when the relevant content is deleted, except for copies that must be retained for legal compliance, security, fraud prevention, dispute resolution, or reliable backups. Letterly does not claim ownership of your Creator Content and does not sell the text of your letters.",
      "Before uploading an image, audio file, music track, or other media, make sure you own it or have the permission and license needed to use it on Letterly. Uploaded music must be creator owned or properly licensed. Do not use another person's name, likeness, voice, writing, or private information without a lawful reason and appropriate consent.",
    ],
  },
  {
    id: "visitor-content",
    number: "07",
    title: "Visitor content and responses",
    paragraphs: [
      "A visitor may answer a question or leave a separate private message when a creator enables those features. You choose what to submit. Avoid including passwords, financial information, government identifiers, precise location, or other sensitive information that the recipient does not need.",
      "By submitting a response, you give Letterly permission to receive, store, protect, and deliver that response to the creator of the page for whom it was submitted. The creator may be able to read, save, copy, or otherwise use the response. Letterly does not promise that a creator will read, answer, or keep a response confidential after it is delivered to them.",
      "Responses are intended to remain private to the page creator within the Service. Letterly may access, preserve, disclose, or remove a response when reasonably necessary to provide the Service, prevent harm, investigate abuse, respond to legal process, or comply with law.",
    ],
  },
  {
    id: "acceptable-use",
    number: "08",
    title: "Acceptable use",
    paragraphs: [
      "Use Letterly in a way that respects other people and the law. You must not use the Service to create, upload, publish, share, request, or encourage content or activity that:",
    ],
    bullets: [
      "threatens, stalks, harasses, bullies, coerces, exploits, or intentionally humiliates another person;",
      "sexualizes, grooms, exploits, or depicts sexual abuse of a child, or facilitates contact with a child for an unsafe purpose;",
      "impersonates a person or organization, deceives people about who sent a message, or uses another person's identity without permission;",
      "publishes private, identifying, intimate, or confidential information about another person without a lawful basis or appropriate consent;",
      "infringes copyright, trademark, privacy, publicity, confidentiality, or other rights;",
      "is unlawful, fraudulent, discriminatory, hateful, or designed to promote violence or self harm;",
      "uploads malware, malicious code, corrupted files, or content designed to disrupt the Service;",
      "attempts to bypass a password, rate limit, moderation decision, access control, or other security measure;",
      "scrapes, crawls, bulk downloads, probes, reverse engineers, or automatically interacts with the Service except where Letterly has expressly allowed it; or",
      "uses the Service to send spam, unwanted solicitation, scams, or repeated unwanted contact.",
    ],
  },
  {
    id: "moderation",
    number: "09",
    title: "Reports, moderation, and enforcement",
    paragraphs: [
      "You can report a public page without an account through the reporting flow. Include enough information for us to locate and understand the concern, but do not include unnecessary personal information. Imminent danger and suspected child exploitation should also be reported to local emergency services or the appropriate authority.",
      "Letterly may review reports and use automated or human review, as appropriate, to protect people and the Service. We may remove or restrict content, disable a page, limit features, suspend or close an account, preserve evidence, or cooperate with lawful requests when we believe it is necessary for safety, policy enforcement, security, or legal compliance.",
      "We do not guarantee that every harmful or unlawful page will be found before it is reported. A moderation action may happen without advance notice when notice would increase risk or prevent us from protecting people. If an available appeal or support process applies, you may contact us through the published support channel. A support request does not guarantee restoration.",
    ],
  },
  {
    id: "privacy",
    number: "10",
    title: "Privacy, security, and retention",
    paragraphs: [
      "Letterly is designed around private drafts, deliberate publishing, optional passwords, anonymous visitors, and creator only responses. These controls reduce exposure, but no internet service can promise perfect confidentiality, availability, or security.",
      "To operate and protect the Service, Letterly may process account identifiers, page and media content, visitor responses, cookies, device or browser information, IP addresses, security events, and technical logs. We use service providers for functions such as authentication, hosting, storage, database operations, rate limiting, error monitoring, and content delivery. Sensitive letter text and visitor responses should not be placed in analytics events.",
      "A separate privacy notice should explain the purposes, legal bases, categories of recipients, international transfers, retention periods, and rights that apply to personal information. This Terms page is not a privacy notice. If a privacy notice or mandatory law gives you rights that conflict with these Terms, the mandatory requirement controls.",
      "Letterly may retain content or account information for as long as needed to provide the Service, follow a creator's request, resolve disputes, prevent abuse, meet legal obligations, maintain secure backups, or enforce these Terms. We may delete information that is no longer needed, subject to those exceptions.",
    ],
  },
  {
    id: "copyright",
    number: "11",
    title: "Copyright and other intellectual property",
    paragraphs: [
      "Letterly's name, logo, interface, software, templates, visual design, documentation, and other materials supplied by Letterly are owned by Letterly or its licensors. These materials are protected by intellectual property laws and may not be copied, modified, distributed, sold, or used to create a competing service except with permission or where the law allows it.",
      "If you believe content on Letterly infringes your copyright, send a written notice to " +
        legalContact +
        " with your signature, identification of the copyrighted work, the location of the material, your contact information, a good faith statement, and a statement that the information is accurate and that you are authorized to act for the rights holder. We may remove or restrict access to allegedly infringing material and may provide a legally valid counter notice process where required.",
      "We may terminate accounts or restrict access for repeat infringement. A report does not make Letterly responsible for deciding ownership, and we may ask for more information before acting.",
    ],
  },
  {
    id: "third-party",
    number: "12",
    title: "Third party services and links",
    paragraphs: [
      "The Service may rely on or link to third party services, including sign in providers, media hosts, storage providers, analytics or error monitoring tools, and linked media platforms. Those services have their own terms and privacy practices. Letterly is not responsible for a third party's availability, content, security, or handling of information.",
      "You are responsible for having the rights and permissions needed to use third party media or links in your page. A link, embed, or sign in option does not mean Letterly endorses the third party or guarantees that it will remain available.",
    ],
  },
  {
    id: "no-advice",
    number: "13",
    title: "No professional, legal, or emergency advice",
    paragraphs: [
      "Letterly is a communication and publishing tool. It is not a crisis line, emergency service, medical provider, therapist, lawyer, financial adviser, or relationship counselor. Content on a Letterly page is personal expression, not professional advice or a promise that a situation is safe.",
      "If someone is in immediate danger, contact local emergency services. If a message suggests imminent self harm, violence, abuse, or exploitation, do not rely on Letterly to respond in time. Seek qualified local help and use the reporting tools when appropriate.",
    ],
  },
  {
    id: "disclaimers",
    number: "14",
    title: "Disclaimers",
    paragraphs: [
      "To the fullest extent permitted by law, the Service is provided on an as available and as is basis. Letterly disclaims warranties and conditions, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, title, non infringement, quiet enjoyment, accuracy, reliability, and availability.",
      "Letterly does not promise that the Service will be uninterrupted, error free, secure, compatible with every device, preserved without loss, or free of harmful content. We do not promise that a recipient will open a page, that a visitor will reply, that a password will prevent every unauthorized access, or that a page marked noindex will never appear in a search result.",
      "Some places do not allow certain disclaimers, so part of this section may not apply to you. In that case, the disclaimer applies only to the maximum extent the law permits.",
    ],
  },
  {
    id: "liability",
    number: "15",
    title: "Limits on liability",
    paragraphs: [
      "To the fullest extent permitted by law, Letterly and its owners, team members, contractors, licensors, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, goodwill, data, opportunities, or emotional distress arising from or related to the Service or these Terms.",
      "To the fullest extent permitted by law, the total liability of Letterly for all claims related to the Service or these Terms will not exceed the greater of the amount you paid Letterly for the Service in the twelve months before the event giving rise to the claim or one hundred United States dollars (US$100). This limit does not apply where the law does not permit it, including for liability that cannot lawfully be limited.",
      "These limits apply even if Letterly knew that a loss was possible. They do not remove rights that cannot be waived under the law that applies to you.",
    ],
  },
  {
    id: "indemnity",
    number: "16",
    title: "Your responsibility to us",
    paragraphs: [
      "To the extent permitted by law, you agree to defend, indemnify, and hold harmless Letterly and its owners, team members, contractors, licensors, and service providers from claims, losses, liabilities, damages, costs, and reasonable legal fees arising from your Creator Content, your visitor response, your misuse of the Service, your breach of these Terms, or your violation of another person's rights.",
      "We will give you reasonable notice of a claim when practical. We may choose to control the defense of a claim that could affect Letterly, and you will provide reasonable cooperation. You may not settle a claim in a way that admits fault by Letterly or creates an obligation for Letterly without our written consent.",
    ],
  },
  {
    id: "disputes",
    number: "17",
    title: "Disputes and governing law",
    paragraphs: [
      "If you have a concern, please contact us first at " +
        legalContact +
        " and give us a reasonable opportunity to understand and resolve it. This informal step does not prevent you from using a legal right or seeking urgent relief.",
      "Unless mandatory law in your location requires another rule, these Terms and any dispute related to them are governed by the law of the jurisdiction where Letterly's operating entity is registered, without regard to conflict of law rules. The courts located in that jurisdiction will have exclusive jurisdiction, unless mandatory consumer law gives you the right to bring a claim elsewhere.",
      "Nothing in this section prevents either party from seeking temporary or emergency relief from a court with authority to protect confidential information, intellectual property, security, or people from imminent harm.",
    ],
  },
  {
    id: "changes",
    number: "18",
    title: "Changes, suspension, and termination",
    paragraphs: [
      "We may update these Terms when the Service, the law, or our safety practices change. We will update the date at the top of this page and, where a change is material and notice is practical, provide additional notice. Your continued use of the Service after the updated Terms take effect means you accept them. If you do not accept an update, stop using the Service.",
      "You may stop using Letterly at any time. Creators can use the available account and page controls to unpublish or delete their pages. Letterly may suspend or end access, remove content, or discontinue the Service when necessary for safety, security, legal compliance, non payment, prolonged inactivity, or a serious or repeated breach of these Terms.",
      "Sections that by their nature should continue after termination will survive, including ownership and licenses, visitor content permissions, acceptable use consequences, intellectual property, disclaimers, limits on liability, indemnity, dispute rules, and general terms.",
    ],
  },
  {
    id: "general",
    number: "19",
    title: "General terms",
    paragraphs: [
      "These Terms, together with any feature specific terms we clearly present, are the entire agreement about your use of the Service. If a conflict exists, the feature specific term controls only for that feature. A failure to enforce a provision is not a waiver of the right to enforce it later.",
      "If a court finds a provision invalid or unenforceable, the provision will be narrowed or removed only to the extent required, and the remaining provisions will continue. You may not assign these Terms or transfer your account without our written consent. Letterly may assign these Terms as part of a merger, acquisition, reorganization, or transfer of the Service, subject to applicable law.",
      "The Service is operated in English. Translations may be provided for convenience, but the English version controls if a translation conflicts. These Terms do not create a partnership, employment, agency, fiduciary, or exclusive relationship between you and Letterly.",
    ],
  },
  {
    id: "contact",
    number: "20",
    title: "Contact and legal notices",
    paragraphs: [
      "Questions about these Terms, copyright notices, safety concerns, and legal notices may be sent to " +
        legalContact +
        ". Include enough detail for us to understand your request, but do not send passwords or unnecessary sensitive content.",
      "This private beta draft uses the Letterly brand and a replaceable legal contact. Before public launch, the operator should confirm the legal entity name, postal address, monitored contact channel, privacy notice, child safety process, copyright agent details where applicable, and jurisdiction specific terms.",
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

export function TermsDocument(): React.JSX.Element {
  return (
    <article className={styles.document}>
      <aside className={styles.reviewNotice} role="note">
        <strong>Before public launch</strong>
        <p>
          This is a complete product draft, not legal advice. Confirm the
          operator details, contact address, privacy notice, child safety
          process, and governing law with a qualified lawyer.
        </p>
      </aside>

      {sections.map((section) => (
        <section
          className={styles.termsSection}
          id={section.id}
          key={section.id}
          aria-labelledby={`${section.id}-title`}
        >
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>
              {Number(section.number)}
            </span>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
          </div>
          <div className={styles.sectionBody}>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      <div className={styles.documentContact}>
        <a href={`mailto:${legalContact}`}>Contact Letterly legal</a>
      </div>
    </article>
  );
}

export default function TermsPage(): React.JSX.Element {
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
        <section className={styles.hero} aria-labelledby="terms-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Private beta legal draft</p>
            <h1 id="terms-title">Terms and Conditions</h1>
            <p className={styles.heroDescription}>
              The agreement for creating, sharing, opening, and responding to a
              Letterly page.
            </p>
            <div className={styles.metaRow}>
              <span>Last updated</span>
              <time dateTime="2026-09-13">{lastUpdated}</time>
            </div>
          </div>

          <aside className={styles.heroNote} aria-label="Terms at a glance">
            <p className={styles.noteLabel}>At a glance</p>
            <ul>
              <li>Creators keep ownership of their content.</li>
              <li>Drafts stay private until a creator publishes.</li>
              <li>Visitors can open a shared page without an account.</li>
              <li>Reports help us respond to unsafe public content.</li>
            </ul>
          </aside>
        </section>

        <div className={styles.contentGrid}>
          <aside className={styles.toc} aria-label="Terms contents">
            <p className={styles.tocLabel}>On this page</p>
            <nav>
              <ol>
                {contents.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <TermsDocument />
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
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms" aria-current="page">
            Terms
          </Link>
        </nav>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Letterly
        </p>
      </footer>
    </div>
  );
}
