"use client";

import type { PageQuestion } from "@letterly/contracts/questions";
import styles from "./question-editor.module.css";

interface QuestionFlowCanvasProps {
  questions: PageQuestion[];
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
}

interface FlowBranch {
  id: string;
  label: string;
  target: PageQuestion | null;
  targetLabel: string;
  endsJourney: boolean;
}

interface FlowQuestionTreeNode {
  question: PageQuestion;
  index: number;
  branches: Array<
    FlowBranch & {
      child: FlowQuestionTreeNode | null;
      isReference: boolean;
    }
  >;
}

interface FlowQuestionNodeProps {
  node: FlowQuestionTreeNode;
  isListItem?: boolean;
  onEdit: (question: PageQuestion) => void;
  onDelete: (question: PageQuestion) => void;
  onAddQuestion: () => void;
}

function nextQuestion(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
  targetId: string | null,
): PageQuestion | null {
  if (question.endsJourney) return null;
  if (targetId) {
    return questions.find((candidate) => candidate.id === targetId) ?? null;
  }
  return questions[index + 1] ?? null;
}

function branchList(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
): FlowBranch[] {
  if (question.type === "CHOICE") {
    return question.choices.map((choice) => {
      const target = choice.endsJourney
        ? null
        : nextQuestion(question, index, questions, choice.nextQuestionId);
      return {
        id: choice.id,
        label: choice.label,
        target,
        targetLabel: choice.endsJourney
          ? "Finish the journey"
          : (target?.prompt ?? "Add a question"),
        endsJourney: choice.endsJourney,
      };
    });
  }

  const target = nextQuestion(
    question,
    index,
    questions,
    question.nextQuestionId,
  );
  return [
    {
      id: question.id,
      label: "Written answer",
      target,
      targetLabel: question.endsJourney
        ? "Finish the journey"
        : (target?.prompt ?? "Add a question"),
      endsJourney: question.endsJourney,
    },
  ];
}

function buildFlowQuestionTree(
  question: PageQuestion,
  index: number,
  questions: PageQuestion[],
  seen: ReadonlySet<string>,
): { node: FlowQuestionTreeNode; seen: Set<string> } {
  const nextSeen = new Set(seen);
  nextSeen.add(question.id);

  const branches = branchList(question, index, questions).map((branch) => {
    if (!branch.target || nextSeen.has(branch.target.id)) {
      return {
        ...branch,
        child: null,
        isReference: Boolean(branch.target),
      };
    }

    const childResult = buildFlowQuestionTree(
      branch.target,
      questions.findIndex((candidate) => candidate.id === branch.target?.id),
      questions,
      nextSeen,
    );
    nextSeen.clear();
    for (const id of childResult.seen) nextSeen.add(id);

    return {
      ...branch,
      child: childResult.node,
      isReference: false,
    };
  });

  return {
    node: { question, index, branches },
    seen: nextSeen,
  };
}

function FlowQuestionNode({
  node,
  isListItem = false,
  onEdit,
  onDelete,
  onAddQuestion,
}: FlowQuestionNodeProps): React.JSX.Element {
  const { question, index, branches } = node;
  const isBase = index === 0;
  const QuestionNodeTag = isListItem ? "li" : "div";

  return (
    <QuestionNodeTag className={styles.canvasQuestion}>
      <div className={styles.questionNode}>
        <button
          className={styles.promptNode}
          type="button"
          onClick={() => onEdit(question)}
          aria-label={`Question: ${question.prompt}`}
        >
          {question.prompt}
        </button>
        <button
          className={styles.typeNode}
          type="button"
          onClick={() => onEdit(question)}
          aria-label={`Choose question type for ${question.prompt}`}
        >
          CHOOSE QUESTION TYPE
        </button>
      </div>

      <div className={styles.nodeActions}>
        <span>{isBase ? "BASE QUESTION" : `QUESTION ${index + 1}`}</span>
        <button type="button" onClick={() => onEdit(question)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(question)}>
          Delete
        </button>
      </div>

      <span className={styles.questionStem} aria-hidden="true" />
      <div className={styles.answerBranches}>
        {branches.map((branch) => {
          const child = branch.child ? (
            <FlowQuestionNode
              node={branch.child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddQuestion={onAddQuestion}
            />
          ) : branch.isReference ? (
            <div className={styles.referenceNode}>
              Already shown: {branch.targetLabel}
            </div>
          ) : (
            <button
              className={styles.addNode}
              type="button"
              onClick={onAddQuestion}
            >
              <span className="sr-only">Finish when no question remains</span>
              Add more question
            </button>
          );

          return (
            <div className={styles.answerBranch} key={branch.id}>
              <span className={styles.branchStem} aria-hidden="true" />
              <div className={styles.answerNode}>
                <span className="sr-only">Next step</span>
                {branch.label}
              </div>
              <span className={styles.answerStem} aria-hidden="true" />
              <div className={styles.branchChild}>
                {branch.endsJourney ? (
                  <div className={styles.finishNode}>Finish the journey</div>
                ) : (
                  child
                )}
              </div>
            </div>
          );
        })}
      </div>
    </QuestionNodeTag>
  );
}

function AccessibleQuestionList({
  questions,
}: {
  questions: PageQuestion[];
}): React.JSX.Element {
  return (
    <ol className={styles.accessibleQuestionList} aria-label="Saved questions">
      {questions.map((question, index) => (
        <li key={question.id}>
          {index === 0 ? "Base question" : `Question ${index + 1}`}:{" "}
          {question.prompt}
          {question.type === "CHOICE"
            ? question.choices.map((choice) => ` ${choice.label}`).join(",")
            : " Written answer"}
        </li>
      ))}
    </ol>
  );
}

export function QuestionFlowCanvas({
  questions,
  onEdit,
  onDelete,
  onAddQuestion,
}: QuestionFlowCanvasProps): React.JSX.Element {
  const baseQuestion = questions[0];
  const flowRoots: FlowQuestionTreeNode[] = [];
  let seen = new Set<string>();

  if (baseQuestion) {
    const baseResult = buildFlowQuestionTree(baseQuestion, 0, questions, seen);
    flowRoots.push(baseResult.node);
    seen = baseResult.seen;
  }

  for (const question of questions) {
    if (seen.has(question.id)) continue;
    const result = buildFlowQuestionTree(
      question,
      questions.findIndex((candidate) => candidate.id === question.id),
      questions,
      seen,
    );
    flowRoots.push(result.node);
    seen = result.seen;
  }

  return (
    <div className={styles.canvas} role="group" aria-label="Question list">
      <AccessibleQuestionList questions={questions} />
      <div className={styles.canvasInner}>
        {baseQuestion ? (
          flowRoots.map((root) => (
            <ol className={styles.canvasTree} key={root.question.id}>
              <FlowQuestionNode
                node={root}
                isListItem
                onEdit={onEdit}
                onDelete={onDelete}
                onAddQuestion={onAddQuestion}
              />
            </ol>
          ))
        ) : (
          <div className={styles.emptyCanvasNode}>
            <div className={styles.questionNode}>
              <button
                className={styles.promptNode}
                type="button"
                onClick={onAddQuestion}
              >
                Start with a question
              </button>
              <button
                className={styles.typeNode}
                type="button"
                onClick={onAddQuestion}
              >
                CHOOSE QUESTION TYPE
              </button>
            </div>
            <span className={styles.questionStem} aria-hidden="true" />
            <button
              className={styles.addNode}
              type="button"
              onClick={onAddQuestion}
            >
              Add more question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
