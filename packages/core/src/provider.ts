import type { Container } from "./container.js";

export abstract class ServiceProvider {
  register(_container: Container): void {}
  boot(_container: Container): void {}
}
