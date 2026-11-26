import type { ChecklistCategory, ChecklistItem, Comment } from '../types/domain';

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  low: 'Низ и бас',
  vocal: 'Вокал',
  highs: 'Верха',
  dynamics: 'Динамика и громкость',
  space: 'Пространство',
  other: 'Прочее',
};

const RULES: readonly { category: ChecklistCategory; pattern: RegExp }[] = [
  { category: 'low', pattern: /бас|бочк|\bнизк?|\bниз(а|у|е|ом)?\b|суб|гул|бубн|808|kick/i },
  { category: 'vocal', pattern: /вокал|голос|дикци|сибил|шипящ/i },
  { category: 'highs', pattern: /верх|хэт|хет|тарел|ярк|резк|воздух|высок|шипит/i },
  { category: 'dynamics', pattern: /громк|тише|громче|компресс|динамик|лимит|уровень|пик|клип/i },
  { category: 'space', pattern: /ревер|дилей|delay|эхо|панорам|стерео|широк|глубин|пространств/i },
];

export function categorize(text: string): ChecklistCategory {
  return RULES.find((rule) => rule.pattern.test(text))?.category ?? 'other';
}

const MERGE_WINDOW_SEC = 8;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function buildChecklist(comments: readonly Comment[]): ChecklistItem[] {
  const open = comments.filter((c) => !c.resolved).sort((a, b) => a.timeSec - b.timeSec);
  const items: ChecklistItem[] = [];

  for (const comment of open) {
    const category = categorize(comment.text);
    const previous = [...items]
      .reverse()
      .find(
        (item) => item.category === category && comment.timeSec - item.timeSec <= MERGE_WINDOW_SEC,
      );

    if (previous) {
      previous.commentIds.push(comment.id);
      previous.text = `${previous.text.replace(/\.$/, '')}; ${comment.text.trim()}`;
    } else {
      items.push({
        id: `cl-${category}-${comment.id}`,
        category,
        text: capitalize(comment.text.trim()),
        commentIds: [comment.id],
        timeSec: comment.timeSec,
        done: false,
      });
    }
  }

  const order = Object.keys(CATEGORY_LABELS);
  return items.sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.timeSec - b.timeSec,
  );
}
