import { createApp, type Request, type Response } from "@portablesheep/brevity";
import { Controller, Get, registerControllers } from "@portablesheep/brevity/decorators";

class UserService {
  find(id: string | null) {
    return { id, name: "Brevity" };
  }
}

@Controller("/users")
class UsersController {
  constructor(private readonly users: UserService) {}

  @Get("/{i:id}")
  show(req: Request, res: Response): void {
    res.json(this.users.find(req.param("id")));
  }
}

export function createControllerApp() {
  const app = createApp();
  registerControllers(app.router, new UsersController(new UserService()));
  return app;
}
