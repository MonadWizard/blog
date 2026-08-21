# Skill: Create a New Astro Component

## File Location

`src/components/ComponentName.astro`

Use **PascalCase** filenames: `MyComponent.astro`

## Template

```astro
---
interface Props {
  requiredProp: string;
  optionalProp?: number;
}

const { requiredProp, optionalProp = 0 } = Astro.props;
---

<div class="tailwind-classes">
  <p>{requiredProp}</p>
  <slot />
</div>
```

## Conventions

- **Always** define a `Props` interface (even if empty — provides IDE autocomplete)
- Use Tailwind utility classes — avoid scoped `<style>` blocks unless truly necessary
- Dark mode: use `dark:` Tailwind variant (works because `BaseLayout` adds `class="dark"` to `<html>`)
- Client-side JS: use `<script>` (bundled & deduplicated by Astro) for most cases
- Use `<script is:inline>` only when you need to pass server-rendered values or use `data-*` attributes (e.g. Giscus)

## Importing in a Parent

```astro
---
import MyComponent from '../components/MyComponent.astro';
// or from a page:
import MyComponent from '../../components/MyComponent.astro';
---

<MyComponent requiredProp="hello" optionalProp={42} />
```

## Passing HTML to a Component (slots)

```astro
<!-- Parent -->
<MyComponent>
  <p>This goes in the default slot</p>
</MyComponent>

<!-- Named slots -->
<MyComponent>
  <Fragment slot="header">Header content</Fragment>
  <p>Default slot content</p>
</MyComponent>

<!-- Component definition with named slot -->
<div>
  <slot name="header" />
  <slot /> <!-- default slot -->
</div>
```

## Dynamic HTML with set:html

Use `set:html` (not `innerHTML`) for rendering trusted HTML strings (e.g. SVG icons):

```astro
<span set:html={svgIconString} />
```

Never use `set:html` with user-generated content — no sanitization is applied.
