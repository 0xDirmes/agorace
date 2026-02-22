"use client";

interface PassageDisplayProps {
  passage: string;
  input: string;
}

export function PassageDisplay({ passage, input }: PassageDisplayProps) {
  return (
    <div
      className="p-8 rounded-xl glass-card w-full select-none"
      onCopy={(e) => e.preventDefault()}
    >
      <p className="font-mono text-xl leading-relaxed tracking-wide">
        {passage.split("").map((char, index) => {
          let className = "char-pending";

          if (index < input.length) {
            className = input[index] === char ? "char-correct" : "char-error";
          } else if (index === input.length) {
            className = "char-current";
          }

          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </p>
    </div>
  );
}
