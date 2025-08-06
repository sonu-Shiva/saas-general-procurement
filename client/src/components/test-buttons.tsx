import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function TestButtons() {
  const { logout } = useAuth();

  const testDiscovery = async () => {
    console.log("Testing AI Discovery...");
    
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/vendors/discover', false); // Synchronous for testing
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.withCredentials = true;
      
      const payload = JSON.stringify({
        query: 'electronic components',
        location: '',
        category: ''
      });
      
      xhr.send(payload);
      
      console.log('XHR Status:', xhr.status);
      console.log('XHR Response:', xhr.responseText);
      
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        alert(`Success! Found ${result.length} vendors`);
      } else {
        alert(`Error: ${xhr.status} - ${xhr.responseText}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      alert(`Error: ${error}`);
    }
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 z-50">
      <Button onClick={testDiscovery} variant="outline">
        Test AI Discovery
      </Button>
      <Button onClick={logout} variant="outline">
        Test Logout
      </Button>
    </div>
  );
}