// auth.js - Sistema de autenticación

class AuthManager {
  constructor() {
    this.users = [
      {
        username: "willy_admin",
        password: "admin2024",
        role: "admin",
        fullName: "Willis Andres Rivera Perez",
        permissions: [
          "create_reports",
          "view_reports",
          "manage_users",
          "full_access",
        ],
      },
      {
        username: "inspectorasst",
        password: "emp123",
        role: "employee",
        fullName: "Inspector Asistente",
        permissions: ["create_reports", "view_reports"],
      },
      {
        username: "tecnicolider",
        password: "tech123",
        role: "employee",
        fullName: "Técnico Líder",
        permissions: ["create_reports", "view_reports"],
      },
    ];

    this.currentUser = null;
    this.sessionKey = "willis_auth_session";
    this.init();
  }

  // Initialize authentication system
  init() {
    // Check if user is already logged in
    const session = this.getStoredSession();
    if (session && this.validateSession(session)) {
      this.currentUser = session.user;
      return true;
    }
    return false;
  }

  // Generate JWT-like token (simplified for client-side)
  generateToken(user) {
    const header = {
      typ: "JWT",
      alg: "HS256",
    };

    const payload = {
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    // Simple base64 encoding (not cryptographically secure, but sufficient for client-side)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = btoa(`${encodedHeader}.${encodedPayload}.secret`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Validate stored session
  validateSession(session) {
    if (!session || !session.token || !session.user) {
      return false;
    }

    try {
      const parts = session.token.split(".");
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return payload.exp > now;
    } catch (error) {
      console.error("Error validating session:", error);
      return false;
    }
  }

  // Get stored session from localStorage
  getStoredSession() {
    try {
      const stored = localStorage.getItem(this.sessionKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error getting stored session:", error);
      return null;
    }
  }

  // Store session in localStorage
  storeSession(user, token) {
    const session = {
      user: {
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        permissions: user.permissions,
      },
      token: token,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: this.getUserIP(),
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this.logActivity("login", `Usuario ${user.fullName} inició sesión`);
  }

  // Get user IP (simplified)
  getUserIP() {
    // In a real implementation, this would make a request to an IP service
    // For now, we'll use a placeholder
    return "Unknown IP";
  }

  // Log user activity
  logActivity(action, description) {
    const logs = JSON.parse(
      localStorage.getItem("willis_activity_logs") || "[]"
    );
    logs.push({
      timestamp: new Date().toISOString(),
      user: this.currentUser?.fullName || "Unknown",
      action: action,
      description: description,
      userAgent: navigator.userAgent,
    });

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    localStorage.setItem("willis_activity_logs", JSON.stringify(logs));
  }

  // Authenticate user
  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        const user = this.users.find(
          (u) =>
            u.username.toLowerCase() === username.toLowerCase() &&
            u.password === password
        );

        if (user) {
          const token = this.generateToken(user);
          this.currentUser = user;
          this.storeSession(user, token);
          resolve({
            success: true,
            user: {
              username: user.username,
              role: user.role,
              fullName: user.fullName,
              permissions: user.permissions,
            },
            token: token,
          });
        } else {
          this.logActivity(
            "failed_login",
            `Intento de login fallido para: ${username}`
          );
          reject({
            success: false,
            message: "Usuario o contraseña incorrectos",
          });
        }
      }, 500); // 500ms delay to simulate server response
    });
  }

  // Check if user has specific permission
  hasPermission(permission) {
    return (
      this.currentUser && this.currentUser.permissions.includes(permission)
    );
  }

  // Check if user has admin role
  isAdmin() {
    return this.currentUser && this.currentUser.role === "admin";
  }

  // Update last activity timestamp
  updateActivity() {
    const session = this.getStoredSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  // Logout user
  logout() {
    if (this.currentUser) {
      this.logActivity(
        "logout",
        `Usuario ${this.currentUser.fullName} cerró sesión`
      );
    }

    localStorage.removeItem(this.sessionKey);
    this.currentUser = null;

    // Redirect to login
    window.location.href = "login.html";
  }

  // Get current user info
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Get activity logs (admin only)
  getActivityLogs() {
    if (!this.isAdmin()) {
      throw new Error("Access denied: Admin privileges required");
    }

    return JSON.parse(localStorage.getItem("willis_activity_logs") || "[]");
  }

  // Clear all sessions and logs (admin only)
  clearAllSessions() {
    if (!this.isAdmin()) {
      throw new Error("Access denied: Admin privileges required");
    }

    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem("willis_activity_logs");
    this.logActivity("admin_action", "Todas las sesiones fueron limpiadas");
  }
}

// Create global auth instance
window.authManager = new AuthManager();

// Update activity on user interaction
document.addEventListener("click", () => {
  if (window.authManager && window.authManager.isAuthenticated()) {
    window.authManager.updateActivity();
  }
});

document.addEventListener("keypress", () => {
  if (window.authManager && window.authManager.isAuthenticated()) {
    window.authManager.updateActivity();
  }
});

// Auto logout after 24 hours of inactivity
setInterval(() => {
  if (window.authManager && window.authManager.isAuthenticated()) {
    const session = window.authManager.getStoredSession();
    if (session) {
      const lastActivity = new Date(session.lastActivity);
      const now = new Date();
      const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

      if (hoursSinceActivity > 24) {
        alert("Su sesión ha expirado por inactividad");
        window.authManager.logout();
      }
    }
  }
}, 60000); // Check every minute
