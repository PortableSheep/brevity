import { createApp, HttpError, type Request, type Response } from "@brevity/core";
import { Controller, Get, Head, registerControllers } from "@brevity/core/decorators";

export class InputError extends Error {}

export function requireId(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new InputError("Use a positive integer ID");
  }
  return Number(value);
}

export function toHttpId(value: string | null): number {
  try {
    return requireId(value);
  } catch (error) {
    if (error instanceof InputError) throw new HttpError(422, error.message);
    throw error;
  }
}

export class GreetingService {
  message(id: number) {
    return `Hello, reader ${id}`;
  }
}

export function plainApp(service: GreetingService) {
  const app = createApp();
  app.router.get("/readers/:id", (req, res) => {
    res.json({ message: service.message(toHttpId(req.param("id"))) });
  });
  app.router.head("/readers/:id", (req, res) => {
    toHttpId(req.param("id"));
    res.header("content-type", "application/json; charset=utf-8").send("");
  });
  return app;
}

@Controller("/readers")
export class ReadersController {
  constructor(private readonly service: GreetingService) {}

  @Get("/:id")
  show(req: Request, res: Response): void {
    res.json({ message: this.service.message(toHttpId(req.param("id"))) });
  }

  @Head("/:id")
  head(req: Request, res: Response): void {
    toHttpId(req.param("id"));
    res.header("content-type", "application/json; charset=utf-8").send("");
  }
}

export function decoratedApp(service: GreetingService) {
  const app = createApp();
  registerControllers(app.router, new ReadersController(service));
  return app;
}
