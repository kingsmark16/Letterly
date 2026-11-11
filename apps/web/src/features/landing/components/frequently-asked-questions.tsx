"use client";

import Link from "next/link";
import { useState } from "react";
import { frequentlyAskedQuestions } from "../../../content/letterly-information";
import styles from "../page.module.css";
import faqStyles from "./frequently-asked-questions.module.css";

type FaqCategory =
  "all" | "getting-started" | "privacy-security" | "features-sharing";

interface CategorizedQuestion {
  question: string;
  answer: string;
  category: FaqCategory;
  categoryLabel: string;
  index: number;
}

const categorizedFaqs: CategorizedQuestion[] = [
  {
    question: "What is Letterly?",
    answer: frequentlyAskedQuestions[0]!.answer,
    category: "getting-started",
    categoryLabel: "Basics",
    index: 1,
  },
  {
    question: "Which categories can I use?",
    answer: frequentlyAskedQuestions[1]!.answer,
    category: "getting-started",
    categoryLabel: "Templates",
    index: 2,
  },
  {
    question: "Do I need an account to create a page?",
    answer: frequentlyAskedQuestions[2]!.answer,
    category: "getting-started",
    categoryLabel: "Account",
    index: 3,
  },
  {
    question: "Do visitors need an account to open my page?",
    answer: frequentlyAskedQuestions[3]!.answer,
    category: "privacy-security",
    categoryLabel: "Access",
    index: 4,
  },
  {
    question: "What can I add to a page?",
    answer: frequentlyAskedQuestions[4]!.answer,
    category: "features-sharing",
    categoryLabel: "Features",
    index: 5,
  },
  {
    question: "Can I keep my page private?",
    answer: frequentlyAskedQuestions[5]!.answer,
    category: "privacy-security",
    categoryLabel: "Privacy",
    index: 6,
  },
  {
    question: "Can I add a password to my page?",
    answer: frequentlyAskedQuestions[6]!.answer,
    category: "privacy-security",
    categoryLabel: "Security",
    index: 7,
  },
  {
    question: "How do private replies work?",
    answer: frequentlyAskedQuestions[7]!.answer,
    category: "features-sharing",
    categoryLabel: "Replies",
    index: 8,
  },
  {
    question: "Can I edit a page after publishing it?",
    answer: frequentlyAskedQuestions[8]!.answer,
    category: "features-sharing",
    categoryLabel: "Lifecycle",
    index: 9,
  },
  {
    question: "How can I share a published page?",
    answer: frequentlyAskedQuestions[9]!.answer,
    category: "features-sharing",
    categoryLabel: "Sharing",
    index: 10,
  },
  {
    question: "Will my page appear in search results?",
    answer: frequentlyAskedQuestions[10]!.answer,
    category: "privacy-security",
    categoryLabel: "Search",
    index: 11,
  },
  {
    question: "What if I see a page that needs attention?",
    answer: frequentlyAskedQuestions[11]!.answer,
    category: "features-sharing",
    categoryLabel: "Safety",
    index: 12,
  },
];

const categoryTabs: { id: FaqCategory; label: string; count: number }[] = [
  { id: "all", label: "All questions", count: 12 },
  { id: "getting-started", label: "Getting started", count: 3 },
  { id: "privacy-security", label: "Privacy & Security", count: 4 },
  { id: "features-sharing", label: "Features & Sharing", count: 5 },
];

export function FrequentlyAskedQuestions(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");

  const visibleFaqs =
    activeCategory === "all"
      ? categorizedFaqs
      : categorizedFaqs.filter((faq) => faq.category === activeCategory);

  return (
    <section
      className={styles.faqSection}
      id="faq"
      aria-labelledby="faq-title"
      data-section-entry
    >
      {/* Ambient Stardust Radial Glow behind FAQ */}
      <div className={faqStyles.ambientGlow} aria-hidden="true" />

      {/* Left Column: Sidebar & Concierge Help Card */}
      <div className={faqStyles.faqSidebar}>
        <div className={faqStyles.faqIntro}>
          <div className={faqStyles.eyebrow}>
            <span className={faqStyles.eyebrowLine} aria-hidden="true" />
            <span>CLARITY & CARE</span>
          </div>
          <h2 id="faq-title">
            Frequently asked <em>questions.</em>
          </h2>
          <p className={faqStyles.faqDescription}>
            Everything you need to know about crafting your letter, choosing who
            can open it, and keeping your words safe.
          </p>
        </div>

        {/* Concierge Help Card */}
        <div className={faqStyles.conciergeCard}>
          <div className={faqStyles.conciergeHeader}>
            <div className={faqStyles.conciergeIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#be123c" />
                <path
                  d="M12 16.5 C9.5 14 6 11.5 6 9 A3 3 0 0 1 12 7.8 A3 3 0 0 1 18 9 C18 11.5 14.5 14 12 16.5 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <h3 className={faqStyles.conciergeTitle}>
              Have a special question?
            </h3>
          </div>
          <p className={faqStyles.conciergeText}>
            Every confession, birthday wish, and love letter is personal. If you
            are exploring ideas, our template gallery has live interactive
            previews.
          </p>
          <Link href="/templates" className={faqStyles.conciergeLink}>
            Explore letter designs <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Filter Pills & Interactive Card Accordion */}
      <div className={faqStyles.faqMain}>
        {/* Category Filter Pills */}
        <div
          className={faqStyles.filterBar}
          role="tablist"
          aria-label="FAQ categories"
        >
          {categoryTabs.map((tab) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`${faqStyles.filterTab} ${isSelected ? faqStyles.filterTabActive : ""}`}
                onClick={() => setActiveCategory(tab.id)}
              >
                <span>{tab.label}</span>
                <span
                  className={`${faqStyles.filterCount} ${isSelected ? faqStyles.filterCountActive : ""}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion Cards */}
        <div className={faqStyles.faqList}>
          {visibleFaqs.map((item) => (
            <details key={item.question} className={faqStyles.faqCard}>
              <summary className={faqStyles.summary}>
                <div className={faqStyles.summaryMain}>
                  <span className={faqStyles.indexBadge} aria-hidden="true">
                    {item.index}
                  </span>
                  <span className={faqStyles.categoryTag} aria-hidden="true">
                    {item.categoryLabel}
                  </span>
                  <span className={faqStyles.questionText}>
                    {item.question}
                  </span>
                </div>
                <span className={faqStyles.toggleBadge} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1.5v9M1.5 6h9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className={faqStyles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
