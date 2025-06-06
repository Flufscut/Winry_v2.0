import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // REF: Cookie parser for logout state tracking

// Disable caching on all API routes for real-time data
app.use('/api/*', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  
  // Debug webhook requests
  if (path === '/api/webhook/results') {
    console.log('INTERCEPTED WEBHOOK REQUEST:', req.method, path);
    console.log('Request headers:', req.headers);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('=== STARTING SERVER SETUP ===');
  
  // REF: Environment detection for proper deployment
  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 5001;
  
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${port}`);
  console.log(`🗄️  Database URL: ${process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT SET'}`);
  
  const server = await registerRoutes(app);
  console.log('=== ROUTES REGISTERED ===');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // REF: Production-ready server binding
  // Railway requires binding to 0.0.0.0 for external access
  const host = isProduction ? "0.0.0.0" : "localhost";
  
  server.listen({
    port: parseInt(port as string),
    host: host,
  }, () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📡 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  });
})();
