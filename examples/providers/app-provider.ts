import { ServiceProvider, type Container } from "@brevity/core";
import { UserService } from "../services/user-service.js";
import { NoteService } from "../services/note-service.js";

export class AppProvider extends ServiceProvider {
  register(container: Container): void {
    container.singleton("users", () => new UserService());
    container.singleton("notes", () => new NoteService());
  }
}
