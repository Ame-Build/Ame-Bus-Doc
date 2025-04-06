---
title: Subject Path
---

## What is a Subject Path?

A Subject Path (`NatsSubjectPath`) is a fundamental type in Ame Bus that represents NATS subject routing paths. It's a structured way to represent dot-separated NATS subjects (e.g., "foo.bar.baz").

## Usage

Subject paths are used to:
- Define message routing in NATS services
- Specify subscription patterns
- Create message matchers for filtering

## Creating Subject Paths

You can create subject paths in several ways:

```rust
use ame_bus::core::message::NatsSubjectPath;

// From string slices
let path = NatsSubjectPath::from(vec!["foo", "bar", "baz"]);

// From owned strings
let path = NatsSubjectPath::from(vec![
    String::from("foo"),
    String::from("bar"),
    String::from("baz")
]);

// From compact strings
let path = NatsSubjectPath::from(vec![
    compact_str::CompactString::new("foo"),
    compact_str::CompactString::new("bar"),
    compact_str::CompactString::new("baz")
]);
```

## Subject Matching

Subject paths work closely with `SubjectMatcher` for pattern matching. The `subject_matcher!` macro provides an easy way to create matchers:

```rust
use ame_bus::subject_matcher;

let path = NatsSubjectPath::from(vec!["foo", "bar", "baz"]);

// Exact match
let matcher = subject_matcher!["foo", "bar", "baz"];
assert!(matcher.matches(&path));

// Wildcard match
let matcher = subject_matcher!["foo", "*", "baz"];
assert!(matcher.matches(&path));

// Multi-level wildcard
let matcher = subject_matcher!["foo", ">"];
assert!(matcher.matches(&path));
```

## Pattern Rules

- `*` matches exactly one segment
- `>` matches one or more segments (must be the last segment)
- Static segments must match exactly

## Best Practices

1. Use descriptive segment names that reflect your message hierarchy
2. Keep subjects reasonably short (3-4 segments is typical)
3. Consider using version numbers in subjects for API versioning
4. Use consistent naming conventions across your application
5. Don't use multi-level wildcards (`>`) unless necessary, as they can make code harder to reason about
