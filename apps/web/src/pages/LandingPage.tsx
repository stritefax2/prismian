import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      {/* ─── Nav ─── */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              TeamMem
            </span>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
              <a href="#problem" className="hover:text-gray-900 transition-colors">Why</a>
              <a href="#product" className="hover:text-gray-900 transition-colors">Product</a>
              <a href="#security" className="hover:text-gray-900 transition-colors">Security</a>
              <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Try it free
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Animated gradient blobs */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 overflow-hidden pointer-events-none"
        >
          <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-blue-300/40 to-cyan-300/20 blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
          <div className="absolute top-32 -right-32 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/10 blur-3xl animate-[pulse_14s_ease-in-out_infinite]" />
          <div className="absolute -bottom-24 left-1/3 w-[440px] h-[440px] rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-200/10 blur-3xl animate-[pulse_16s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0)_0%,rgba(255,255,255,0.6)_60%,rgba(255,255,255,1)_100%)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-6 shadow-sm">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-blue-500 opacity-60 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-blue-500" />
            </span>
            Postgres connector in beta · Sheets &amp; Notion next
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-[1.05]">
            Give every AI tool
            <br />
            on your team{" "}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              safe access to your data
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Connect Postgres once. Claude, Cursor, ChatGPT, and every other
            MCP-compatible tool on your team gets scoped, audited, column-level
            redacted read access.{" "}
            <span className="text-gray-900 font-medium">
              No pasting schemas into chat. No shared prod passwords.
            </span>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-gray-900 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 hover:shadow-xl hover:shadow-gray-900/20"
            >
              Connect your database — free
            </Link>
            <a
              href="#product"
              className="w-full sm:w-auto text-gray-700 px-8 py-3.5 rounded-xl text-sm font-medium hover:text-gray-900 bg-white/80 backdrop-blur border border-gray-200 hover:border-gray-300 transition-all"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-xs text-gray-500">
            Read-only connections · Credentials encrypted at rest · Agents
            never write to your source DB
          </p>
        </div>
      </section>

      {/* ─── Works with strip ─── */}
      <section className="pb-12 -mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider mb-5">
            Works with every MCP-compatible AI tool
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-gray-500">
            {[
              "Claude Desktop",
              "Cursor",
              "ChatGPT",
              "Windsurf",
              "Cline",
              "Custom agents",
            ].map((tool) => (
              <span
                key={tool}
                className="text-sm font-medium hover:text-gray-800 transition-colors"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product mock ─── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gray-950 rounded-2xl p-1.5 shadow-2xl shadow-gray-900/20">
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                  <div className="w-3 h-3 rounded-full bg-gray-700" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-md">
                    app.teammem.dev
                  </span>
                </div>
              </div>
              {/* Simulated app content */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold text-sm">Acme Corp</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      Supabase Prod · synced 2m ago
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs bg-purple-900/50 text-purple-400 px-2.5 py-1 rounded-lg font-medium">
                      Sync now
                    </span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-lg">
                      Settings
                    </span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      name: "customers",
                      sub: "public.customers",
                      count: 4823,
                      synced: true,
                    },
                    {
                      name: "orders",
                      sub: "public.orders",
                      count: 18204,
                      synced: true,
                    },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="bg-gray-800/60 rounded-lg p-4 border border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        {c.synced ? (
                          <span className="text-[10px] bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded-full">
                            synced
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">
                            native
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{c.sub}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {c.count.toLocaleString()} rows
                      </p>
                    </div>
                  ))}
                </div>
                {/* Fake activity feed */}
                <div className="text-xs space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-[8px] font-bold">
                      A
                    </span>
                    <span>
                      <span className="text-purple-400">Cursor</span> queried{" "}
                      <span className="text-gray-300">customers</span> where
                      status='churned'
                    </span>
                    <span className="text-gray-600 ml-auto">2m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-[8px] font-bold">
                      A
                    </span>
                    <span>
                      <span className="text-purple-400">Claude Desktop</span>{" "}
                      read 12 rows from{" "}
                      <span className="text-gray-300">orders</span>
                    </span>
                    <span className="text-gray-600 ml-auto">15m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span className="w-4 h-4 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-[8px] font-bold">
                      S
                    </span>
                    <span>
                      <span className="text-gray-300">Sarah</span> redacted{" "}
                      <span className="text-gray-300">credit_card_last4</span>{" "}
                      from sales-agent key
                    </span>
                    <span className="text-gray-600 ml-auto">1h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section id="problem" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center leading-tight">
            Your AI tools can't see your data.
            <br />
            <span className="text-gray-400">So you keep pasting it into chat.</span>
          </h2>
          <p className="mt-6 text-lg text-gray-500 text-center max-w-2xl mx-auto">
            Every AI conversation starts blind. Your Cursor doesn't know your
            customers. Your Claude has never seen your orders table. The only
            workarounds are bad: paste rows in by hand, hand out a read-only
            prod password, or build your own MCP server.
          </p>

          <div className="mt-16 grid sm:grid-cols-2 gap-6">
            {/* Before */}
            <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs">
                  &times;
                </span>
                <span className="text-sm font-semibold text-red-600">
                  Without TeamMem
                </span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-0.5 shrink-0">--</span>
                  "Let me paste the customer list into this chat again..."
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-0.5 shrink-0">--</span>
                  Shared read-only DB password in 4 team members' MCP configs
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-0.5 shrink-0">--</span>
                  Sales agent can see every column including revenue and PII
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-0.5 shrink-0">--</span>
                  No audit trail of what AI agents read or when
                </li>
              </ul>
            </div>

            {/* After */}
            <div className="bg-white rounded-2xl p-6 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                  &check;
                </span>
                <span className="text-sm font-semibold text-green-600">
                  With TeamMem
                </span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  Connect Postgres once — every agent on the team reads through
                  TeamMem
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  DB credentials encrypted, never shared with agents or users
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  Per-agent, per-column redaction. Sales agent sees{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">email</code>{" "}
                  but not{" "}
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    credit_card_last4
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  Full audit trail: which agent read which row, when
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Agent conversation mock — the payoff moment ─── */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
        >
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-200/30 to-violet-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              This is what changes
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              When your AI can actually see your data, your questions stop
              being hypothetical.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            {/* The chat */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-900/5 overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                </div>
                <span className="ml-3 text-xs text-gray-500">
                  Claude · connected to{" "}
                  <span className="text-blue-600 font-medium">
                    teammem (acme-corp)
                  </span>
                </span>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4 text-sm">
                {/* User */}
                <div className="flex gap-3 justify-end">
                  <div className="max-w-md bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                    Which enterprise customers flagged pricing concerns this
                    quarter? What did we decide about them?
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium shrink-0">
                    S
                  </div>
                </div>

                {/* Tool call */}
                <div className="ml-10 space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Called{" "}
                    <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      query_structured
                    </code>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-3 text-[11px] text-gray-300 font-mono leading-relaxed">
                    <span className="text-gray-500">{`{`}</span>
                    <br />
                    <span className="ml-3">
                      <span className="text-violet-400">"collection"</span>:{" "}
                      <span className="text-emerald-400">"customers"</span>,
                    </span>
                    <br />
                    <span className="ml-3">
                      <span className="text-violet-400">"filters"</span>: [
                    </span>
                    <br />
                    <span className="ml-6 text-gray-400">
                      {`{ field: "plan", op: "eq", value: "enterprise" }`},
                    </span>
                    <br />
                    <span className="ml-6 text-gray-400">
                      {`{ field: "status", op: "eq", value: "at_risk" }`}
                    </span>
                    <br />
                    <span className="ml-3">]</span>
                    <br />
                    <span className="text-gray-500">{`}`}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    Returned 4 rows · <span>216ms</span>
                  </div>
                </div>

                {/* Agent response */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-300 to-pink-300 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    C
                  </div>
                  <div className="max-w-md bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
                    <p>
                      Four enterprise customers are flagged{" "}
                      <code className="bg-white/80 px-1 rounded text-xs">
                        at_risk
                      </code>{" "}
                      right now:
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>
                          <span className="font-medium">Northwind</span> —
                          pricing pushback, renewal Q3{" "}
                          <span className="text-blue-600 underline underline-offset-2 cursor-pointer">
                            customers#8a91
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>
                          <span className="font-medium">Contoso</span> —
                          requested tiered pricing{" "}
                          <span className="text-blue-600 underline underline-offset-2 cursor-pointer">
                            customers#22e3
                          </span>
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">·</span>
                        <span>+ 2 more</span>
                      </li>
                    </ul>
                    <div className="pt-1.5 border-t border-gray-200 text-xs text-gray-600">
                      <p>
                        Want me to pull their recent orders and account
                        health score too?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input stub */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Ask anything...</span>
                    <span className="ml-auto text-[10px]">⌘ ⏎</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side explainer */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-3">
                  What just happened
                </div>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Claude saw your <code className="text-xs bg-gray-100 px-1 rounded">customers</code>{" "}
                      collection was available via MCP.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      It queried your synced snapshot with a typed filter —
                      not your prod DB. Denied columns never made it into
                      the response.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Every row is clickable; Sarah can verify exactly what
                      Claude saw. Every query is audited.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
                  Without TeamMem
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  "Let me export a CSV from the admin panel, paste the first
                  50 rows into Claude, paste the meeting notes separately,
                  and hope it doesn't hallucinate."
                </p>
                <p className="text-xs text-gray-500 mt-3 italic">
                  — Every growth-stage team, twice a week
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Product / How it works ─── */}
      <section id="product" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Three steps. Five minutes. Then every AI on your team has safe
              access to the same data.
            </p>
          </div>

          <div className="space-y-20">
            {/* Step 1 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Connect your database
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Paste a read-only Postgres connection string. TeamMem
                  introspects the schema, you pick which tables to expose, and
                  pick which columns each table should share. Everything else
                  stays invisible. Initial sync runs in seconds.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Postgres",
                    "Supabase",
                    "Neon",
                    "RDS",
                    "Sheets (soon)",
                    "Notion (soon)",
                  ].map((src) => (
                    <span
                      key={src}
                      className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-950 rounded-2xl p-5">
                <div className="text-xs text-gray-500 mb-2">Connection</div>
                <div className="bg-gray-900 rounded-lg px-3 py-2 mb-4 font-mono text-xs text-gray-300 truncate">
                  postgres://readonly:••••@db.supabase.co:5432/prod
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  Tables (5 of 42 selected)
                </div>
                <div className="space-y-1.5">
                  {[
                    { name: "public.customers", cols: "8 of 12 columns" },
                    { name: "public.orders", cols: "6 of 9 columns" },
                    { name: "public.products", cols: "all columns" },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-gray-800"
                    >
                      <code className="text-xs text-gray-300 font-mono">
                        {t.name}
                      </code>
                      <span className="text-[10px] text-gray-500">
                        {t.cols}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div className="order-2 sm:order-1 bg-gray-950 rounded-2xl p-5">
                <pre className="text-sm text-gray-300 overflow-x-auto leading-relaxed">
{`{
  "mcpServers": {
    "teammem": {
      "command": "npx",
      "args": ["-y", "teammem-mcp"],
      "env": {`}
                  <span className="text-green-400">{`
        "TEAMMEM_API_KEY": "tm_sk_a1b2..."`}</span>{`,`}
                  <span className="text-blue-400">{`
        "TEAMMEM_WORKSPACE": "ws_x9y8..."`}</span>
{`
      }
    }
  }
}`}
                </pre>
              </div>
              <div className="order-1 sm:order-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Give each AI tool a scoped key
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate a per-agent key. Pick which tables it can read and
                  which columns to hide from it. Paste the MCP config into
                  Claude Desktop, Cursor, or any MCP-compatible tool. Your sales
                  agent, your CI bot, and your intern's Claude each get
                  different slices of the same connection.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Claude", "Cursor", "ChatGPT", "Custom agents"].map(
                    (tool) => (
                      <span
                        key={tool}
                        className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        {tool}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid sm:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Every AI tool reads the same data
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Your Cursor queries customers. Your Claude checks orders.
                  ChatGPT searches products. All from the same live, synced,
                  permissioned view. When a row changes in your source DB, the
                  next sync (every 15 minutes, or manual) pushes it out to
                  every agent.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    A
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Sarah's Cursor</span> asks
                      "which customers churned this quarter?"
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      2:00 PM — queries <code>customers</code> via TeamMem
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    A
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Mike's Claude</span> reads
                      the same rows and cross-references <code>orders</code>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      3:15 PM — same connection, zero setup for Mike
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    J
                  </span>
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Jamie</span> opens the audit
                      log — sees every query, by which agent, on which row
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      4:00 PM — full trail, no surprises
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Multi-source ─── */}
      <section className="py-20 sm:py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              One connection for every source
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Postgres is just the start. The same permission model,
              audit trail, and column redaction applies to every source you
              connect — and they all become one surface your agents query.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              {
                name: "Postgres",
                sub: "Supabase, Neon, RDS, plain PG",
                status: "beta",
              },
              {
                name: "Google Sheets",
                sub: "Any shared spreadsheet",
                status: "next",
              },
              {
                name: "Notion",
                sub: "Databases + docs",
                status: "next",
              },
              {
                name: "Linear",
                sub: "Issues, projects, cycles",
                status: "planned",
              },
              {
                name: "Airtable",
                sub: "Bases + views",
                status: "planned",
              },
              {
                name: "MySQL / MariaDB",
                sub: "Drop-in Postgres sibling",
                status: "planned",
              },
              {
                name: "BigQuery",
                sub: "Read-only analytics access",
                status: "planned",
              },
              {
                name: "+ MCP servers",
                sub: "Wrap any vendor's MCP",
                status: "vision",
              },
            ].map((src) => (
              <div
                key={src.name}
                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1.5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 text-sm truncate">
                    {src.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      src.status === "beta"
                        ? "bg-blue-100 text-blue-700"
                        : src.status === "next"
                          ? "bg-violet-100 text-violet-700"
                          : src.status === "planned"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {src.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{src.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                One connection, many agents
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Connect once per source. Every teammate's AI tool reads
                from the same synced snapshot, each with its own scoped key.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Same permission model everywhere
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Column redaction, audit trail, rate limits — applied
                uniformly whether the source is Postgres, Sheets, or
                Notion. One policy surface, not six.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Cross-source queries
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Ask *"which enterprise customers mentioned pricing in
                Slack last week?"* — one question, two sources, one
                answer. Agents don't need to know where data lives.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 max-w-2xl mx-auto">
            As more vendors ship their own MCP servers, TeamMem wraps them
            with your team's identity, scope, and audit layer — so you get
            a new source without waiting for us to build a connector.
          </p>
        </div>
      </section>

      {/* ─── Inside TeamMem: the synced view ─── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Your data, the way each agent should see it
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Same source table. Different views. Column-level redaction is
              enforced before a single byte leaves the API.
            </p>
          </div>

          {/* Table mock */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Banner */}
            <div className="flex items-center justify-between gap-4 px-5 py-3 bg-blue-50/70 border-b border-blue-100">
              <div className="min-w-0 flex items-center gap-2 text-sm">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Read-only
                </span>
                <span className="text-blue-900 truncate">
                  Synced from{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono">
                    public.customers
                  </code>
                  <span className="hidden sm:inline text-blue-700">
                    {" "}
                    · last synced 2m ago · 4,823 rows
                  </span>
                </span>
              </div>
              <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 cursor-default">
                Sync now
              </button>
            </div>

            {/* View selector */}
            <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
              <span className="text-gray-500 mr-1">Showing as:</span>
              <span className="bg-white text-gray-800 border border-gray-300 px-2.5 py-1 rounded-md font-medium">
                Sales agent
              </span>
              <span className="text-gray-400 px-2.5 py-1">CS agent</span>
              <span className="text-gray-400 px-2.5 py-1">Internal dashboard</span>
              <span className="ml-auto text-gray-400 hidden sm:inline">
                2 columns redacted for this key
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      id
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      email
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      plan
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                      status
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-400 text-xs uppercase tracking-wide bg-gray-100/80">
                      <span className="inline-flex items-center gap-1">
                        mrr
                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                          redacted
                        </span>
                      </span>
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-400 text-xs uppercase tracking-wide bg-gray-100/80">
                      <span className="inline-flex items-center gap-1">
                        credit_card_last4
                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                          redacted
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      id: "cust_8a91",
                      email: "ana@northwind.io",
                      plan: "enterprise",
                      status: "active",
                    },
                    {
                      id: "cust_bf04",
                      email: "jordan@acme.co",
                      plan: "team",
                      status: "active",
                    },
                    {
                      id: "cust_22e3",
                      email: "sam@contoso.com",
                      plan: "enterprise",
                      status: "at_risk",
                    },
                    {
                      id: "cust_9c7d",
                      email: "priya@initech.io",
                      plan: "team",
                      status: "churned",
                    },
                    {
                      id: "cust_510a",
                      email: "leo@globex.com",
                      plan: "solo",
                      status: "active",
                    },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">
                        {row.id}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">{row.email}</td>
                      <td className="px-4 py-2.5 text-gray-800">{row.plan}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            row.status === "active"
                              ? "bg-green-100 text-green-700"
                              : row.status === "at_risk"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 bg-gray-100/50">
                        <span className="inline-block bg-gray-200 text-transparent select-none rounded text-xs px-2 font-mono">
                          ██████
                        </span>
                      </td>
                      <td className="px-4 py-2.5 bg-gray-100/50">
                        <span className="inline-block bg-gray-200 text-transparent select-none rounded text-xs px-2 font-mono">
                          ████
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation cards */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Mirrored, not proxied
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                We snapshot your selected columns into our DB on each sync.
                Agent queries hit our snapshot, not your prod — zero query
                load.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Redaction per agent
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sales key sees <code className="bg-gray-100 px-1 rounded">email</code>,
                not <code className="bg-gray-100 px-1 rounded">mrr</code>. CS
                key sees <code className="bg-gray-100 px-1 rounded">mrr</code>,
                not <code className="bg-gray-100 px-1 rounded">credit_card_last4</code>.
                Same collection, different views.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-900 mb-1">
                Agents never mutate
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Writes to synced collections return <code className="bg-gray-100 px-1 rounded">409 read_only_source</code>.
                Structural, not policy — a permissions bug can't route
                around it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security ─── */}
      <section id="security" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              Built for teams giving AI access to real data
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Because "give Claude your prod password" is not a security model.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "Read-only by construction",
                desc: "Agents cannot write to your source database. Ever. Connected collections reject all writes at the API layer — not just via permissions, but as a structural invariant.",
              },
              {
                title: "Per-agent column redaction",
                desc: "Your sales agent sees customers.email but not customers.credit_card_last4. Your CI bot sees orders.status but not orders.total_revenue. Configured per key, enforced before data leaves the API.",
              },
              {
                title: "Encrypted credentials",
                desc: "Your DB connection string is AES-GCM encrypted at rest. Agents never see it. Team members never see it. Rotate or revoke any time without re-connecting tools.",
              },
              {
                title: "Full audit trail",
                desc: "Every read, every query, every agent — logged with row IDs and timestamps. Reviewable in the UI or via API. Compliance-ready from day one.",
              },
              {
                title: "Rate limiting per agent",
                desc: "Cap queries per hour per key. Prevent a runaway agent from ETLing your whole customers table into a chat window.",
              },
              {
                title: "Scoped, revocable keys",
                desc: "Each AI tool gets its own key with its own scope. Revoke instantly when a contractor offboards or a laptop walks off — without rotating your actual DB password.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-5 border border-gray-100"
              >
                <h3 className="font-semibold text-gray-900 text-sm">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Agent capabilities ─── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              What your agents get
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Six read tools, wired automatically. Works with any
              MCP-compatible AI tool.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                tool: "list_collections",
                desc: "Discover what tables and column schemas are exposed",
                example: "Called first in every conversation",
              },
              {
                tool: "query_structured",
                desc: "Filter and sort rows by exact field values",
                example: "customers where mrr > 1000 and status = 'active'",
              },
              {
                tool: "aggregate",
                desc: "Count, sum, avg, group_by — safe analytics, not raw SQL",
                example: "Total MRR by plan, top 5 customers by deal size",
              },
              {
                tool: "search",
                desc: "Semantic + full-text search over prose columns",
                example: "\"customers mentioning pricing pushback\"",
              },
              {
                tool: "read_entry",
                desc: "Read one full row by ID",
                example: "Fetch Acme's full customer record",
              },
              {
                tool: "workspace_info",
                desc: "One-shot overview: name, collections, sync freshness, schemas",
                example: "Orient at the start of a session",
              },
            ].map((item) => (
              <div
                key={item.tool}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
                  {item.tool}
                </code>
                <p className="text-sm font-medium text-gray-900 mt-2.5">
                  {item.desc}
                </p>
                <p className="text-xs text-gray-400 mt-1.5 italic">
                  {item.example}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-gray-400 max-w-xl mx-auto">
            Plus <code className="bg-gray-100 text-gray-600 px-1 rounded">write_entry</code> and{" "}
            <code className="bg-gray-100 text-gray-600 px-1 rounded">update_entry</code>{" "}
            for agents that need to persist observations back to scoped
            writable collections. Never writes to your source DB.
          </p>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why not just...
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Give agents a read-only Postgres password?",
                a: "That's 4 config files in 4 developers' machines, each with your DB password in plaintext. No per-agent scopes, no column-level redaction, no audit of which agent read what. And you rotate that password every time someone leaves.",
              },
              {
                q: "Just use a Postgres MCP server?",
                a: "You could — and they exist. But they're single-user, no-auth, no-redaction, no-audit. TeamMem is what you get when you wrap one in identity, scoped keys, field-level ACLs, and a team UI. Also: native collections for agent-generated knowledge. Plain MCP servers can't do that.",
              },
              {
                q: "Notion / Confluence?",
                a: "They store knowledge for humans. Your AI agents can't natively query your Postgres through them. And you're still hand-pasting data between the two.",
              },
              {
                q: "Build our own with Postgres + pgvector?",
                a: "You could — and many teams do, for about two weeks, until they hit agent keys, field-level ACLs, audit trail, sync state, optimistic locking, and encryption-at-rest. TeamMem is what you'd build. We built it so you don't have to.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="bg-white rounded-xl p-6 border border-gray-200"
              >
                <h3 className="font-semibold text-gray-900">{item.q}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 sm:py-28 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple pricing
          </h2>
          <p className="text-gray-500 mb-12">
            Free while we're in beta. We'll add paid tiers when you need them.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-900 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg">Free</h3>
              <p className="mt-1 text-sm text-gray-500">
                For small teams getting started
              </p>
              <p className="mt-4 text-4xl font-bold text-gray-900">$0</p>
              <ul className="mt-6 text-sm text-gray-600 space-y-3 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  Up to 5 team members
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  1 Postgres connection · unlimited tables
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  Full audit trail + scoped writable collections for agent
                  output
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  5 scoped agent keys
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500 font-bold">+</span>
                  15-minute sync · MCP (stdio + SSE)
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-8 block w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">Team</h3>
              <p className="mt-1 text-sm text-gray-500">For growing teams</p>
              <p className="mt-4 text-4xl font-bold text-gray-400">Soon</p>
              <ul className="mt-6 text-sm text-gray-600 space-y-3 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Unlimited members &amp; agent keys
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Multiple data sources · Sheets, Notion, Linear
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  1-minute sync · priority embedding queue
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  Advanced audit &amp; anomaly alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-300 font-bold">+</span>
                  SSO / SAML
                </li>
              </ul>
              <button
                disabled
                className="mt-8 block w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-medium cursor-not-allowed"
              >
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 bg-gray-950 text-white overflow-hidden">
        {/* Gradient glow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 pointer-events-none"
        >
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full bg-gradient-to-br from-fuchsia-500/15 to-pink-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Stats band */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-14 mb-12 border-b border-gray-800/80">
            {[
              { label: "MCP tools included", value: "8" },
              { label: "Default sync interval", value: "15 min" },
              { label: "Agent writes to source DB", value: "0" },
              { label: "Time to first query", value: "~5 min" },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
              Stop pasting rows into chat.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Connect your database instead.
              </span>
            </h2>
            <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto">
              The AI-safe access layer for your team's data. Permissioned,
              audited, column-redacted, live-synced. Every AI tool on your
              team reading the same source of truth — each with its own
              scope.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-white text-gray-900 px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all shadow-xl shadow-white/10"
              >
                Connect your database — free
              </Link>
              <a
                href="#product"
                className="w-full sm:w-auto text-gray-300 px-8 py-3.5 rounded-xl text-sm font-medium hover:text-white border border-gray-700 hover:border-gray-500 transition-all"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-xs text-gray-500">
              No credit card · Connects in 10 minutes · Works with any
              MCP-compatible AI
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 border-t border-gray-800 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-lg font-bold text-white">TeamMem</span>
              <p className="text-xs text-gray-500 mt-1">
                AI-safe access layer for your team's data.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#product" className="hover:text-gray-300 transition-colors">Product</a>
              <a href="#security" className="hover:text-gray-300 transition-colors">Security</a>
              <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
              <Link to="/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-600 text-center">
            &copy; {new Date().getFullYear()} TeamMem. Built with Postgres,
            pgvector, and the MCP protocol.
          </div>
        </div>
      </footer>
    </div>
  );
}
