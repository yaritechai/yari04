import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ParagonConnectModal } from "./ParagonConnectModal";
import { useEffect } from "react";

export function IntegrationsPanel({ onClose }: { onClose: () => void }) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyResponse, setProxyResponse] = useState<any>(null);
  const user = useQuery(api.auth.loggedInUser);
  const integrations = useQuery(api.integrations.list) || [];
  const removeIntegration = useMutation(api.integrations.remove);
  const pdStatus = useQuery(api.pipedream.getStatus);
  const savePDCreds = useMutation(api.pipedream.saveCredentials);
  const createConnectToken = useMutation(api.pipedream.createConnectToken);
  const listConnectAccounts = useMutation(api.pipedream.listConnectAccounts);
  const proxyRequest = useMutation(api.pipedream.proxyRequest);

  const handleRemoveIntegration = async (integrationId: string) => {
    if (confirm("Are you sure you want to remove this integration?")) {
      await removeIntegration({ integrationId: integrationId as any });
    }
  };

  const getIntegrationIcon = (type: string) => {
    const icons: Record<string, string> = {
      slack: "💬",
      gmail: "📧",
      notion: "📝",
      github: "🐙",
      trello: "📋",
      asana: "✅",
      salesforce: "☁️",
      hubspot: "🎯",
      zoom: "📹",
      calendar: "📅",
      drive: "📁",
      dropbox: "📦",
    };
    return icons[type] || "🔗";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Integrations</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1a3 3 0 105.656-5.656l-1.1-1.102zM9 12l6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations Connected</h3>
              <p className="text-gray-600 mb-6">
                Connect your favorite apps to enhance your AI assistant with real-time data and actions.
              </p>
              <button
                onClick={() => setShowConnectModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Connect Your First App
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium">Connected Apps</h3>
                  <p className="text-sm text-gray-600">
                    Manage your connected integrations
                  </p>
                </div>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add Integration
                </button>
              </div>

              {/* Quick-connect for Pipedream via API key */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Pipedream</div>
                    <div className="text-sm text-gray-600">Connect using a REST API key to manage workflows</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${pdStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {pdStatus?.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                {!pdStatus?.connected && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget as HTMLFormElement & { apiKey: { value: string }, orgId: { value: string } };
                      await savePDCreds({ apiKey: form.apiKey.value.trim(), orgId: form.orgId.value.trim() || undefined as any });
                    }}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <input name="apiKey" placeholder="API Key" className="border rounded px-3 py-2 sm:col-span-2" required />
                    <input name="orgId" placeholder="Org ID (optional)" className="border rounded px-3 py-2" />
                    <button className="bg-black text-white px-3 py-2 rounded sm:col-span-1" type="submit">Connect</button>
                  </form>
                )}
                <div className="pt-2 border-t mt-2">
                  <div className="text-sm text-gray-600 mb-2">Or connect via Pipedream Connect OAuth (recommended)</div>
                  <button
                    onClick={async () => {
                      try {
                        const { connect_link_url } = await createConnectToken({ externalUserId: (user?._id as any) || 'current-user', allowedOrigins: [window.location.origin] });
                        // Show popup (window.open) for Pipedream Connect Link
                        window.open(connect_link_url, 'pipedream-connect', 'width=520,height=700');
                      } catch (err) {
                        console.error('Connect OAuth init failed', err);
                      }
                    }}
                    className="px-3 py-2 rounded bg-indigo-600 text-white"
                  >
                    Connect an App (Popup)
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <div
                    key={integration._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                        {getIntegrationIcon(integration.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        {integration.description && (
                          <p className="text-sm text-gray-600">{integration.description}</p>
                        )}
                        {integration.metadata?.accountName && (
                          <p className="text-xs text-gray-500">
                            Connected as: {integration.metadata.accountName}
                          </p>
                        )}
                        {integration.metadata?.lastSyncAt && (
                          <p className="text-xs text-gray-500">
                            Last synced: {new Date(integration.metadata.lastSyncAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${integration.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className={`text-xs font-medium ${integration.isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                        {integration.isEnabled ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleRemoveIntegration(integration._id)}
                        className="ml-4 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove integration"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected accounts (Pipedream Connect) */}
              <div className="mt-6 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Pipedream Connected Accounts</h4>
                    <p className="text-sm text-gray-600">List accounts connected via Connect OAuth</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setIsLoadingAccounts(true);
                        const resp: any = await listConnectAccounts({ externalUserId: user?._id as any });
                        setAccounts(resp?.data?.accounts || []);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsLoadingAccounts(false);
                      }
                    }}
                    className="px-3 py-2 rounded bg-gray-900 text-white"
                  >
                    {isLoadingAccounts ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
                {accounts.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2 border">App</th>
                          <th className="text-left p-2 border">Account ID</th>
                          <th className="text-left p-2 border">Healthy</th>
                          <th className="text-left p-2 border">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((a: any) => (
                          <tr key={a.id} className="border-t">
                            <td className="p-2 border">{a.app?.name || a.app?.name_slug || '—'}</td>
                            <td className="p-2 border font-mono">{a.id}</td>
                            <td className="p-2 border">{a.healthy ? '✅' : '⚠️'}</td>
                            <td className="p-2 border">{a.updated_at ? new Date(a.updated_at).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mt-2">No accounts loaded yet.</div>
                )}

                {/* Simple proxy tester */}
                <form
                  className="mt-3 grid gap-2 sm:grid-cols-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement & {
                      externalUserId: { value: string };
                      accountId: { value: string };
                      url: { value: string };
                      method: { value: string };
                      body: { value: string };
                    };
                    const body = form.body.value.trim() ? JSON.parse(form.body.value) : undefined;
                    try {
                      setProxyLoading(true);
                      setProxyResponse(null);
                      const resp = await proxyRequest({
                        externalUserId: (user?._id as any) || 'current-user',
                        accountId: form.accountId.value.trim(),
                        url: form.url.value.trim(),
                        method: form.method.value.trim() || 'GET',
                        body,
                      } as any);
                      setProxyResponse(resp);
                    } catch (err) {
                      setProxyResponse({ error: String(err) });
                    } finally {
                      setProxyLoading(false);
                    }
                  }}
                >
                  <input name="externalUserId" placeholder="External User ID" className="border rounded px-3 py-2" />
                  <input name="accountId" placeholder="Account ID (apn_...)" className="border rounded px-3 py-2" required />
                  <input name="url" placeholder="https://slack.com/api/auth.test or /api/chat.postMessage" className="border rounded px-3 py-2 sm:col-span-2" required />
                  <input name="method" placeholder="GET or POST" className="border rounded px-3 py-2" />
                  <input name="body" placeholder='JSON body (optional)' className="border rounded px-3 py-2 sm:col-span-3" />
                  <button type="submit" className="px-3 py-2 rounded bg-indigo-600 text-white sm:col-span-1" disabled={proxyLoading}>{proxyLoading ? 'Sending…' : 'Send Proxy'}</button>
                </form>
                {proxyResponse && (
                  <div className="mt-3 p-3 bg-gray-50 border rounded">
                    <pre className="text-xs overflow-auto">
{JSON.stringify(proxyResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showConnectModal && user && (
        <ParagonConnectModal
          onClose={() => setShowConnectModal(false)}
          user={user}
        />
      )}
    </div>
  );
}
