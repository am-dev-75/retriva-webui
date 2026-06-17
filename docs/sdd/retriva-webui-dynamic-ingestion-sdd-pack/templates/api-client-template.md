# Gateway API Client Method Template

## Method

```ts
async function methodName(args): Promise<Result> {}
```

## Endpoint

```http
METHOD /gateway/path
```

## Request

```json
{}
```

## Response

```json
{}
```

## Error handling

- map validation errors to form fields
- show content-free API errors only
- never log credentials or document content
