import { storage } from "./storage";

let schedulerInterval: NodeJS.Timeout | null = null;

// Import log function if it's available, otherwise use console.log
const log = (message: string) => {
  const timestamp = new Date().toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  console.log(`${timestamp} AM [auction-scheduler] ${message}`);
};

export function startAuctionScheduler() {
  // Clear any existing scheduler
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  log("Starting auction scheduler...");

  // Check every minute for auction status updates
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndUpdateAuctionStatuses();
    } catch (error) {
      console.error("Error in auction scheduler:", error);
    }
  }, 60000); // 1 minute

  // Run initial check
  setTimeout(checkAndUpdateAuctionStatuses, 1000);
}

export function stopAuctionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log("Auction scheduler stopped");
  }
}

async function checkAndUpdateAuctionStatuses() {
  try {
    const auctions = await storage.getAuctions();
    const now = new Date();
    let updatedCount = 0;

    for (const auction of auctions) {
      const startTime = new Date(auction.startTime);
      const endTime = new Date(auction.endTime);
      let newStatus = auction.status;

      // Logic for status transitions
      if (auction.status === 'scheduled' && now >= startTime && now < endTime) {
        newStatus = 'live';
      } else if (auction.status === 'live' && now >= endTime) {
        newStatus = 'closed';
      } else if (auction.status === 'scheduled' && now >= endTime) {
        // Handle case where auction was never started but time has passed
        newStatus = 'closed';
      }

      // Update status if changed
      if (newStatus !== auction.status) {
        await storage.updateAuctionStatus(auction.id, newStatus);
        updatedCount++;
        log(`Auction "${auction.name}" status updated: ${auction.status} → ${newStatus}`);
      }
    }

    if (updatedCount > 0) {
      log(`Updated ${updatedCount} auction statuses`);
    }
  } catch (error) {
    console.error("Error checking auction statuses:", error);
  }
}