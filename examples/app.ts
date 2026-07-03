import { createExampleApp } from "./bootstrap.js";

const app = createExampleApp();

app.listen(3000);
console.log("Brevity Node sample app running: http://127.0.0.1:3000");
console.log(`Debug mode: ${process.env.NODE_ENV !== "production" ? "🐛 ON" : "⚫ OFF"}`);
console.log("View debug logs: http://127.0.0.1:3000/debug");
