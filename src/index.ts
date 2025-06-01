// Helpers

// Unpacks object types to make them appear simpler in the IDE
type Simplify<T extends object> = {
  [TKey in keyof T]: T[TKey];
} & {};

// Unpacks functions to make them appear simpler in the IDE
type SimplifyFn<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T;

/**
 * Factory that produces an object using the {@link ServiceProvider}
 */
export type ServiceFactory<
  T = any,
  TProvider extends ServiceProvider = ServiceProvider,
> = (provider: Simplify<TProvider>) => T;

/**
 * Available dependency scopes
 * - "singleton" Only instantiated once per {@link ServiceRegistry}
 * - "scoped" Only instantiated once per {@link ServiceProvider} (see {@link ServiceRegistry#scope})
 * - "transient" Instantiated every time it is requested
 */
export type DescriptorType = "singleton" | "scoped" | "transient";

type Descriptor<T, TProvider extends ServiceProvider> = {
  type: DescriptorType;
  factory: (provider: TProvider) => T;
};

/**
 * Contains the registrations for the dependencies.
 *
 * {@link ServiceRegistry#create} to instantiate the register
 * {@link ServiceRegistry#scope} to create a {@link ServiceProvider}
 */
export class ServiceRegistry<T extends Record<string, any> = {}> {
  private constructor(
    private descriptors: Map<string, Descriptor<any, ServiceProvider>>,
  ) {}

  /**
   * Creates a new ServiceRegistry
   */
  static create(): ServiceRegistry {
    return new ServiceRegistry(new Map());
  }

  private singletons = new Map<string, any>();

  /**
   * Adds a dependency to the register with the chosen {@link DescriptionType}.
   *
   * Available dependency scopes
   * - "singleton" Only instantiated once per {@link ServiceRegistry}
   * - "scoped" Only instantiated once per scope see {@link ServiceRegistry#scope}
   * - "transient" Instantiated every time it is requested
   *
   * @param type The dependency scope
   * @param key Key that the service can be retreived with.
   * @param factory Produces a new instance of the service.
   */
  add<TKey extends string, TOutput>(
    type: DescriptorType,
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<ServiceFactory<TOutput, ServiceProvider<T>>>,
  ): ServiceRegistry<Simplify<T & { [key in TKey]: TOutput }>> {
    const descriptors = new Map(this.descriptors);
    descriptors.set(key, { type, factory: factory as ServiceFactory });
    return new ServiceRegistry(descriptors);
  }

  /**
   * Adds a singleton dependency to the register.
   *
   * Singletons are instantiated once per {@link ServiceRegistry}.
   *
   * @param key Key that the service can be retreived with.
   * @param factory Produces a new instance of the service.
   */
  addSingleton<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<ServiceFactory<TOutput, ServiceProvider<T>>>,
  ): ServiceRegistry<Simplify<T & { [key in TKey]: TOutput }>> {
    return this.add("singleton", key, factory);
  }

  /**
   * Adds a scoped dependency to the register.
   *
   * Scoped dependencies are instantiated once per {@link ServiceProvider}.
   * See {@link ServiceRegistry#scope} for how to create a new scope and {@link ServiceProvider}.
   *
   * @param key Key that the service can be retreived with.
   * @param factory Produces a new instance of the service.
   */
  addScoped<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<ServiceFactory<TOutput, ServiceProvider<T>>>,
  ): ServiceRegistry<Simplify<T & { [key in TKey]: TOutput }>> {
    return this.add("scoped", key, factory);
  }

  /**
   * Adds a transient dependency to the register.
   *
   * Transient dependencies are instantiated every time they are requested from the {@link ServiceProvider}.
   *
   * @param key Key that the service can be retreived with.
   * @param factory Produces a new instance of the service.
   */
  addTransient<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<ServiceFactory<TOutput, ServiceProvider<T>>>,
  ): ServiceRegistry<Simplify<T & { [key in TKey]: TOutput }>> {
    return this.add("transient", key, factory);
  }

  /**
   * Creates a new {@link ServiceProvider}.
   *
   * Scoped dependencies are instantiated once per {@link ServiceProvider}.
   * {@link ServiceProvider}s are effectivelty scopes.
   */
  scope(): Simplify<ServiceProvider<T>> {
    const scoped = new Map<string, any>();

    const entries = Array.from(this.descriptors).map(([key, descriptor]) => {
      if (descriptor.type === "transient") {
        return [key, () => descriptor.factory(provider)] as const;
      }

      const storage = descriptor.type === "scoped" ? scoped : this.singletons;

      return [
        key,
        () => {
          if (storage.has(key)) return storage.get(key)!;
          const created = descriptor.factory(provider);
          storage.set(key, created);
          return created;
        },
      ] as const;
    });

    const provider = Object.fromEntries(entries) as ServiceProvider<T>;
    return provider;
  }
}

/**
 * Provides services by the key that it was registered with.
 */
export type ServiceProvider<
  T extends Record<string, any> = Record<string, any>,
> = {
  [TKey in keyof T]: () => T[TKey];
};
