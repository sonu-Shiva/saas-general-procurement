import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  console.log("Using PostgreSQL-backed sessions for persistent login across restarts");
  
  // Always use PostgreSQL store for persistent sessions
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Create table if missing
    ttl: Math.floor(sessionTtl / 1000), // TTL in seconds for pg store
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "sclen-procurement-persistent-sessions-v1",
    store: sessionStore,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Extend session on each request
    name: 'sclen.sid', // Use unique session name
    cookie: {
      httpOnly: true,
      secure: false, // Allow HTTP in development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Register strategy for the primary domain
  const primaryDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
  console.log("Registering auth strategy for domain:", primaryDomain);
  
  const strategy = new Strategy(
    {
      name: `replitauth:${primaryDomain}`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${primaryDomain}/api/callback`,
    },
    verify,
  );
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => {
    console.log("Serializing user:", user ? "exists" : "null");
    cb(null, user);
  });
  passport.deserializeUser((user: Express.User, cb) => {
    console.log("Deserializing user:", user ? "exists" : "null");
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    console.log("Login attempt for hostname:", req.hostname);
    
    const primaryDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
    const strategyName = `replitauth:${primaryDomain}`;
    
    console.log("Using strategy:", strategyName);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Callback for hostname:", req.hostname);
    
    const primaryDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
    const strategyName = `replitauth:${primaryDomain}`;
    
    console.log("Using callback strategy:", strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    console.log("Logout request received");
    
    // In development mode, just clear everything and redirect
    if (process.env.NODE_ENV === 'development') {
      console.log("Development logout - clearing session");
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.clearCookie('connect.sid');
        res.redirect("/");
      });
      return;
    }
    
    // Production logout with proper OIDC flow
    req.logout(() => {
      res.clearCookie('connect.sid');
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // TEMPORARY: Skip authentication for development/testing
  if (process.env.NODE_ENV === 'development') {
    console.log("DEVELOPMENT MODE: Bypassing authentication");
    // Create a mock user for development
    (req as any).user = {
      claims: {
        sub: "dev-user-123",
        email: "dev@sclen.com",
        first_name: "Developer",
        last_name: "User"
      }
    };
    return next();
  }

  const user = req.user as any;

  console.log("=== AUTH CHECK ===");
  console.log("Session ID:", req.sessionID);
  console.log("Session exists:", !!req.session);
  console.log("Session passport:", (req.session as any)?.passport ? "exists" : "null");
  console.log("Authenticated:", req.isAuthenticated());
  console.log("User object:", user ? "exists" : "null");
  console.log("User claims:", user?.claims ? "exists" : "null");
  console.log("Expires at:", user?.expires_at);

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("Not authenticated or no expiry");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log("Token still valid");
    return next();
  }

  console.log("Token expired, attempting refresh");
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("Token refreshed successfully");
    return next();
  } catch (error) {
    console.log("Token refresh failed:", error);
    // Clear the invalid session
    req.logout(() => {
      req.session.destroy(() => {
        res.status(401).json({ message: "Session expired. Please log in again." });
      });
    });
    return;
  }
};

// Role-based middleware
export const isVendor: RequestHandler = async (req: any, res, next) => {
  try {
    console.log("=== VENDOR ROLE CHECK ===");
    const userId = req.user?.claims?.sub;
    console.log("User ID from claims:", userId);
    
    if (!userId) {
      console.log("No user ID found in claims");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    console.log("User from database:", user ? `${user.email} (${user.role})` : "not found");
    
    if (!user || !['admin', 'sourcing_exec', 'sourcing_manager', 'vendor'].includes(user.role)) {
      console.log("Access denied - not authorized role");
      return res.status(403).json({ message: "Access denied. Admin, sourcing, or vendor role required." });
    }
    
    console.log("Vendor role confirmed, proceeding");
    next();
  } catch (error) {
    console.error("Error checking vendor role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isBuyer: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user || !['sourcing_exec', 'sourcing_manager', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: "Access denied. Buyer role required." });
    }
    
    next();
  } catch (error) {
    console.error("Error checking buyer role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const isSourcingManager: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Import storage here to avoid circular dependencies
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'sourcing_manager') {
      return res.status(403).json({ message: "Access denied. Sourcing Manager role required." });
    }
    
    next();
  } catch (error) {
    console.error("Error checking sourcing manager role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
