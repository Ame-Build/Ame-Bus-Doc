---
title: No Mock
---

In Shizuku, we advocate for a "no mock" approach to testing. This philosophy stems from the observation that tests with mocks often test implementation details rather than behavior, leading to brittle tests that provide false confidence.

## Why Avoid Mocks?

Mock-based tests typically:
- Test implementation details instead of behavior
- Break when refactoring, even when behavior remains unchanged
- Create maintenance overhead
- Provide false confidence about system behavior

## Best Practices

### 1. Pure Functions for Core Logic

Extract core algorithms into pure functions that:
- Take all dependencies as parameters
- Have no side effects
- Return consistent results for same inputs
- Are easily testable without mocks

```rust
// Bad: Logic mixed with I/O
async fn process_order(db: &Database, order: Order) {
    let total = calculate_total(&order);
    db.save_order(order).await?;
    send_notification(total).await?;
}

// Good: Pure function for core logic
fn calculate_order_total(items: &[OrderItem]) -> Money {
    items.iter()
         .fold(Money::zero(), |acc, item| acc + item.price * item.quantity)
}
```

### 2. Integration Tests for I/O

Test real I/O operations in integration tests:
- Use actual databases (like test containers)
- Connect to real NATS instances
- Test complete workflows
- Verify actual system behavior

```rust
#[tokio::test]
async fn test_order_processing() {
    let nats = TestNatsServer::start().await;
    let db = TestDatabase::setup().await;
    
    // Test real workflow
    let service = OrderService::new(nats.client(), db.connection());
    let result = service.process_order(test_order()).await;
    
    assert!(result.is_ok());
    assert!(db.order_exists(test_order.id).await);
}
```

### 3. Strategy Pattern with Pure Functions

Implement strategies as pure functions that can be tested independently:

```rust
// Strategy trait using pure functions
trait PricingStrategy: Send + Sync {
    fn calculate_price(&self, quantity: u32, base_price: Money) -> Money;
}

// Easily testable implementation
struct BulkDiscountStrategy {
    threshold: u32,
    discount_percentage: f64,
}

impl PricingStrategy for BulkDiscountStrategy {
    fn calculate_price(&self, quantity: u32, base_price: Money) -> Money {
        if quantity >= self.threshold {
            base_price * quantity * (1.0 - self.discount_percentage)
        } else {
            base_price * quantity
        }
    }
}
```

### 4. Separating Logic from I/O Using Processors

The key idea is to separate your business logic from I/O operations. By using `Processor<I, Result<O, Error>>`, we can:

1. **Keep Logic Pure**: 
   - Validation processors contain only business rules
   - No database calls, HTTP requests, or file operations
   - Pure functions that transform data

2. **Chain Transformations**:
   - Each processor focuses on one transformation
   - Results flow from one processor to the next
   - Early returns on validation failures

3. **Handle I/O at Edges**:
   - Keep I/O operations at the outer layer
   - Core business logic remains pure
   - Only test I/O in integration tests

For example, instead of:
```rust
async fn process_order(db: &DB, order: Order) -> Result<OrderId, Error> {
    let user = db.get_user(order.user_id).await?;  // I/O
    let plan = db.get_plan(user.plan_id).await?;   // I/O
    validate_order(&order, &plan)?;                // Logic
    db.save_order(order).await                     // I/O
}
```

Split into pure processors:
```rust
// Pure logic - easily testable without mocks
impl Processor<(Order, Plan), Result<ValidatedOrder, Error>> for OrderValidator {
    async fn process(&self, (order, plan): (Order, Plan)) -> Result<ValidatedOrder, Error> {
        // Only business rules, no I/O
        validate_order_against_plan(&order, &plan)
    }
}

// I/O happens only in the final layer
impl FinalProcessor<Order, Result<OrderId, Error>> for OrderService {
    async fn process(state: Arc<Self>, order: Order) -> Result<OrderId, Error> {
        let plan = state.db.get_plan(order.plan_id).await?;
        let validated = state.validator.process((order, plan)).await?;
        state.db.save_order(validated).await
    }
}
```

This approach means:
- Business logic can be tested without mocks
- I/O operations are isolated and explicit
- Core rules are protected from external concerns

This approach:
- Makes validation logic pure and testable
- Provides type-safe error handling
- Creates composable validation chains
- Maintains clear data flow through type signatures

:::tip
See [Monad](/best_practice/monad) for detailed patterns on using `Processor<I, Result<O, Error>>` to create clean, composable validation chains.
:::

## Benefits of No-Mock Approach

1. **Reliable Tests**: Tests verify actual behavior, not implementation details
2. **Refactoring Confidence**: Tests remain valid when implementation changes
3. **Better Design**: Encourages separation of pure logic from I/O
4. **Simplified Testing**: No need to maintain complex mock objects
5. **Real Coverage**: Test coverage reflects actual system behavior

## When to Use Test Doubles

While we avoid mocks, some test doubles are acceptable:
- Stubs for providing test data
- Fakes for simulating complex but pure behavior
- Test containers for real but isolated services

Remember: The goal is to test behavior, not implementation.

