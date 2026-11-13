"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { frequentlyAskedQuestions } from "../../../content/letterly-information";
import styles from "./workspace-faq.module.css";

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

export function WorkspaceFaq(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");

  const visibleFaqs =
    activeCategory === "all"
      ? categorizedFaqs
      : categorizedFaqs.filter((faq) => faq.category === activeCategory);

  return (
    <section
      className={styles.section}
      id="faq"
      aria-label="Frequently asked questions"
    >
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.sidebar}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            <span>Clarity & Care</span>
          </div>
          <h2 id="home-faq-title">
            Frequently asked <em>questions.</em>
          </h2>
          <p className={styles.description}>
            Everything you need to know about crafting your letter, choosing who
            can open it, and keeping your words safe.
          </p>
        </div>

        <div className={styles.conciergeCard}>
          <div className={styles.conciergeHeader}>
            <div className={styles.conciergeIcon} aria-hidden="true">
              <Heart size={16} strokeWidth={2.2} />
            </div>
            <h3 className={styles.conciergeTitle}>Have a special question?</h3>
          </div>
          <p className={styles.conciergeText}>
            Every confession, birthday wish, and love letter is personal. If you
            are exploring ideas, our template gallery has live interactive
            previews.
          </p>
          <Link href="/templates" className={styles.conciergeLink}>
            Explore letter designs <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className={styles.main}>
        <div
          className={styles.filterBar}
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
                className={`${styles.filterTab} ${isSelected ? styles.filterTabActive : ""}`}
                onClick={() => setActiveCategory(tab.id)}
              >
                <span>{tab.label}</span>
                <span
                  className={`${styles.filterCount} ${isSelected ? styles.filterCountActive : ""}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.list}>
          {visibleFaqs.map((item) => (
            <details key={item.question} className={styles.card}>
              <summary className={styles.summary}>
                <div className={styles.summaryMain}>
                  <span className={styles.indexBadge} aria-hidden="true">
                    {item.index}
                  </span>
                  <span className={styles.categoryTag} aria-hidden="true">
                    {item.categoryLabel}
                  </span>
                  <span className={styles.questionText}>{item.question}</span>
                </div>
                <span className={styles.toggleBadge} aria-hidden="true">
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
              <div className={styles.answer}>
                <p>{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
