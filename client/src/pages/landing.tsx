import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Users, TrendingUp, Shield, Zap, Globe } from "lucide-react";
import { useState } from "react";
import LoginForm from "@/components/login-form";

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b dark:bg-slate-900/80 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-foreground">SCLEN Procurement</span>
            </div>
            <Button 
              onClick={() => setShowLogin(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Next-Generation
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Procurement Platform
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Streamline your procurement workflows with AI-powered vendor discovery, 
            real-time auctions, and comprehensive supplier management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setShowLogin(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Powerful Features for Modern Procurement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI-Powered Discovery</CardTitle>
                <CardDescription>
                  Find the perfect vendors using natural language search and intelligent recommendations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Real-Time Auctions</CardTitle>
                <CardDescription>
                  Maximize cost savings with live bidding events and competitive procurement processes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Vendor Management</CardTitle>
                <CardDescription>
                  Comprehensive supplier profiles with performance tracking and compliance management.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-info" />
                </div>
                <CardTitle>RFx Workflows</CardTitle>
                <CardDescription>
                  Streamlined RFI, RFP, and RFQ processes with automated vendor invitations and responses.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-warning" />
                </div>
                <CardTitle>Global Reach</CardTitle>
                <CardDescription>
                  Connect with suppliers worldwide and manage multi-currency, multi-region procurement.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>
                  Comprehensive reporting and spend analysis to optimize your procurement strategy.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white/50 dark:bg-slate-800/50 rounded-2xl p-8 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-muted-foreground">Active Organizations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary">10K+</div>
              <div className="text-muted-foreground">Registered Vendors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">$2.5B</div>
              <div className="text-muted-foreground">Procurement Volume</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-success">25%</div>
              <div className="text-muted-foreground">Average Savings</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of organizations already using SCLEN Procurement to streamline their operations.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Start Your Journey
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-slate-900/80 border-t dark:border-slate-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 SCLEN Procurement. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
