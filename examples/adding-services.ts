import { ServiceRegistry } from "../src/index";

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
