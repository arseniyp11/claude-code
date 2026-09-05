"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Hello World</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="h-10 w-10 rounded-full border border-foreground/20 text-xl leading-none hover:bg-foreground/10"
          aria-label="Decrement"
        >
          −
        </button>
        <span className="w-12 text-center text-2xl font-mono tabular-nums">
          {count}
        </span>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="h-10 w-10 rounded-full border border-foreground/20 text-xl leading-none hover:bg-foreground/10"
          aria-label="Increment"
        >
          +
        </button>
      </div>
    </div>
  );
}
