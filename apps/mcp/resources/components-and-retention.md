---
model: mebaco-development-model
modelVersion: "1"
scope: components-and-retention
authority: normative
---

# Mebaco components and Retention

## Component roles

A `component` is a definition with a stable `componentId` and a human-facing `id`. A `component-use` references a definition; it is not a copy of that definition. An app `entry` also references a component definition and supplies prop bindings.

When reviewing a component use, resolve the referenced definition before judging its rendered structure. Keep definition-wide changes separate from changes intended for one use site.

## Component structure

The current Component definition has dedicated `props`, `store`, `retention`, and `elements` branches. Its renderable content begins under `elements`:

```text
component
├─ props
├─ store
│  ├─ states
│  └─ effects
├─ retention
└─ elements
   ├─ tag
   ├─ text
   ├─ component-use
   └─ directives
```

The Component-level Retention is a standard branch in the current model. Do not confuse it with optional Retention branches that can be enabled on nested content hosts inside the Component's `elements` tree.

View content can include tags, text, component uses, slot-related nodes, and directives such as conditionals, loops, and switches. These nodes combine into the component's rendered and behavioral structure.

## Optional nested content hosts

Tags and several control-flow or slot-content elements are content hosts. Their content can be represented directly by children. Retention is optional for these hosts. Enabling it converts that host's direct content into two branches:

```text
content host
├─ retention
└─ elements
```

Existing content children are moved beneath `elements`. The `retention` branch begins empty. The structured form is valid only when there is one Retention branch and one Elements branch.

Conceptually:

- `retention` holds local declarations, definitions, and behavior.
- `elements` holds the renderable content tree supported by those declarations.

Retention can be removed only when its branch is empty; removing it restores the children of `elements` as direct content. Component itself has Retention required in its current element definition and is not the optional-toggle example; optional nested content hosts provide that behavior.

## Retention semantics

Retention is not a display group. Its children are not rendered merely because they appear in the tree. They can nevertheless affect runtime behavior through state, references, functions, actions, effects, transitions, styles, types, and component definitions.

Retention is a structural host for declarations and definitions associated with the content host. Its children are not all visible everywhere merely by being placed under Retention: visibility depends on the referenced kind, the target's ancestor path, and, in sequential procedural frames, declaration order.

Studio currently allows the following children to be created in Retention:

- declarations: variables, functions, local components, styles, and object, union, or signature types;
- statements: actions and transitions;
- directives: conditionals and switches;
- blocks, which expose the corresponding Retention statement and declaration menus.

State and Effect belong to their Store branches and are not direct Retention children. Rendered Tag and Text content belongs in the paired Elements branch, not Retention.

MCP `apply_changes` exposes these Studio Retention menu items as `createVariable`, `createFunction`, `createLocalComponent`, `createStyle`, `createObjectType`, `createUnionType`, `createSignatureType`, `createAction`, `createTransition`, `createConditional`, `createSwitch`, and `createBlock`. Each takes `parentNodeId` referring to the Retention node or a Block inside Retention. `createStyle` also accepts the global Styles container as before. `createSwitch` accepts an optional `valueType` (defaulting to string) and requires a non-empty `source` expression, as Studio does. `createBlock` optionally accepts a label. Local Style parameters can be added with `createStyleParameter` after creating the Style; see the style resource for parameter IDs and argument binding. Style formulas stored in a local Style can therefore be defined within that Retention scope and used by its paired Elements content. The style's formula must still reference names using the expression syntax and scope made available by Studio.

Placement rules still depend on the element kind. The presence of Retention does not make every kind valid there.

## Scope and visibility

References are resolved from the target node's context. Applicable local frames are considered before broader scopes. For kinds whose resolver exposes a content host's declarations to its content, those declarations become visible when traversal enters the paired Elements branch. This is kind-specific behavior, not a universal rule for every retained element.

Conceptually, analysis should consider applicable scopes from local to broad:

1. The nearest Retention or procedural frame applicable to the target.
2. Enclosing Retention or procedural frames.
3. Definitions owned by the current app.
4. Common project definitions.

The exact resolver depends on the referenced kind; some kinds use different visibility rules or do not use every level in this conceptual order. Do not resolve solely by display name, and do not assume that every project-level definition is visible everywhere. Consult the kind-specific resolver or supporting model documentation before claiming exact name-resolution precedence.

Declarations within a sequential procedural frame can also depend on their position. Do not assume that a later declaration is visible before it becomes available.

## Local components

A component stored in Retention can be local to that scope. A component use in the paired Elements tree can resolve such a local component. Local component visibility follows the applicable Retention path and can differ from the set of globally declared components.

When resolving a `componentId`:

1. Start at the use site.
2. Inspect visible local component definitions in applicable Retention scopes.
3. Inspect broader component collections allowed in that context.
4. Match by the stable component ID, not only by the human-facing name.

## Props and slots

Props define component inputs. Entry and component-use bindings supply values to those inputs by stable prop ID. A binding source can be a literal or a formula. Missing bindings can be valid when a prop has an applicable default; otherwise they may represent an incomplete contract. Prop types can be structured, so do not validate a value using only its display string.

Slots define structural insertion points. A slot definition and supplied slot contents have different ownership. Review both the component definition and the use site when analyzing projected content. Consult the slot and component-use model before making claims about exact projection semantics.

## Analysis requirements

For every component analysis:

1. Treat the Component's `elements` branch as the renderable root in the current model.
2. Inventory Component-level retained declarations that are relevant to root content.
3. Within that tree, detect each nested content host and whether it uses direct children or its own Retention/Elements branches.
4. Determine which retained declarations are visible to the target kind and position.
5. Resolve local component uses and scoped references from the use site.
6. Inspect props, defaults, bindings, slots, formulas, and event handlers.
7. Separate shared-definition concerns from use-site concerns.

Common incorrect interpretations include:

- rendering Retention children as UI;
- treating the Component's standard Retention branch as the optional nested-host toggle;
- treating `elements` as an HTML element;
- ignoring retained state or functions while explaining a view;
- resolving a local component as a global component with a similar name;
- recommending a definition change for a problem limited to one use site;
- assuming tree nesting alone describes all data and control flow.
