export type User = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: Date;
};

export class UserService {
  #users: User[] = [
    {
      id: 1,
      email: "alice@brevity.test",
      name: "Alice Admin",
      role: "admin",
      createdAt: new Date("2024-01-01"),
    },
    {
      id: 2,
      email: "bob@brevity.test",
      name: "Bob Builder",
      role: "user",
      createdAt: new Date("2024-02-15"),
    },
    {
      id: 3,
      email: "carol@brevity.test",
      name: "Carol Dev",
      role: "user",
      createdAt: new Date("2024-03-20"),
    },
  ];

  #nextId = 4;

  all(): User[] {
    return [...this.#users];
  }

  find(id: number): User | undefined {
    return this.#users.find((u) => u.id === id);
  }

  findByEmail(email: string): User | undefined {
    return this.#users.find((u) => u.email === email);
  }

  create(input: { email: string; name: string; role?: "admin" | "user" }): User {
    const user: User = {
      id: this.#nextId++,
      email: input.email,
      name: input.name,
      role: input.role ?? "user",
      createdAt: new Date(),
    };
    this.#users.push(user);
    return user;
  }

  update(
    id: number,
    input: Partial<{ email: string; name: string; role: "admin" | "user" }>,
  ): User | undefined {
    const index = this.#users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    this.#users[index] = { ...this.#users[index], ...input };
    return this.#users[index];
  }

  delete(id: number): boolean {
    const index = this.#users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.#users.splice(index, 1);
    return true;
  }
}
