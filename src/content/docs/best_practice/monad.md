---
title: Monads
---

![Monads Meme](../../../assets/monads-meme.jpg)

Shizuku encourages the use of monadic patterns through `Processor<I, Result<O, Error>>` to create clean, composable validation and transformation chains. Rather than providing built-in monadic tools, Shizuku allows you to implement custom monadic patterns that fit your specific business logic needs.

## Understanding Monadic Processors

A monadic processor chain allows you to:
- Pass relevant data between sequential operations
- Handle failures gracefully with early returns
- Maintain type safety throughout the chain
- Keep complex business logic readable and maintainable

## Implementation Patterns

### Custom Result Types

Define result types that carry the specific information needed for your use case:

```rust
struct PlanInfo {
    level: PlanLevel,
    limits: PlanLimits,
}

struct FeatureAccess {
    allowed: bool,
    max_items: usize,
}

// Processor that determines plan information
struct PlanProcessor {
    db: DatabaseConnection,
}

impl Processor<UserId, Result<Option<PlanInfo>, QueryError>> for PlanProcessor {
    async fn process(&self, user_id: UserId) -> Result<Option<PlanInfo>, QueryError> {
        // Query and return plan information
    }
}

// Processor that determines feature access based on plan
struct FeatureAccessProcessor {
    feature_rules: FeatureRules,
}

impl Processor<PlanInfo, Result<FeatureAccess, ValidationError>> for FeatureAccessProcessor {
    async fn process(&self, plan: PlanInfo) -> Result<FeatureAccess, ValidationError> {
        // Determine access rules based on plan
    }
}
```

### Composing Processors

Chain processors together based on your business logic requirements:

```rust
impl Processor<UserRequest, Result<ProcessedData, Error>> for RequestProcessor {
    async fn process(&self, request: UserRequest) -> Result<ProcessedData, Error> {
        // Get plan information
        let plan_info = self.plan_processor
            .process(request.user_id)
            .await?
            .ok_or(Error::PlanNotFound)?;

        // Check feature access
        let access = self.feature_processor
            .process(plan_info)
            .await?;

        // Validate request against access limits
        if request.items.len() > access.max_items {
            return Err(Error::LimitExceeded);
        }

        // Process the actual request
        self.data_processor.process(request).await
    }
}
```

## Best Practices

### 1. Clear Type Signatures

Make your data flow explicit through type signatures:
- Use specific error types for different stages
- Consider using `Option` when data might not exist
- Define custom types to carry relevant information

### 2. Error Context

Preserve error context through the chain:
- Use custom error types for different processing stages
- Include relevant context in error messages
- Consider using error wrapping patterns

### 3. Granular Processors

Keep processors focused and composable:
- Each processor should handle one specific aspect
- Make dependencies explicit in processor structs
- Allow for flexible composition based on requirements

## When to Use

Implement monadic patterns when you need to:
- Chain multiple validation steps
- Transform data through several stages
- Handle complex authorization flows
- Maintain context through a processing pipeline

Remember that while monadic patterns can make complex flows more manageable, they should be implemented based on your specific requirements rather than following a one-size-fits-all approach.

