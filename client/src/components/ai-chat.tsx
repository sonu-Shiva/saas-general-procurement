import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, MessageSquare, Sparkles, Users, FileText, Gavel } from "lucide-react";

export default function AiChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content: "Hello! I'm your AI procurement assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: "ai",
        content: generateAIResponse(inputMessage),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes("vendor") || input.includes("supplier")) {
      return "I found several vendors matching your criteria. Would you like me to create an RFQ and invite them to participate?";
    } else if (input.includes("rfq") || input.includes("rfp")) {
      return "I can help you create an RFx document. Please describe your requirements and I'll draft the necessary documents for you.";
    } else if (input.includes("auction")) {
      return "Setting up an auction can help you get competitive pricing. Would you like me to help you create an auction event?";
    } else if (input.includes("steel") || input.includes("pipe")) {
      return "I found 8 suppliers for steel pipes with ISO certification. Here are the top 3:\n• MetalCorp India - 4.8/5 rating\n• SteelTech Solutions - 4.6/5 rating\n• Mumbai Steel Works - 4.5/5 rating\n\nWould you like me to create an RFQ for these suppliers?";
    } else {
      return "I can help you with vendor discovery, creating RFx documents, setting up auctions, and analyzing procurement data. What specific task would you like assistance with?";
    }
  };

  const quickActions = [
    { label: "Find Vendors", icon: Users, action: () => setInputMessage("Find steel pipe suppliers in Gujarat with ISO certification") },
    { label: "Create RFx", icon: FileText, action: () => setInputMessage("Help me create an RFQ for office furniture") },
    { label: "Setup Auction", icon: Gavel, action: () => setInputMessage("Set up an auction for industrial equipment") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="w-5 h-5 mr-2 text-primary" />
          AI Procurement Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto mb-4 p-4 bg-muted rounded-lg">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.type === "ai" ? "ai-chat-bubble" : "user-chat-bubble"}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
            ))}
            {isTyping && (
              <div className="ai-chat-bubble">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={action.action}
              >
                <action.icon className="w-3 h-3 mr-1" />
                {action.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me about vendors, RFx, auctions..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isTyping}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isTyping}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
