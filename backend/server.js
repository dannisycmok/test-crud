import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { initDatabase } from "./db.js";
import { HttpError } from "./lib/errors.js";
import orderRoutes from "./routes/orders.js";
import productRoutes from "./routes/products.js";
import userRoutes from "./routes/users.js";

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../frontend/dist"
);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", productRoutes);
app.use("/api", userRoutes);
app.use("/api", orderRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: `No route for ${req.method} ${req.originalUrl}`,
  });
});

app.use(express.static(frontendDist));

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  res.sendFile(path.join(frontendDist, "index.html"), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `No route for ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    res.status(400).json({ success: false, error: "Invalid JSON body" });
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  const message =
    error instanceof HttpError ? error.message : "An unexpected server error occurred";
  if (status === 500) {
    console.error(error);
  }
  res.status(status).json({ success: false, error: message });
});

try {
  await initDatabase();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
