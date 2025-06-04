import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ShoppingBag, Trash2, Eye } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <Header 
        user={undefined}
        showBackButton={true}
        backHref="/"
        backLabel="Back to Home"
      />
      
      <div className="py-8 px-4 flex-1">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Privacy Policy Content */}
          <div className="space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-emerald-600" />
                  Our Commitment to Your Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p>
                  Growth Arena is committed to protecting your privacy. This policy explains what data we collect, 
                  how we use it, and your rights regarding your information.
                </p>
              </CardContent>
            </Card>

            {/* Data Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2 text-emerald-600" />
                  What Data We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <h4 className="font-semibold text-gray-900 mb-3">Sales Data for Competition Scoring</h4>
                <p className="mb-4">
                  We collect limited sales data from your connected Shopify store solely for the purpose of 
                  competition scoring and leaderboard rankings. This includes:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li><strong>Net sales amounts</strong> - Total sales revenue for calculating competition scores</li>
                  <li><strong>Refund amounts</strong> - To ensure accurate net sales calculations</li>
                  <li><strong>Order counts</strong> - Number of orders for certain competition formats</li>
                  <li><strong>Sale timestamps</strong> - To verify sales occurred during competition periods</li>
                </ul>
                
                <h4 className="font-semibold text-gray-900 mb-3">Account Information</h4>
                <p className="mb-4">
                  To create and manage your account, we collect:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Email address (for account creation and authentication)</li>
                  <li>Username (for display on leaderboards)</li>
                  <li>Full name (optional, for display purposes)</li>
                  <li>Shopify store domain (to identify your connected store)</li>
                </ul>
              </CardContent>
            </Card>

            {/* What We Don't Collect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-600" />
                  What We Don't Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="mb-4">
                  <strong>We do not collect or store any customer personal information (PII)</strong>, including:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Customer names, addresses, or contact information</li>
                  <li>Customer payment information or credit card details</li>
                  <li>Product details, inventory data, or catalog information</li>
                  <li>Customer purchase history or behavior patterns</li>
                  <li>Any other personally identifiable information about your customers</li>
                </ul>
                <p>
                  We only access the minimal sales data necessary to calculate competition scores - 
                  nothing more.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2 text-emerald-600" />
                  How We Use Your Data
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="mb-4">
                  Your sales data is used exclusively for:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Competition scoring</strong> - Calculating your performance in sales contests</li>
                  <li><strong>Leaderboard rankings</strong> - Displaying competition standings</li>
                  <li><strong>Contest verification</strong> - Ensuring sales occurred during valid competition periods</li>
                  <li><strong>Platform functionality</strong> - Enabling core features of the Growth Arena platform</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Deletion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                  Data Deletion
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <h4 className="font-semibold text-gray-900 mb-3">Automatic Deletion</h4>
                <p className="mb-4">
                  <strong>All your sales data will be permanently deleted</strong> when you:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Disconnect your Shopify store from Growth Arena</li>
                  <li>Delete your Growth Arena account</li>
                  <li>Uninstall the Growth Arena app from your Shopify store</li>
                </ul>
                
                <h4 className="font-semibold text-gray-900 mb-3">Data Retention</h4>
                <p>
                  While your store remains connected, we retain sales data only for active and recently 
                  completed competitions. Historical competition data may be retained for leaderboard 
                  history purposes, but can be deleted upon request.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                  Your Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li><strong>Access your data</strong> - Request a copy of the sales data we have collected</li>
                  <li><strong>Delete your data</strong> - Request immediate deletion of all your sales data</li>
                  <li><strong>Disconnect at any time</strong> - Remove your store connection and delete all data</li>
                  <li><strong>Opt out of competitions</strong> - Participate selectively in competitions</li>
                </ul>
                <p>
                  To exercise these rights or ask questions about our privacy practices, please contact us 
                  through the Growth Arena platform or disconnect your store through the Shopify connections page.
                </p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                  Data Security
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p>
                  We implement appropriate technical and organizational measures to protect your sales data 
                  against unauthorized access, alteration, disclosure, or destruction. All data transmission 
                  between your Shopify store and our platform is encrypted using industry-standard protocols.
                </p>
              </CardContent>
            </Card>

            {/* Updates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-emerald-600" />
                  Policy Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p>
                  We may update this privacy policy from time to time. Any changes will be posted on this page 
                  with an updated "last modified" date. We encourage you to review this policy periodically.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Questions about this privacy policy?{" "}
              <Link href="/shopify-connections" className="text-emerald-600 hover:text-emerald-500">
                Manage your store connections
              </Link>{" "}
              or{" "}
              <Link href="/" className="text-emerald-600 hover:text-emerald-500">
                return to Growth Arena
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
} 