---
model: mebaco-development-model
modelVersion: "1"
scope: styles
authority: normative
---

# Mebaco style model

## Style definitions and applications

A `style` is a reusable definition identified by a stable `styleId` and a human-facing `id`. It can contain rules, animations, parameters, local definitions, keyframes, and references to base styles.

View elements such as tags apply styles by reference. An application can include a condition and parameter arguments. A style definition, a base-style relationship, and a style application are different contexts with different parameter rules.

## Rules and values

A declaration rule has a property and a value. A style value can be:

- `literal`: a fixed string value;
- `formula`: an expression evaluated in the available runtime scope.

Do not assume that the stored source is the final CSS value. Formula values can depend on props, state, retained declarations, or other available inputs.

Styles can also define state-specific declarations for:

- hover;
- focus;
- focus-visible;
- checked;
- active;
- disabled.

Review both ordinary rules and applicable state rules when explaining appearance or interaction feedback.

## Parameters

A `style-param` defines a reusable style input with:

- a stable `parameterId`;
- a human-facing `id`;
- a value type: string, number, boolean, or color;
- an optional default value.

Parameters form part of the style's public contract. They are not merely documentation. Inherited and applied styles bind arguments by stable parameter ID.

## Inheritance

A style can reference one or more base styles. Each base relationship contains:

- the referenced `styleId`;
- an optional formula condition;
- arguments for the base style's parameters;
- a stable reference ID for the relationship.

Multiple bases are possible. Resolve the complete inheritance graph before describing the effective style. Detect missing references, cycles, and incompatible parameter contracts.

## Parameter binding modes

In a base-style relationship, each parameter can use one of three binding modes:

### `value`

The derived style supplies a concrete literal or formula value. The parameter is resolved at this inheritance edge.

### `default`

The base parameter is resolved using its declared default or the model's defined type default behavior. Whether this binding is valid depends on that parameter's contract; do not infer validity only from a missing explicit `defaultValue` field.

### `delegate`

The derived style deliberately leaves the parameter abstract and exposes it through its own effective contract. A downstream derived style or final application must later resolve it.

Delegation is how a style preserves configurability across inheritance. Do not report a delegated parameter as missing merely because it remains unresolved at an intermediate style.

## Inheritance versus application

Delegation is valid for style inheritance. It is not valid at a final view-element style application. An application can bind a parameter to a value or use an available default, but it cannot pass an unresolved contract onward.

Conceptually:

```text
base style parameter
    ├─ value     -> resolved here
    ├─ default   -> resolved from the base default
    └─ delegate  -> remains abstract on the derived style
```

At final application, all effective parameters must be bound. Application bindings cannot delegate. Depending on the parameter contract, the default binding may resolve through a declared default or a type default.

## Conditions and effective appearance

A style application or base relationship may be conditional. A referenced style is therefore not necessarily active in every runtime state. Effective appearance can depend on:

- application conditions;
- inheritance conditions;
- formula-valued declarations;
- parameter arguments and defaults;
- delegated parameters;
- state-specific rules;
- animations and keyframes.

## Review requirements

For detailed style analysis:

1. Resolve the applied style by stable style ID.
2. Traverse its base-style graph.
3. Resolve the effective parameter contract.
4. Distinguish value, default, and delegated bindings.
5. Evaluate whether all final application arguments are bound and valid under the style parameter contract, including type-default behavior.
6. Inspect literal and formula-valued rules.
7. Include state rules, conditions, animations, and keyframes when relevant.
8. Report missing styles, cycles, parameter conflicts, invalid bindings, and incomplete final applications with evidence.

Do not flatten inheritance without preserving where each value was fixed, defaulted, or delegated. That provenance is part of the design intent.
