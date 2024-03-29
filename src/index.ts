export type InjectionScopes = "singleton" | "scoped" | "transient";

export type InjectionResolver<
  TResult extends object,
  TContainer extends IoCContainer = IoCContainer,
> = (c: TContainer) => TResult;

interface Injection<TResult extends object> {
  resolver: InjectionResolver<TResult>;
  instance: TResult | null;
}
interface TransientInjection<TResult extends object>
  extends Omit<Injection<TResult>, "instance"> {}

type RecordToScoped<TRecord extends Record<string, object>> = {
  [TKey in keyof TRecord]: Injection<TRecord[TKey]>;
};

type RecordToTransients<TRecord extends Record<string, object>> = {
  [TKey in keyof TRecord]: TransientInjection<TRecord[TKey]>;
};

export interface SingletonRecords extends Record<string & {}, object> {}

export default class IoCContainer<
  TSingleton extends Record<string, object> = SingletonRecords,
  TScoped extends Record<string, object> = {},
  TTransient extends Record<string, object> = {},
  TAllRegistered extends Record<string, object> = Omit<
    TSingleton,
    keyof TTransient | keyof TScoped
  > &
    Omit<TScoped, keyof TTransient> &
    TTransient,
> {
  private static singletons: RecordToScoped<Record<string, object>> = {};

  constructor(
    private scoped: RecordToScoped<TScoped> = {} as RecordToScoped<TScoped>,
    private transients: RecordToTransients<TTransient> = {} as RecordToTransients<TTransient>,
  ) {}

  /**
   *
   * Adds a singleton to the IoCContainer
   *
   * Singletons instances are tied to the lifetime of the application.
   * These instances are added to a static map property on the IoCContainer class.
   *
   * If the key is already in the IoCContainer, the resolver will be overriden, but if there is an instance it will remain,
   */
  addSingleton<
    TKey extends string,
    TResult extends object,
    TNextContainer = IoCContainer<
      Omit<TSingleton, TKey> & { [key in TKey]: TResult },
      TScoped,
      TTransient
    >,
  >(key: TKey, resolver: InjectionResolver<TResult, this>): TNextContainer {
    const singletonRecords = IoCContainer.singletons as RecordToScoped<{
      [key in TKey]: TResult;
    }>;

    type TResolver = InjectionResolver<TResult, IoCContainer>;
    if (key in singletonRecords) {
      singletonRecords[key].resolver = resolver as TResolver;
    } else {
      singletonRecords[key] = {
        resolver: resolver as TResolver,
        instance: null,
      };
    }

    return this as object as TNextContainer;
  }

  /**
   *
   * Adds a scoped instance to the IoCContainer
   *
   * Scoped instances are tied to the lifetime of the container.
   * For example, if you wrap the IoCContainer within middleware, you could tie the lifetime to the lifetime of the request or request-context.
   *
   * If the key is already in the IoCContainer, the resolver will be overriden, but if there is an instance it will remain.
   */
  addScoped<
    TKey extends string,
    TResult extends object,
    TNextContainer = IoCContainer<
      TSingleton,
      Omit<TScoped, TKey> & { [key in TKey]: TResult },
      TTransient
    >,
  >(key: TKey, resolver: InjectionResolver<TResult, this>): TNextContainer {
    (this.scoped as object as RecordToScoped<{ [key in TKey]: TResult }>)[key] =
      {
        resolver: resolver as InjectionResolver<TResult, IoCContainer>,
        instance: null,
      };
    return this as object as TNextContainer;
  }

  /**
   *
   * Adds a transient to the IoCContainer
   *
   * Transients are created every time they are requested
   */
  addTransient<
    TKey extends string,
    TResult extends object,
    TNextContainer = IoCContainer<
      TSingleton,
      TScoped,
      Omit<TTransient, TKey> & { [key in TKey]: TResult }
    >,
  >(key: TKey, resolver: InjectionResolver<TResult, this>): TNextContainer {
    (
      this.transients as object as RecordToTransients<{
        [key in TKey]: TResult;
      }>
    )[key] = {
      resolver: resolver as InjectionResolver<TResult, IoCContainer>,
    };

    return this as object as TNextContainer;
  }

  private resolveTransient<TKey extends keyof TTransient>(
    key: TKey,
  ): TTransient[TKey] {
    const { resolver } = this.transients[key];
    return resolver(this);
  }

  private resolveScoped<TKey extends keyof TScoped>(key: TKey): TScoped[TKey] {
    const record = this.scoped[key];
    if (!record.instance) {
      record.instance = record.resolver(this);
    }
    return record.instance;
  }

  private resolveSingleton<TKey extends keyof TSingleton>(
    key: TKey,
  ): TSingleton[TKey] {
    const record = (
      IoCContainer.singletons as RecordToScoped<Record<TKey, TSingleton[TKey]>>
    )[key];
    if (!record.instance) {
      record.instance = record.resolver(this);
    }
    return record.instance;
  }

  /**
   * Resolves the dependency from the IoCContainer.
   */
  public resolve<TKey extends keyof TAllRegistered>(
    key: TKey,
  ): TAllRegistered[TKey] {
    switch (true) {
      case key in this.transients:
        return this.resolveTransient(
          key as keyof TTransient,
        ) as object as TAllRegistered[TKey];

      case key in this.scoped:
        return this.resolveScoped(
          key as keyof TScoped,
        ) as object as TAllRegistered[TKey];

      default:
      case key in IoCContainer.singletons:
        return this.resolveSingleton(
          key as keyof TSingleton,
        ) as object as TAllRegistered[TKey];
    }
  }

  public clone(): IoCContainer<TSingleton, TScoped, TTransient> {
    return new IoCContainer<TSingleton, TScoped, TTransient>(
      structuredClone(this.scoped),
      structuredClone(this.transients),
    );
  }
}
