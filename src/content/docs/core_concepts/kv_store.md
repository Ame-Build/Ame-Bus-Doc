---
title: KV Store
---

KV Store in Shizuku provides a high-level abstraction over NATS JetStream's Key-Value store. It offers features like atomic operations, distributed locking, and structured data storage.

For more information, see [API Reference](https://docs.rs/shizuku/latest/shizuku/kv/index.html)

## Basic Operations

The KV Store functionality is built around the `KeyValue` trait, which provides basic operations for storing and retrieving data. Here's how to use it with dynamic keys:

```rust
use shizuku::kv::KeyValue;

// Read a value with dynamic key
let value = MyDynamicValue::read_from(&store, key).await?;

// Write a value
my_value.write_to_anyway(&store).await?;

// Atomic write with version check
my_value.write_to_atomically(&store, revision).await?;

// Delete a value
MyDynamicValue::delete_anyway(&store, key).await?;
```

## Static Key Values

For values that always use the same key, you should implement the `StaticKeyIndexedValue` trait instead of using dynamic keys. This is the recommended approach for most use cases:

```rust
use shizuku::kv::{KeyValue, StaticKeyIndexedValue};

// Define a type with a static key
struct MyConfig {
    // your fields here
}

impl StaticKeyIndexedValue for MyConfig {
    fn key() -> String {
        "app.config".to_string()
    }
}

// Now you can use the KV operations
let value = MyConfig::read_from(&store, MyConfig::key()).await?;

// Write a value
my_config.write_to_anyway(&store).await?;

// Atomic write with version check
my_config.write_to_atomically(&store, revision).await?;

// Delete a value
MyConfig::delete_anyway(&store, MyConfig::key()).await?;
```

This approach is particularly useful for configuration-like values that have fixed keys.

## Distributed Read-Write Lock

Shizuku provides a distributed read-write lock implementation through `DistroRwLock`. This lock follows these principles:
1. Multiple readers can access the resource simultaneously
2. Only one writer can access the resource at a time
3. Writers have priority - new read requests are blocked when a writer is waiting

### Basic Lock Usage

```rust
use shizuku::kv::rw_lock::DistroRwLock;

// Acquire read lock
DistroRwLock::acquire_read(&store, "my-resource").await?;
// ... perform read operations ...
DistroRwLock::release_read(&store, "my-resource").await?;

// Acquire write lock
DistroRwLock::acquire_write(&store, "my-resource").await?;
// ... perform write operations ...
DistroRwLock::release_write(&store, "my-resource").await?;
```

### RAII Lock Wrappers

For safer lock handling, Shizuku provides RAII-style wrappers that automatically acquire and release locks. Since these wrappers are lightweight (containing only an `Arc<P>`, `&'static Store`, and a key), they can be created on demand:

```rust
use shizuku::kv::rw_lock::{LockedResourceReadProcessor, LockedResourceWriteProcessor};

// Create read-locked processor on the fly
let result = LockedResourceReadProcessor::new(
    Arc::new(my_processor),
    &store,
    "my-resource"
).process(input).await?;

// Create write-locked processor on the fly
let result = LockedResourceWriteProcessor::new(
    Arc::new(my_processor),
    &store,
    "my-resource"
).process(input).await?;
```

## Watching for Changes

You can watch for changes to values in the KV store:

```rust
use shizuku::kv::KeyValueRead;

let watch = MyValue::watch(&store, key).await?;
while let Some(entry) = watch.next().await {
    // Handle updated value
}
```

## Error Handling

The KV store operations can produce several types of errors:

- `KvReadError`: Errors during read operations
- `KvWriteError`: Errors during write operations
- `WithLockProcessError`: Errors when using lock processors
- `DistroRwLockError`: Errors specific to distributed lock operations

Always handle these errors appropriately in your application code.

## Best Practices

1. Use RAII lock wrappers (`LockedResourceReadProcessor` and `LockedResourceWriteProcessor`) instead of manual lock acquisition/release when possible
2. Implement `StaticKeyIndexedValue` for configuration-like values that have fixed keys
3. Use atomic operations when you need to ensure consistency
4. Consider using the watch functionality for reactive updates to stored values
5. Keep lock holding times as short as possible to prevent contention

## Security Note

The KV Store does not encrypt data by default. If you need to store sensitive information (more sensitive than database passwords), implement your own encryption before storing the data.

## Configuration Storage Example

KV Store is ideal for storing application configuration like database credentials. Here's a recommended pattern:

```rust
use shizuku::kv::{KeyValue, StaticKeyIndexedValue};
use serde::{Serialize, Deserialize};
use shizuku::JsonByteDes;

#[derive(Serialize, Deserialize, JsonByteDes)]
struct DatabaseConfig {
    url: String,
    username: String,
    password: String,
    max_connections: u32,
}

impl StaticKeyIndexedValue for DatabaseConfig {
    fn key() -> String {
        "config.database".to_string()
    }
}

async fn initialize_database(store: &Store) -> Result<DatabasePool, Error> {
    // Read config from KV store
    let config = match DatabaseConfig::read_from(store, DatabaseConfig::key()).await? {
        Some(config) => config,
        None => return Err(Error::ConfigNotFound),
    };

    // Initialize database connection pool
    DatabasePool::connect(&config.url)
        .with_credentials(&config.username, &config.password)
        .with_max_connections(config.max_connections)
        .build()
        .await
}
```

Since KV Store is distributed, you can update the configuration on any node and all other nodes will receive the updates. While KV Store doesn't encrypt data by default, it's secure enough for database credentials. For more sensitive data, implement your own encryption.

