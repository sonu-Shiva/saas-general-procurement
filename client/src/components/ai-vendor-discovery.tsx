import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Send, Sparkles, MapPin, Phone, Mail, Globe, Building, MessageSquare } from "lucide-react";

interface DiscoveredVendor {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string;
  description: string;
  category: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'vendors';
  content: string;
  timestamp: Date;
  vendors?: DiscoveredVendor[];
}

interface AIVendorDiscoveryProps {
  onVendorsFound?: (vendors: DiscoveredVendor[]) => void;
}

export default function AIVendorDiscovery({ onVendorsFound }: AIVendorDiscoveryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI procurement assistant. I can help you discover and connect with verified suppliers. What are you looking to source today?",
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddToNetwork = async (vendor: DiscoveredVendor) => {
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          companyName: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          website: vendor.website,
          category: vendor.category,
          description: vendor.description,
          status: 'active'
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${vendor.name} has been added to your vendor network`,
        });
      } else {
        throw new Error('Failed to add vendor');
      }
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast({
        title: "Error",
        description: "Failed to add vendor to network. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContact = (vendor: DiscoveredVendor) => {
    const contactMethods = [];
    
    if (vendor.email && vendor.email !== "Not publicly listed") {
      contactMethods.push(`📧 Email: ${vendor.email}`);
    }
    if (vendor.phone && vendor.phone !== "Not publicly listed") {
      contactMethods.push(`📞 Phone: ${vendor.phone}`);
    }
    if (vendor.website && vendor.website !== "Not available") {
      contactMethods.push(`🌐 Website: ${vendor.website}`);
    }
    
    const contactInfo = contactMethods.length > 0 
      ? contactMethods.join('\n') 
      : 'Contact information not publicly available. Try searching for their website or calling directory assistance.';
    
    toast({
      title: `Contact ${vendor.name}`,
      description: contactInfo,
      duration: 8000,
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const discoverVendors = useMutation({
    mutationFn: async (query: string): Promise<DiscoveredVendor[]> => {
      const response = await fetch('/api/vendors/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: query,
          location: '',
          category: ''
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    },
    onSuccess: (vendors, query) => {
      setIsThinking(false);
      
      // Add AI response with vendors
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'vendors',
        content: `Great! I found ${vendors.length} verified suppliers for "${query}". Here are the options:`,
        timestamp: new Date(),
        vendors: vendors
      };
      
      setMessages(prev => [...prev, aiMessage]);
      onVendorsFound?.(vendors);
      
      // Add follow-up message
      setTimeout(() => {
        const followUpMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "Would you like me to refine this search, find suppliers in a specific location, or help you with something else?",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, followUpMessage]);
      }, 1000);
    },
    onError: (error: any) => {
      setIsThinking(false);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I'm sorry, I encountered an issue while searching: ${error.message}. Could you try rephrasing your request?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Show AI thinking
    setIsThinking(true);
    const thinkingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: "Let me search for suppliers that match your requirements...",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, thinkingMessage]);
    
    // Start vendor discovery
    discoverVendors.mutate(currentMessage);
    setCurrentMessage("");
  };

  const handleQuickPrompt = (prompt: string) => {
    setCurrentMessage(prompt);
    setTimeout(() => handleSendMessage(), 100);
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'vendors' && message.vendors) {
      return (
        <div className="space-y-4">
          <p className="text-sm">{message.content}</p>
          <div className="grid grid-cols-1 gap-3">
            {message.vendors.map((vendor, index) => (
              <Card key={index} className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">
                          {vendor.name}
                        </h4>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {vendor.category || 'General'}
                        </Badge>
                      </div>
                      {vendor.logoUrl && (
                        <img 
                          src={vendor.logoUrl} 
                          alt={`${vendor.name} logo`}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      {vendor.email && vendor.email !== "Not publicly listed" && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && 
                       vendor.phone !== "Not publicly listed" && 
                       vendor.phone !== "Not listed (contact via ExportersIndia platform)" && 
                       vendor.phone.trim() !== "" && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {(!vendor.email || vendor.email === "Not publicly listed") && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="text-xs italic">Not publicly listed</span>
                        </div>
                      )}
                      {(!vendor.phone || vendor.phone === "Not publicly listed" || vendor.phone === "Not listed (contact via ExportersIndia platform)") && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="w-3 h-3 mr-1" />
                          <span className="text-xs italic">Not listed (contact via ExportersIndia platform)</span>
                        </div>
                      )}
                    </div>

                    {vendor.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {vendor.description}
                      </p>
                    )}

                    <div className="flex space-x-2 pt-1">
                      <Button 
                        size="sm" 
                        className="text-xs h-6 flex-1"
                        onClick={() => handleAddToNetwork(vendor)}
                        data-testid={`button-add-network-${vendor.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        Add to Network
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs h-6"
                        onClick={() => handleContact(vendor)}
                        data-testid={`button-contact-${vendor.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return <p className="text-sm">{message.content}</p>;
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Chat Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
            <MessageSquare className="w-5 h-5 mr-2" />
            AI Vendor Discovery Chat
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'ai' && (
                      <Bot className="w-4 h-4 mt-0.5 text-blue-600" />
                    )}
                    {message.type === 'user' && (
                      <User className="w-4 h-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {renderMessage(message)}
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="p-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Try these common requests:</p>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white text-xs"
                onClick={() => handleQuickPrompt("I need electronic components with ISO 9001 certification")}
              >
                Electronic Components
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white text-xs"
                onClick={() => handleQuickPrompt("Find textile manufacturers in Gujarat")}
              >
                Textile Manufacturing
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-600 hover:text-white text-xs"
                onClick={() => handleQuickPrompt("Chemical suppliers with export license")}
              >
                Chemical Suppliers
              </Badge>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              placeholder="Describe what you need to source..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isThinking}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isThinking}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}