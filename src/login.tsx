import { Action, ActionPanel, Detail, showToast, Toast, open, popToRoot } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { AuthError, AuthErrorHandler, AuthErrorType } from "./lib/auth-errors";
import { withAuthRetry } from "./lib/retry";
import { AuthErrorBoundary } from "./components/AuthErrorBoundary";
import { config } from "./config";

const MCP_BASE_URL = config.mcpBaseUrl;

function LoginComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingToken, setIsProcessingToken] = useState(false);

  // If already authenticated, show user profile
  if (isAuthenticated && user) {
    const userInfo = `# おかえりなさい！

**名前:** ${user.user_metadata?.full_name || user.email}
**メール:** ${user.email}
**最終ログイン:** ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ja-JP') : '不明'}

認証が完了しており、PromptBoardのすべての機能をご利用いただけます。
`;

    return (
      <Detail
        markdown={userInfo}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="プロフィールを表示"
              url="raycast://extensions/your-name/prompt-board/user-profile"
              icon="👤"
            />
            <Action
              title="ログアウト"
              onAction={logout}
              style={Action.Style.Destructive}
              icon="🚪"
            />
            <Action
              title="閉じる"
              onAction={popToRoot}
              shortcut={{ modifiers: ["cmd"], key: "w" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Generate OAuth URL for Raycast
  const generateAuthUrl = async () => {
    setIsGeneratingUrl(true);
    setError(null);

    try {
      const result = await withAuthRetry(async () => {
        const response = await fetch(`${MCP_BASE_URL}/auth/login?platform=raycast`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to generate login URL: ${response.statusText}`);
        }

        const data = await response.json() as { url: string };
        return data.url;
      });

      if (result.success) {
        setAuthUrl(result.data!);
      } else {
        const authError = await AuthErrorHandler.handleError(result.error!, { operation: 'generateAuthUrl' });
        setError(authError.userMessage);
      }
    } catch (error) {
      const authError = await AuthErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'generateAuthUrl' }
      );
      setError(authError.userMessage);
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  // Handle OAuth login
  const handleLogin = async () => {
    if (!authUrl) {
      await generateAuthUrl();
      return;
    }

    try {
      await open(authUrl);
      
      await showToast({
        style: Toast.Style.Success,
        title: "ブラウザを開いています",
        message: "ブラウザでログインを完了してから、Raycastに戻ってください",
      });

      // Start checking for authentication after a short delay
      setTimeout(() => {
        checkAuthStatus();
      }, 3000);
    } catch (error) {
      const authError = new AuthError({
        type: AuthErrorType.OAUTH_FAILED,
        message: error instanceof Error ? error.message : "Failed to open browser",
        userMessage: "ログインページを開けませんでした。もう一度お試しください。",
        retryable: true,
        requiresReauth: false,
        originalError: error instanceof Error ? error : undefined,
      });
      
      await authError.showToast();
      setError(authError.userMessage);
    }
  };



  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const { refreshAuth } = await import("../hooks/useAuth");
      // Force refresh of auth state to check if login completed
      // This will be handled by the useAuth hook automatically
      await showToast({
        style: Toast.Style.Animated,
        title: "認証状態を確認中...",
      });
    } catch (error) {
      console.error("Error checking auth status:", error);
    }
  };

  useEffect(() => {
    // Generate auth URL on component mount
    generateAuthUrl();
  }, []);

  const loginContent = `# PromptBoard にログイン

${error ? `⚠️ **エラー:** ${error}\n\n` : ''}

PromptBoard へようこそ！開始するには、Googleアカウントで認証する必要があります。

## 次に起こること:

1. 下の「Googleでログイン」をクリック
2. ブラウザでGoogleのログインページが開きます
3. Googleアカウントでサインイン
4. 自動的にログインされます
5. Raycastに戻ってPromptBoardを使い始めましょう

## 利用できる機能:

- **個人プロンプト**: 自分だけのプロンプトライブラリを作成・管理
- **チーム連携**: チームメンバーとプロンプトを共有
- **実行履歴**: プロンプトの使用状況と結果を追跡
- **セキュアアクセス**: プロンプトは保護され、プライベートです

${isLoading ? '🔄 **認証状態を確認中...**' : ''}
${isGeneratingUrl ? '🔄 **ログインURLを生成中...**' : ''}
`;

  return (
    <Detail
      markdown={loginContent}
      actions={
        <ActionPanel>
          <Action
            title="Googleでログイン"
            onAction={handleLogin}
            icon="🔐"
          />
          {authUrl && (
            <Action.CopyToClipboard
              title="ログインURLをコピー"
              content={authUrl}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="更新"
            onAction={generateAuthUrl}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="認証状態を確認"
            onAction={checkAuthStatus}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Wrap the component with error boundary
export default function Login() {
  return (
    <AuthErrorBoundary
      onAuthError={(error) => {
        console.error("Login component auth error:", error);
      }}
      onRetry={() => {
        // Refresh the page/component
        window.location?.reload?.();
      }}
    >
      <LoginComponent />
    </AuthErrorBoundary>
  );
}
