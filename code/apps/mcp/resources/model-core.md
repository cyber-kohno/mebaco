---
model: mebaco-development-model
modelVersion: "1"
scope: stable-core
authority: normative
---

# Mebaco development model: core

## Purpose

This resource defines the minimum authoritative concepts needed to interpret a Mebaco Studio project. It describes stable Mebaco semantics, not the current state of a particular project. Obtain current project data from the live Studio session because it may include unsaved changes.

When reporting analysis, distinguish:

- **Fact**: directly observed in the live project model.
- **Inference**: an interpretation supported by facts.
- **Recommendation**: a proposed change or improvement.

Never present an inference as a fact.

## Live state is authoritative

For development assistance, the currently open Studio state is authoritative. It may differ from the saved project file. `dirty=true` means the live state contains unsaved changes. Do not assume that reading a saved file describes the current project when a live Studio session is available.

A session ID selects a published Studio development session. A tree node ID identifies a node in the current live tree; it is not a semantic identifier and must not be treated as permanently stable.

## Tree nodes and elements

A project is represented as a tree. Each tree node has:

- `id`: the live node identifier.
- `element`: the domain object carried by the node.
- `children`: semantically nested nodes.
- Studio presentation state such as `isOpen` and optional `disabled`.

The tree node is a structural wrapper. The element supplies domain meaning through its `kind` and properties. Do not infer meaning from a node ID or tree depth alone.

Parent-child relationships are semantic, not merely visual organization. A parent can determine ownership, scope, lifecycle, execution context, and which child kinds are valid.

## App entry model

An `app` does not directly define its root view. Its `entry` references the `component` used as the application's starting point through `componentId`. Entry `propBindings` provide initial inputs to that component. A binding source can be a literal or a formula; it is not necessarily a literal value.

To analyze an app:

1. Locate the app and its entry.
2. Resolve the entry's `componentId` to the component definition visible to the app.
3. Inspect entry prop bindings.
4. Analyze that component's content as the root view.

Do not treat all components as application roots.

## Components and content

A component is a reusable, scoped content definition. A component definition and a `component-use` are different concepts. Decide whether a concern belongs to the shared definition or to one use site before recommending a change.

The current Component definition has dedicated `props`, `store`, `retention`, and `elements` branches. Its renderable content starts under `elements`. Within that view tree, content-host elements such as tags and control branches can contain children directly or use their own optional Retention structure:

```text
content host (for example, a tag or control branch)
├─ retention   declarations and behavior retained for the local scope
└─ elements    renderable component content
```

For the Component itself, `retention` and `elements` are part of its standard structure. For optional nested content hosts, renderable content is under `elements` only when that host uses Retention; otherwise content is represented directly by its children. In either case, `retention` and `elements` are structural branches, not ordinary rendered elements.

Retention is a primary Mebaco concept. A Component has its own Retention/Elements branches, and nested content hosts may establish additional Retention/Elements scopes. Retention holds declarations and definitions associated with the corresponding content without placing them in the rendered content. Visibility depends on element kind, target position, and scope; do not assume every retained declaration is visible everywhere. When analyzing expressions or references, inspect the nearest applicable Retention branches and surrounding scopes. Read `mebaco://model/components-and-retention` before making detailed visibility claims.

Read `mebaco://model/components-and-retention` before detailed component, scope, or local-declaration analysis.

## Element kinds

An element's `kind` identifies its semantic category. Kinds are not interchangeable. Each kind has its own properties, allowed parents and children, references, and valid operations.

Major categories include:

- Project structure: project, common, apps, app, entry.
- Components: components, component, component-use, props, slots, retention, elements.
- Views and control: tag, text, conditional, loop, switch and related branches.
- State and behavior: store, state, variable, action, effect, transition, function.
- Declarations and types: constant, object type, union type, signature type.
- Presentation: style, style parameters, style locals, keyframes.
- Runtime and delivery: resources, storage, launchers, release, bundles, debug.

This list describes categories, not a complete placement schema. Do not assume that a kind is valid at an arbitrary location.

## Values, formulas, references, and bindings

A value may be a literal or a formula evaluated from the available scope. Other properties can reference definitions by stable domain identifiers such as component IDs, style IDs, parameter IDs, or slot IDs.

Do not interpret every string as a literal. Determine whether the field is a literal value, formula source, reference, or binding. Resolve references within the correct scope before judging behavior or validity.

## State and behavior

State-related elements represent data and behavior that can influence the UI or program flow. Stores, states, variables, actions, effects, transitions, and functions are distinct concepts.

For state-related analysis, identify:

1. Where a value is declared.
2. Where it is read.
3. Where it is updated.
4. What effects or transitions can follow.

Do not infer a complete data flow from parent-child structure alone. References, formulas, bindings, and event handlers also form relationships.

The MCP `verify_expression` tool runs Studio's expression verification for all verifiable expression fields on one node. It checks parsing, visible names/scope, expected types where defined, and script policy. It does not traverse descendants; call it for each relevant node. A `not-applicable` status means Studio has no verification candidate on that node. Check the returned `stale` flag before relying on the result, because the project may have changed while asynchronous verification was running.

## Styles

Styles are reusable definitions referenced by view elements. A style can define parameters, literal or formula-based property values, state-specific rules, animations, and base styles.

The final appearance cannot always be determined from one style node. Resolve applied styles, inheritance, conditions, arguments, defaults, and delegated parameters. Read `mebaco://model/styles` before detailed style analysis.

## Required analysis discipline

Before making a claim about a project:

1. Identify the relevant node and its ancestor path.
2. Inspect its kind and domain properties.
3. Determine whether the node is a Component or nested content host, then identify its content mode.
4. Inspect relevant children and local declarations.
5. Resolve references, formulas, bindings, component uses, styles, and events as needed.
6. Separate observed facts, inferences, and recommendations.
7. State what information is missing when a conclusion cannot be verified.

This core model is intentionally compact. It is not a complete element schema, editing contract, runtime specification, or general frontend-development guide.
