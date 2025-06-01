import { ServiceRegistry } from "../src/index";

class Foo {
    // ....
}

// Register a new instance of Foo to the key "foo"
const registry = ServiceRegistry.create().addSingleton("foo", () => new Foo());

// Start a new scope. This will give you a ServiceProvider
const provider = registry.scope();

// Retreive the service by the key, "foo"
const foo = provider.foo();
