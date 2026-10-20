type FilterSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
};

export default function FilterSelect({
  value,
  options,
  onChange,
  className = "",
}: FilterSelectProps) {
  return (
    <label
      className={`flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 ${className}`}
    >
      <select
        aria-label="Filter"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-xs outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
