---
title: Errors
---

Shizuku provides a comprehensive error handling system centered around the `Error` enum in `shizuku::core::error`. The error system is designed to handle different stages of message processing and various failure scenarios.

## Error Categories

The core error types are organized into several categories:

### Pre-Process Errors (`PreProcessError`)

Errors that occur before business logic execution:
- `DeserializeError` - Failed to deserialize incoming messages
- `UnexpectedNullReplySubject` - Missing reply subject for JetStream messages
- `UnexpectedSubject` - Invalid or unexpected NATS subject

### Business Errors (`Error::BusinessError` variants)

Errors during business logic execution:
- `BusinessError` - Regular business logic errors that can be retried
- `BusinessRetryReached` - Business errors after maximum retry attempts
- `BusinessPanicError` - Critical errors that shouldn't be retried

### Post-Process Errors (`PostProcessError`)

Errors that occur after business logic execution:
- `SerializeError` - Failed to serialize outgoing messages
- `NatsMessagePushError` - Failed to publish to NATS core
- `JetStreamMessagePushError` - Failed to publish to NATS JetStream
- `UnexpectedNullReplySubject` - Missing reply subject when trying to reply

### RPC Errors
- `RpcCallRequestError` - Failures during RPC service calls

## Error Creation

Errors can be created using the `new` method available on error types:

```rust
use shizuku::error::{Error, PreProcessError, PostProcessError};

// Create core error
let err = Error::new(my_error);

// Create pre-process error
let pre_err = PreProcessError::new(deserialize_error);

// Create post-process error
let post_err = PostProcessError::new(serialize_error);
```

## Automatic Conversions

Shizuku provides automatic conversions between error types through the `From` trait:

```rust
// SerializeError -> PostProcessError
let post_err: PostProcessError = serialize_error.into();

// DeserializeError -> PreProcessError
let pre_err: PreProcessError = deserialize_error.into();

// PostProcessError -> Error
let error: Error = post_err.into();
```

## Best Practices

1. **Use Appropriate Error Types**
   - Use `BusinessError` for retryable business logic failures
   - Use `BusinessPanicError` for non-retryable critical failures
   - Use specific pre/post-process errors for infrastructure issues

2. **Error Conversion**
   - Leverage automatic conversions instead of manual wrapping
   - Implement `From` for custom error types when needed

3. **Error Context**
   - Include relevant context in error messages
   - Use the error hierarchy to maintain error context through the processing chain

4. **Retry Handling**
   - Let the retry system handle `BusinessError` automatically
   - Use `BusinessPanicError` to prevent retries for critical failures

## Example Usage

```rust
use shizuku::error::{Error, BusinessError};
use anyhow::anyhow;

async fn process_message(msg: Message) -> Result<(), Error> {
    // Business logic error (will be retried)
    if some_condition {
        return Err(Error::BusinessError(
            anyhow!("Invalid message state: {}", msg.state)
        ));
    }

    // Critical error (won't be retried)
    if critical_condition {
        return Err(Error::BusinessPanicError(
            anyhow!("Critical system failure")
        ));
    }

    Ok(())
}
```
