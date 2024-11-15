# TIOC - Type Inversion of Control
[![License](https://img.shields.io/github/license/rikthepixel/tioc)](LICENSE)
[![JSR](https://jsr.io/badges/@rikthepixel/tioc)](https://jsr.io/@rikthepixel/tioc)
[![JSR Score](https://jsr.io/badges/@rikthepixel/tioc/score)](https://jsr.io/@rikthepixel/tioc)
[![NPM](https://img.shields.io/npm/v/tioc)](https://www.npmjs.com/package/tioc)
![Minified size](https://img.shields.io/bundlephobia/min/tioc)
![Zipped minified size](https://img.shields.io/bundlephobia/minzip/tioc)

A simple Inversion of Control library for JavaScript.

## Features
- **3 different scopes**:
    - **Singleton** - Instantiated once per ServiceRegistry
    - **Scoped** - Instantiated once per ServiceProvider
    - **Transient** - Instantiated every time when requested
- **Simple**, only includes what's necessary
- **Tiny**, if you care about size, it's only around ~1kb (minified)

## Usage

### [Adding services](examples/adding-services.ts)

```ts
import { ServiceRegistry } from "tioc";

class Service {
  // ...
}

ServiceRegistry.create()
  // Adding a simple service 
  .add("singleton", "myService", () => new Service())

  // Alternative way to write it!
  .addSingleton("foo", () => new Service())
  .addScoped("bar", () => new Service())
  .addTransient("baz", () => new Service());
```

### [Requesting services](examples/requesting-services.ts)


```ts
import { ServiceRegistry } from "tioc";

class Service {
  // ....
}

// Register a new instance of Service to the key "foo"
const registry = ServiceRegistry.create()
  .addSingleton("foo", () => new Service());

// Start a new scope. This will give you a ServiceProvider
const provider = registry.scope();

// Retreive the service by the key, "foo"
const service = provider.foo();
```

### [Dependent services](examples/dependent-services.ts)

`tioc` allows services to depend on another. 
Factory functions are given a provider instance that they can use to get previously registered services.

```ts
import { ServiceRegistry } from "tioc";

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
  .addSingleton("database", (provider) => new Database(provider.config())); // `provider` is a ServiceProvider, like the one received from `ServiceRegistry.scope()`

// ❌ Doesn't work. Services can't depend on ones that arent registered yet. This prevents cyclic dependencies.
ServiceRegistry.create()
  .addSingleton("database", (provider) => new Database(provider.config())) // Error: Property 'config' does not exist on type '{}'.
  .addSingleton("config", () => new Config());
```

### [Async services](examples/async-services.ts)

It isn't recommended to make your services async, but sometimes there is no way around it.
The `ServiceRegistry` and `ServiceProvider` are built to allow for async services.

```ts
import { ServiceRegistry } from "tioc";

class Exchange {}
class Queue {}

declare class MessageQueue {
  makeExchange(): Promise<Exchange>;
  makeQueue(exchange: Exchange): Promise<Queue>;
}

const registry = ServiceRegistry.create()
  .addSingleton("mq", () => new MessageQueue())
  // Simply return a promise
  .addSingleton("exchange", (provider) => provider.mq().makeExchange())
  // Factory functions are allowed to be async.
  .addSingleton("queue", async (provider) => {
    const exchange = await provider.exchange()
    return await provider.mq().makeQueue(exchange);
  });

const provider = registry.scope();

// Async trickles down into the provider. 
// If your factory returns a Promise, your provider will.
const exchange = await provider.exchange();
const queue = await provider.queue();
```
