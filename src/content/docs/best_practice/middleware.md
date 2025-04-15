---
title: Middleware
---

Middleware in Shizuku is implemented through the `Layer` trait, providing a powerful way to handle cross-cutting concerns like authentication, authorization, validation, and logging. This guide covers best practices for implementing and using middleware effectively.

## Common Middleware Patterns

### Authentication Layer

Here's an example of a JWT authentication layer:

```rust
struct JwtLayer {
    jwt_secret: String,
}

impl<I, O, P> Layer<I, O, P> for JwtLayer
where
    P: Processor<I, O> + Send + Sync,
    I: AsRef<Message> + Clone + Send + Sync,
    O: Send,
{
    async fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: I,
    ) -> O
    where
        I: 'w + 'p,
        'p: 'w,
    {
        let message = input.as_ref();
        let token = extract_token(message)?;
        validate_jwt(token, &self.jwt_secret)?;
        processor.process(input).await
    }
}
```

### Authorization Layer

A layer for checking resource permissions:

```rust
struct PermissionLayer {
    acl_client: Arc<AclClient>,
}

impl<I, O, P> Layer<I, O, P> for PermissionLayer
where
    P: Processor<I, O> + Send + Sync,
    I: HasResourceId + Clone + Send + Sync,
    O: Send,
{
    async fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: I,
    ) -> O
    where
        I: 'w + 'p,
        'p: 'w,
    {
        let resource_id = input.resource_id();
        self.acl_client.check_permission(resource_id).await?;
        processor.process(input).await
    }
}
```

### Validation Layer

Input validation middleware:

```rust
struct ValidationLayer;

impl<I, O, P> Layer<I, O, P> for ValidationLayer
where
    P: Processor<I, O> + Send + Sync,
    I: Validate + Clone + Send + Sync,
    O: Send,
{
    async fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: I,
    ) -> O
    where
        I: 'w + 'p,
        'p: 'w,
    {
        input.validate()?;
        processor.process(input).await
    }
}
```

## Best Practices

### 1. Keep Layers Focused

Each layer should handle a single responsibility:
- Authentication layer only handles token validation
- Authorization layer only checks permissions
- Validation layer only validates input structure

### 2. Layer Ordering

Order your layers carefully when composing them:
1. Technical layers first (logging, metrics)
2. Security layers next (auth, permissions)
3. Business logic layers last (validation, transformation)

Example of composing multiple layers:

```rust
struct MyService {
    metrics_layer: MetricsLayer,
    auth_layer: JwtLayer,
    permission_layer: PermissionLayer,
    validation_layer: ValidationLayer,
    processor: MyProcessor,
}

impl Processor<Message, Result<Bytes, Error>> for MyService {
    async fn process(&self, input: Message) -> Result<Bytes, Error> {
        // Layers are applied from outside in
        self.metrics_layer.wrap(
            &self.auth_layer.wrap(
                &self.permission_layer.wrap(
                    &self.validation_layer.wrap(
                        &self.processor,
                        input
                    ).await
                ).await
            ).await
        ).await
    }
}
```

### 3. Error Handling

- Use appropriate error types for different scenarios
- Return early from layers when prerequisites aren't met
- Avoid swallowing errors in middleware

```rust
impl<I, O, P> Layer<I, Result<O, Error>, P> for AuthLayer
where
    P: Processor<I, Result<O, Error>>,
{
    async fn wrap<'w, 'p>(
        &'w self,
        processor: &'p P,
        input: I,
    ) -> Result<O, Error> {
        match self.authenticate(&input).await {
            Ok(_) => processor.process(input).await,
            Err(e) => Err(Error::PreProcessError(e.into())),
        }
    }
}
```

### 4. State Management

- Use `Arc` for shared state in layers
- Keep layer state immutable when possible
- Use configuration structs for layer initialization

```rust
struct RateLimitLayer {
    limiter: Arc<RateLimiter>,
    config: RateLimitConfig,
}

impl RateLimitLayer {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            limiter: Arc::new(RateLimiter::new(config.max_requests)),
            config,
        }
    }
}
```

### 5. Performance Considerations

- Avoid unnecessary cloning in layers
- Use async operations efficiently
- Consider caching layer results when appropriate
- Profile layer performance impact

## Common Pitfalls

1. **Excessive Layers**: Too many layers can impact performance and make debugging difficult
2. **Wrong Layer Order**: Incorrect ordering can lead to security vulnerabilities
3. **Shared State Issues**: Mutable state in layers can cause race conditions
4. **Heavy Operations**: Performing heavy computations in layers can block processing

:::note
For better scalability and reliability, prefer storing state in KV Store or database instead of keeping it in memory. Shizuku's KV Store provides distributed storage with atomic operations and locking mechanisms, making it ideal for shared state management. This approach makes your application truly stateless and easier to scale horizontally.

Example using KV Store for rate limiting state:
```rust
struct RateLimitState {
    requests: u64,
    last_reset: DateTime<Utc>,
}

impl StaticKeyIndexedValue for RateLimitState {
    fn key() -> String {
        "rate_limit.state".to_string()
    }
}

struct RateLimitLayer {
    store: &'static Store,
    max_requests: u64,
}

impl RateLimitLayer {
    async fn check_rate_limit(&self) -> Result<(), Error> {
        let state = RateLimitState::read_from(self.store, RateLimitState::key()).await?;
        // Update state atomically using KV Store operations
        // This ensures consistent rate limiting across multiple instances
    }
}
```
:::

## Testing Layers

Write comprehensive tests for your layers:

```rust
#[tokio::test]
async fn test_jwt_layer() {
    let layer = JwtLayer::new("secret");
    let processor = MockProcessor::new();

    // Test valid token
    let result = layer
        .wrap(&processor, create_test_input("valid_token"))
        .await;
    assert!(result.is_ok());

    // Test invalid token
    let result = layer
        .wrap(&processor, create_test_input("invalid_token"))
        .await;
    assert!(matches!(result, Err(Error::PreProcessError(_))));
}
```


