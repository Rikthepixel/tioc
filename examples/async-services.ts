import { ServiceRegistry } from "../src/index";

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
        const exchange = await provider.exchange();
        return await provider.mq().makeQueue(exchange);
    });

const provider = registry.scope();

// Async trickles down into the provider.
// If your factory returns a Promise, your provider will.
const exchange = await provider.exchange();
const queue = await provider.queue();
