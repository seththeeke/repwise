const QUICK_PROMPTS = [
  'Push day',
  'Pull day',
  'Leg day',
  'Full body',
  '30 min quick',
];

interface QuickPromptChipsProps {
  onSelect: (text: string) => void;
}

export function QuickPromptChips({ onSelect }: QuickPromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {QUICK_PROMPTS.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
