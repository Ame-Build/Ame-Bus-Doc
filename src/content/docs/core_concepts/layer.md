---
title: Layer
---

## What is a Layer?

A Layer is a crucial component in Ame Bus that wraps around a Processor, enabling middleware-like functionality. It provides a clean way to handle cross-cutting concerns by intercepting and potentially modifying both the input and output of a Processor.

Conceptually, a Layer is a monad transformer that can perform operations before and after the execution of a Processor, without the Processor needing to be aware of these operations. This allows for a clear separation between business logic (in Processors) and cross-cutting concerns (in Layers).

## Why Use Layers?

Layers offer several advantages in a functional microservice architecture:

1. **Separation of concerns** - Keep cross-cutting concerns separate from business logic
2. **Composability** - Layers can be stacked and combined in different orders
3. **Reusability** - Common functionality like retry logic, logging, or metrics can be implemented once and reused
4. **Non-intrusive** - Add functionality without modifying existing Processors
5. **Functional approach** - Aligns with functional programming principles by treating operations as transformations

## Core Layer Trait

The fundamental trait that defines a Layer is:

```rust
pub trait Layer<I, O, P: Processor<I, O>> {
    /// Wrap the processor and return the output.
    fn wrap<'wrapper, 'processor>(
        &'wrapper self,
        processor: &'processor P,
        input: I,
    ) -> impl Future<Output = O> + Send + 'wrapper + 'processor
    where
        I: 'wrapper + 'processor,
        'processor: 'wrapper;
}
```

Where:
- `I` - The input type the processor accepts
- `O` - The output type the processor produces
- `P` - The Processor type being wrapped
- The return type is an implementor of `Future` that is `Send` and lives at least as long as the borrow of both the wrapper and processor

:::note
The lifetime bounds `'wrapper` and `'processor` with `'processor: 'wrapper` ensure that the returned future doesn't outlive either the Layer or the Processor, preventing potential dangling references.
:::

## Built-in Layers

Ame Bus provides several built-in Layers for common patterns:

### `RetryLayer`

The `RetryLayer` automatically retries a Processor's execution when it encounters errors, with configurable retry limits:

```rust
pub struct RetryLayer {
    /// The maximum number of retries.
    pub max_retry: usize,
}

impl<Input, Success, P> Layer<Input, Result<Success, Error>, P> for RetryLayer
where
    P: Processor<Input, Result<Success, Error>> + Send + Sync,
    Input: Clone + Send + Sync,
{
    fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: Input,
    ) -> impl Future<Output = Result<Success, Error>> + Send + 'w + 'p
    where
        Input: 'w + 'p,
        'p: 'w,
    {
        // Implementation details omitted for brevity
    }
}
```

:::tip
The `RetryLayer` only retries on `BusinessError`s. Other error types, like parsing failures, are immediately returned without retry attempts.
:::

## Implementation Guide

When implementing your own Layers, follow these best practices:

1. **Keep Layers focused** - Each Layer should address a single concern
2. **Consider performance** - Be mindful of cloning inputs or heavy operations
3. **Handle lifetimes carefully** - Understand how lifetime parameters affect the Layer's behavior
4. **Preserve type signatures** - Layers should generally not change the input/output types unless necessary
5. **Make dependencies explicit** - Any external dependencies should be fields of your Layer

### Basic Implementation Example

Here's how to implement a simple metrics-collecting Layer:

```rust
struct MetricsLayer {
    metrics_client: &'static MetricsClient,
}

impl<Input, Output, P> Layer<Input, Output, P> for MetricsLayer
where
    P: Processor<Input, Output> + Send + Sync,
    Input: Send + Sync,
    Output: Send + Sync,
{
    async fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: Input,
    ) -> Output {
        let processor_name = std::any::type_name::<P>();
        let timer = self.metrics_client.start_timer(processor_name);
            
        // Process the input
        let result = processor.process(input).await;
            
        // Record duration
        timer.observe_duration();
            
        // Increment success/failure counters
        match &result {
            Ok(_) => self.metrics_client.increment_success(processor_name),
            Err(_) => self.metrics_client.increment_failure(processor_name),
        }
            
        result
    }
}
```

## Using Layers with FinalProcessor

While there is no separate `FinalLayer` trait, the standard `Layer` trait can be used with both `Processor` and `FinalProcessor` implementations. When working with a `FinalProcessor`, the Layer would typically be part of the service construction and owned by the a structure that implements the `FinalProcessor`.

```rust
struct MyService {
    processor: Arc<MyFinalProcessor>,
    retry_layer: RetryLayer,
}

impl FinalProcessor<Input, Output> for MyService {
    async fn process(state: Arc<Self>, input: Input) -> Output {
        // Apply the layer to the processor
        state.retry_layer.wrap(&state.processor, input).await
    }
}
```

:::note
Layers are always owned by another component (either another Layer, a Processor, or a FinalProcessor), which eliminates lifetime issues since the Layer never outlives its owner.
:::
