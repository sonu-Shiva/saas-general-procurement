// Simple terms download fix
import { objectStorageClient } from "./objectStorage";

export function createTermsDownloadRoute(app: any, storage: any) {
  app.get('/api/terms/download/:entityId', async (req: any, res: any) => {
    try {
      const { entityId } = req.params;
      console.log(`Downloading terms for entity: ${entityId}`);
      
      // Get RFx details
      const rfx = await storage.getRfxEvent(entityId);
      if (!rfx) {
        return res.status(404).json({ error: 'RFx not found' });
      }
      
      const termsPath = rfx.termsAndConditionsPath;
      console.log(`Terms path found: ${termsPath}`);
      
      if (!termsPath) {
        // Generate default terms content
        const defaultContent = `TERMS AND CONDITIONS
        
RFx: ${rfx.title}
Reference: ${rfx.referenceNo}
Type: ${rfx.type?.toUpperCase()}
Budget: ${rfx.budget || 'Not specified'}

GENERAL TERMS:
1. All proposals must be valid for 30 days minimum
2. Buyer reserves right to reject any/all proposals
3. Payment terms as per contract
4. Standard compliance requirements apply

Generated on: ${new Date().toLocaleString()}`;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="terms-${rfx.referenceNo}.txt"`);
        return res.send(defaultContent);
      }
      
      // Download actual uploaded file
      if (termsPath.startsWith('https://storage.googleapis.com/')) {
        console.log("Downloading from Google Cloud Storage URL");
        
        // Parse the Google Cloud Storage URL
        const url = new URL(termsPath);
        const pathParts = url.pathname.split('/');
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join('/');
        
        console.log(`Bucket: ${bucketName}, Object: ${objectName}`);
        
        // Get the file from Google Cloud Storage
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
          console.log("File not found in storage");
          return res.status(404).json({ error: 'File not found' });
        }
        
        // Get file metadata
        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType || 'application/octet-stream';
        
        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="terms-${rfx.referenceNo}.${contentType.includes('pdf') ? 'pdf' : 'txt'}"`);
        
        // Stream file content
        const stream = file.createReadStream();
        stream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
          }
        });
        
        stream.pipe(res);
      } else {
        return res.status(400).json({ error: 'Invalid file path format' });
      }
      
    } catch (error) {
      console.error("Error in terms download:", error);
      res.status(500).json({ error: "Failed to download terms document" });
    }
  });
}