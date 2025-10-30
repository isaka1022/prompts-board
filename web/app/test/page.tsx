"use client";

import { useEffect, useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFetch = async () => {
      try {
        console.log("Testing fetch to:", process.env.NEXT_PUBLIC_MCP_BASE_URL);

        const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_BASE_URL}/prompts`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("Data received:", data);
        setResult(data);
      } catch (err) {
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    testFetch();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>

      <div className="mb-4">
        <strong>MCP URL:</strong> {process.env.NEXT_PUBLIC_MCP_BASE_URL}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Success! Found {result.length} prompts:</strong>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {!error && !result && (
        <div>Loading...</div>
      )}
    </div>
  );
}
