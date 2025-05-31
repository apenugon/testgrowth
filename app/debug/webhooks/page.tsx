"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, Zap, AlertCircle, CheckCircle } from "lucide-react";

interface WebhookDebugData {
  webhookSubscriptions: any[];
  stores: any[];
  activeContests: any[];
  totals: {
    totalWebhookSubscriptions: number;
    activeWebhookSubscriptions: number;
    totalStores: number;
    storesWithTokens: number;
    activeContests: number;
  };
}

interface TestResult {
  success: boolean;
  webhook?: any;
  error?: string;
  testDetails: any;
}

export default function WebhookDebugPage() {
  const [debugData, setDebugData] = useState<WebhookDebugData | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/webhooks');
      if (response.ok) {
        const data = await response.json();
        setDebugData(data);
      } else {
        console.error('Failed to fetch debug data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
    }
    setLoading(false);
  };

  const testWebhookCreation = async (storeId: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/debug/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, topic: 'orders/create' }),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testDetails: {}
      });
    }
    setTesting(false);
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🕵️ Webhook Debug Center</h1>
            <p className="text-gray-600">Diagnose why Shopify webhooks aren't being delivered</p>
          </div>
          <Button onClick={fetchDebugData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        {debugData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{debugData.totals.totalStores}</div>
                <div className="text-sm text-gray-600">Total Stores</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{debugData.totals.storesWithTokens}</div>
                <div className="text-sm text-gray-600">With Access Tokens</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{debugData.totals.activeContests}</div>
                <div className="text-sm text-gray-600">Active Contests</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{debugData.totals.totalWebhookSubscriptions}</div>
                <div className="text-sm text-gray-600">Total Webhooks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{debugData.totals.activeWebhookSubscriptions}</div>
                <div className="text-sm text-gray-600">Active Webhooks</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stores */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Stores ({debugData.stores.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.stores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No stores found. Users need to connect their Shopify stores first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debugData.stores.map((store: any) => (
                    <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{store.shopDomain}</div>
                        <div className="text-sm text-gray-600">{store.userEmail}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={store.hasAccessToken ? "default" : "destructive"}>
                            {store.hasAccessToken ? "Has Token" : "No Token"}
                          </Badge>
                          {store.hasAccessToken && (
                            <Badge variant="outline">
                              Token: {store.accessTokenLength} chars
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => testWebhookCreation(store.id)}
                        disabled={!store.hasAccessToken || testing}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Test Webhook
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Contests */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle>Active Contests ({debugData.activeContests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.activeContests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No active contests. Webhooks are only created when contests are ACTIVE.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debugData.activeContests.map((contest: any) => (
                    <div key={contest.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium text-green-900">{contest.name}</div>
                      <div className="text-sm text-green-700">
                        {contest.participantCount} participants • {contest.stores.length} stores
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {new Date(contest.startAt).toLocaleDateString()} - {new Date(contest.endAt).toLocaleDateString()}
                      </div>
                      {contest.stores.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-green-800">Stores:</div>
                          <div className="text-xs text-green-700">{contest.stores.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Webhook Subscriptions */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle>Webhook Subscriptions ({debugData.webhookSubscriptions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.webhookSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No webhook subscriptions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debugData.webhookSubscriptions.map((sub: any) => (
                    <div key={sub.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{sub.storeDomain}</div>
                          <div className="text-sm text-gray-600">{sub.contestName}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={sub.isActive ? "default" : "secondary"}>
                            {sub.topic}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">
                            Webhook ID: {sub.webhookId}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Test Result */}
        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                Webhook Test Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <div className="font-medium mb-2">Test Details:</div>
                  <div className="text-sm space-y-1">
                    <div><strong>Store:</strong> {testResult.testDetails.storeDomain}</div>
                    <div><strong>Topic:</strong> {testResult.testDetails.topic}</div>
                    <div><strong>Pub/Sub Address:</strong> {testResult.testDetails.pubsubAddress}</div>
                    <div><strong>Access Token Length:</strong> {testResult.testDetails.accessTokenLength}</div>
                  </div>
                </div>
                
                {testResult.success ? (
                  <div className="p-3 rounded-lg bg-green-100">
                    <div className="font-medium text-green-800 mb-2">✅ Success!</div>
                    <div className="text-sm text-green-700">
                      <div><strong>Webhook ID:</strong> {testResult.webhook?.id}</div>
                      <div><strong>Callback URL:</strong> {testResult.webhook?.callbackUrl}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-100">
                    <div className="font-medium text-red-800 mb-2">❌ Failed</div>
                    <div className="text-sm text-red-700">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 