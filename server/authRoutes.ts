import type { Express } from "express";

// Simple development authentication system
let currentDevUser = {
  id: 'dev-user-123',
  email: 'dev@sclen.com',
  firstName: 'Developer',
  lastName: 'User',
  role: 'admin'
};

let isLoggedIn = true;

export function setupDevAuth(app: Express) {
  // Get current user
  app.get('/api/auth/user', (req, res) => {
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json(currentDevUser);
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    isLoggedIn = false;
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Login (for development)
  app.post('/api/auth/login', (req, res) => {
    isLoggedIn = true;
    res.json(currentDevUser);
  });

  // Change role
  app.patch('/api/auth/user/role', (req, res) => {
    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { role } = req.body;
    const validRoles = ['admin', 'department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'vendor'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    currentDevUser.role = role;
    res.json(currentDevUser);
  });

  // Middleware to check auth for protected routes
  app.use('/api', (req, res, next) => {
    // Skip auth check for auth routes
    if (req.path.startsWith('/auth/') || req.path === '/vendors/discover') {
      return next();
    }

    if (!isLoggedIn) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Add mock user to request
    (req as any).user = { claims: { sub: currentDevUser.id } };
    next();
  });
}