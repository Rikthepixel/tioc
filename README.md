# tioc
A simple Inversion of Control container library for node


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
 * Factory that produces an object using the IoC container
 */
export type IoCFactory<
  T = any,
  TContainer extends IoCContainer = IoCContainer,
> = (container: Simplify<TContainer>) => T;

/**
 * Available dependency scopes
 * - "singleton" Only instantiated once per {@link IoCRegister}
 * - "scoped" Only instantiaetd once per scope see {@link IoCRegister#scope}
 * - "transient" Instantiated every time it is requested
 */
export type DescriptorType = "singleton" | "scoped" | "transient";

type Descriptor<T, TContainer extends IoCContainer> = {
  type: DescriptorType;
  factory: (container: TContainer) => T;
};

/**
 * Contains the registrations for the dependencies.
 *
 * @see {IoCRegister#create} to instantiate the register
 * @see {IoCRegister#scope} to create a {@link IoCContainer}
 *
 */
export class IoCRegister<T extends Record<string, any> = {}> {
  private constructor(
    private descriptors: Map<string, Descriptor<any, IoCContainer>>,
  ) {}

  static create() {
    return new IoCRegister(new Map());
  }

  private singletons = new Map<string, any>();

  /**
   * Adds a dependency to the register with the chosen {@link DescriptionType}
   *
   * Available dependency scopes
   * - "singleton" Only instantiated once per {@link IoCRegister}
   * - "scoped" Only instantiaetd once per scope see {@link IoCRegister#scope}
   * - "transient" Instantiated every time it is requested
   */
  add<TKey extends string, TOutput>(
    type: DescriptorType,
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<IoCFactory<TOutput, IoCContainer<T>>>,
  ): IoCRegister<Simplify<T & { [key in TKey]: TOutput }>> {
    const descriptors = new Map(this.descriptors);
    descriptors.set(key, { type: type, factory: factory as IoCFactory });
    return new IoCRegister(descriptors);
  }

  /**
   * Adds a singleton dependency to the register.
   *
   * Singletons are instantiated once per register.
   */
  addSingleton<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<IoCFactory<TOutput, IoCContainer<T>>>,
  ) {
    return this.add("singleton", key, factory);
  }

  /**
   * Adds a scoped dependency to the register.
   *
   * Scoped dependencies are instantiated once per IoCContainer.
   * See {@link IoCRegister#scope} for how to create a new scope and IoCContainer.
   */
  addScoped<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<IoCFactory<TOutput, IoCContainer<T>>>,
  ) {
    return this.add("scoped", key, factory);
  }

  /**
   * Adds a transient dependency to the register.
   *
   * Transient dependencies are instantiated every time they are requested.
   */
  addTransient<TKey extends string, TOutput>(
    key: Exclude<TKey, keyof T>,
    factory: SimplifyFn<IoCFactory<TOutput, IoCContainer<T>>>,
  ) {
    return this.add("transient", key, factory);
  }

  /**
   * Creates a new IoCContainer.
   *
   * Scoped dependencies are instantiated once per IoCContainer.
   * IoCContainers are effectivelty scopes.
   */
  scope(): Simplify<IoCContainer<T>> {
    const scoped = new Map<string, any>();

    const entries = Array.from(this.descriptors).map(([key, descriptor]) => {
      if (descriptor.type === "transient") {
        return [key, () => descriptor.factory(container)] as const;
      }

      const storage = descriptor.type === "scoped" ? scoped : this.singletons;

      return [
        key,
        () => {
          if (storage.has(key)) return storage.get(key)!;
          const created = descriptor.factory(container);
          storage.set(key, created);
          return created;
        },
      ] as const;
    });

    const container = Object.fromEntries(entries) as IoCContainer<T>;
    return container;
  }
}

export type IoCContainer<T extends Record<string, any> = Record<string, any>> =
  {
    [TKey in keyof T]: () => T[TKey];
  };
