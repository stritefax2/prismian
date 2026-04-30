import { useState } from "react";

export const API_URL_FOR_AGENTS =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (typeof window !== "undefined" &&
  window.location.origin.includes("localhost")
    ? "http://localhost:3001"
    : "");

export function NewKeyPanel({
  rawKey,
  workspaceId,
  onDismiss,
}: {
  rawKey: string;
  workspaceId: string;
  onDismiss?: () => void;
}) {
  const [tool, setTool] = useState<"claude" | "cursor" | "other">("claude");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Format a paste-friendly block for sharing the key with a teammate
  // or external collaborator. Includes the MCP config + setup steps +
  // an explicit "treat as password" line. We deliberately don't email
  // this from the server — email is a bad channel for secrets. Owner
  // copies, pastes into Slack DM / 1Password / Signal / wherever they
  // share secrets in their own org.
  function copyShareMessage() {
    const message = `Here's a Prismian agent key for our workspace.

It gives an MCP-compatible AI tool (Claude Desktop, Cursor, etc.) scoped, audited access to the data we've connected. Treat it like a password — don't share in public channels.

API key:
${rawKey}

Setup for Claude Desktop:
1. Open Claude Desktop → Settings → Developer → Edit Config
2. Paste this config and save:

${config}

3. Restart Claude Desktop. The "prismian" MCP server should now be available.

If you need to revoke or change the key's scope, ping me and I'll do it from the workspace settings.`;

    navigator.clipboard.writeText(message);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  }

  const config = `{
  "mcpServers": {
    "prismian": {
      "command": "npx",
      "args": ["-y", "prismian-mcp"],
      "env": {
        "PRISMIAN_API_KEY": "${rawKey}",
        "PRISMIAN_WORKSPACE": "${workspaceId}"${
          API_URL_FOR_AGENTS
            ? `,
        "PRISMIAN_API_URL": "${API_URL_FOR_AGENTS}"`
            : ""
        }
      }
    }
  }
}`;

  return (
    <div className="bg-white rounded-xl ring-1 ring-emerald-200 overflow-hidden">
      {/* Banner */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-emerald-100 bg-emerald-50/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700">
            key created — copy it now, it won't be shown again
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-emerald-700/60 hover:text-emerald-900 text-base leading-none"
            aria-label="Dismiss"
          >
            &times;
          </button>
        )}
      </div>

      {/* Raw key */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            API key
          </p>
          <button
            onClick={copyShareMessage}
            className="text-[10px] font-mono uppercase tracking-wider text-gray-700 bg-white border border-gray-200 hover:border-gray-300 px-2 py-0.5 rounded transition-colors"
            title="Copy a paste-friendly block for sharing via Slack DM, 1Password, etc."
          >
            {shareCopied ? "✓ share message copied" : "copy share message"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-950 text-emerald-300 px-3 py-2 rounded-md text-sm font-mono select-all break-all">
            {rawKey}
          </code>
          <button
            onClick={() => copy(rawKey)}
            className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-md hover:bg-gray-800 transition-colors shrink-0"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
          Sharing with a teammate or contractor? Paste the share-message
          into a private channel (Slack DM, 1Password share, Signal).
          Don't email it in plaintext or post in public channels.
        </p>
      </div>

      {/* Tool tabs */}
      <div className="border-t border-gray-100">
        <div className="flex gap-px bg-gray-100 px-4 pt-3">
          {(
            [
              { id: "claude", label: "Claude Desktop" },
              { id: "cursor", label: "Cursor" },
              { id: "other", label: "Other MCP tool" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                tool === t.id
                  ? "bg-white text-gray-900 border-x border-t border-gray-200"
                  : "bg-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="px-4 py-4">
          {tool === "claude" && (
            <ol className="text-xs text-gray-600 space-y-1.5 mb-3 leading-relaxed">
              <li>
                <span className="text-gray-400 font-mono mr-1.5">1.</span>
                Open Claude Desktop →{" "}
                <span className="font-medium text-gray-900">Settings</span> →{" "}
                <span className="font-medium text-gray-900">Developer</span> →{" "}
                <span className="font-medium text-gray-900">Edit Config</span>{" "}
                (opens{" "}
                <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">
                  claude_desktop_config.json
                </code>
                )
              </li>
              <li>
                <span className="text-gray-400 font-mono mr-1.5">2.</span>
                Paste the config below into that file and save. If the
                file already has{" "}
                <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">
                  mcpServers
                </code>
                , merge — don't overwrite your other tools.
              </li>
              <li>
                <span className="text-gray-400 font-mono mr-1.5">3.</span>
                Quit Claude Desktop completely (
                <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">
                  ⌘Q
                </code>{" "}
                on Mac — closing the window isn't enough) and reopen
              </li>
            </ol>
          )}
          {tool === "cursor" && (
            <ol className="text-xs text-gray-600 space-y-1.5 mb-3 leading-relaxed">
              <li>
                <span className="text-gray-400 font-mono mr-1.5">1.</span>
                Create{" "}
                <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">
                  .cursor/mcp.json
                </code>{" "}
                in your project root
              </li>
              <li>
                <span className="text-gray-400 font-mono mr-1.5">2.</span>
                Paste the config below and save
              </li>
              <li>
                <span className="text-gray-400 font-mono mr-1.5">3.</span>
                Open Cursor → Settings → MCP — verify{" "}
                <code className="bg-gray-100 px-1 rounded text-gray-800 font-mono">
                  prismian
                </code>{" "}
                shows as connected
              </li>
            </ol>
          )}
          {tool === "other" && (
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Any MCP-compatible tool can connect using the same JSON config —
              or set these as environment variables directly.
            </p>
          )}

          {tool !== "other" ? (
            <div className="bg-gray-950 rounded-md ring-1 ring-gray-900 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  mcp.config.json
                </span>
                <button
                  onClick={() => copy(config)}
                  className="text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-gray-200"
                >
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <pre className="text-[11px] text-gray-300 overflow-x-auto leading-relaxed p-3">
                {config}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-950 rounded-md ring-1 ring-gray-900 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  environment variables
                </span>
              </div>
              <div className="px-3 py-3 space-y-1 text-[12px] font-mono">
                <div>
                  <span className="text-gray-500">PRISMIAN_API_KEY=</span>
                  <span className="text-emerald-300 break-all">{rawKey}</span>
                </div>
                <div>
                  <span className="text-gray-500">PRISMIAN_WORKSPACE=</span>
                  <span className="text-gray-300 break-all">{workspaceId}</span>
                </div>
                {API_URL_FOR_AGENTS && (
                  <div>
                    <span className="text-gray-500">PRISMIAN_API_URL=</span>
                    <span className="text-gray-300 break-all">
                      {API_URL_FOR_AGENTS}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
