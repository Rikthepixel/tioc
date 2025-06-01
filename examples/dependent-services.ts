import { ServiceRegistry } from "../src/index";

class Config {
    // ...
}

class Database {
    constructor(private config: Config) {}
    // ...
}

// ✅ Register the service you want to depend on first, and then use it!
ServiceRegistry.create()
    .addSingleton("config", () => new Config())
    .addSingleton("mq", (provider) => new Database(provider.config())); // `provider` is a ServiceProvider, like the one received from `ServiceRegistry.scope()`

// ❌ Doesn't work. Services can't depend on ones that arent registered yet. This prevents cyclic dependencies.
ServiceRegistry.create()
    .addSingleton("mq", (provider) => new Database(provider.config())) // Error: Property 'config' does not exist on type '{}'.
    .addSingleton("config", () => new Config());
