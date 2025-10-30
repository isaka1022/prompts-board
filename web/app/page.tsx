"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Prompt {
  id: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
  call_count: number;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch prompts whether user is logged in or not
    fetchPrompts();
  }, [user]);

  const fetchPrompts = async () => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Don't add auth token for now - keep it simple
      // Authentication can be added later when properly configured

      console.log("Fetching prompts from:", process.env.NEXT_PUBLIC_MCP_BASE_URL);

      const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_BASE_URL}/prompts`, {
        headers,
        mode: 'cors',
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch prompts: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Fetched prompts:", data.length);
      setPrompts(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show prompts list even without login (removed login gate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Prompts Ranking
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Browse and run your team's AI prompts
          </p>
        </header>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading prompts...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <Link
                key={prompt.id}
                href={`/prompt/${prompt.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 text-center">
                    <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                      #{index + 1}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {prompt.call_count || 0} calls
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                      {prompt.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {prompt.body}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>By {prompt.author}</span>
                      <span>{new Date(prompt.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && prompts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No prompts found. Create one to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
