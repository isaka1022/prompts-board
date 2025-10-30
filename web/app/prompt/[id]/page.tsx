"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Prompt {
  id: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
}

export default function PromptDetail() {
  const params = useParams();
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompt();
  }, [params.id]);

  const fetchPrompt = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_BASE_URL}/prompts`);
      if (!response.ok) throw new Error("Failed to fetch prompts");
      const prompts = await response.json();
      const foundPrompt = prompts.find((p: Prompt) => p.id === params.id);
      if (!foundPrompt) throw new Error("Prompt not found");
      setPrompt(foundPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runPrompt = async () => {
    if (!input.trim() || !prompt) return;

    setRunning(true);
    setOutput("");
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_BASE_URL}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt_id: prompt.id,
          input: input,
        }),
      });

      if (!response.ok) throw new Error("Failed to run prompt");
      const data = await response.json();
      setOutput(data.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (error && !prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Back to prompts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6">
          ← Back to prompts
        </Link>

        {prompt && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {prompt.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <span>By {prompt.author}</span>
                <span>•</span>
                <span>{new Date(prompt.created_at).toLocaleDateString()}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt:
                </h2>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {prompt.body}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Run Prompt
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Input:
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter your input here..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-900 dark:text-white resize-none"
                />
              </div>

              <button
                onClick={runPrompt}
                disabled={!input.trim() || running}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {running ? "Running..." : "Run Prompt"}
              </button>

              {error && (
                <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400">Error: {error}</p>
                </div>
              )}

              {output && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Output:
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono text-sm">
                      {output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
