import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, BarChart3, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          {/* Logo */}
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-6">
            <Zap className="h-10 w-10 text-primary-foreground" />
          </div>
          
          {/* Hero Content */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            SalesLeopard
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Advanced Cold Outreach Research Platform
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Generate personalized cold outreach messages with AI-powered research. 
            Upload prospects, get comprehensive analysis, and create compelling messages that convert.
          </p>
          
          {/* CTA Button */}
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 h-auto"
            onClick={() => window.location.href = '/api/login'}
          >
            Continue to Dashboard
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="mx-auto h-12 w-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Prospect Research
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deep analysis of prospects, their companies, pain points, and business goals
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="mx-auto h-12 w-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                AI-Powered Messages
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate personalized cold outreach emails tailored to each prospect
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="mx-auto h-12 w-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Bulk Processing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload CSV files and process hundreds of prospects simultaneously
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6">
              <div className="mx-auto h-12 w-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Secure & Private
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your prospect data is encrypted and securely stored
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-12">
            How it works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Add Prospects
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Manually enter prospect details or upload a CSV file with your prospect list
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                AI Research
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Our AI researches each prospect's background, company, and identifies key opportunities
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Get Results
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Receive personalized cold outreach messages ready to send to your prospects
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
