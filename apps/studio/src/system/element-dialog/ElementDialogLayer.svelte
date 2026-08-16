<script lang="ts">
  import TreeStore from '../store/tree-store'
  import StylePropsEditor from '../element/kind/view/StylePropsEditor.svelte'
  import StyleBasesEditor from '../element/kind/view/StyleBasesEditor.svelte'
  import StyleMonitorEditor from '../runtime/style/StyleMonitorEditor.svelte'
  import TagAttributesEditor from '../element/kind/view/TagAttributesEditor.svelte'
  import FormulaField from '../ui/formula/FormulaField.svelte'
  import ActionField from '../ui/action/ActionField.svelte'
  import ValueSourceField from '../ui/input/ValueSourceField.svelte'
  import ObjectShapeEditor from '../element/kind/type/ObjectShapeEditor.svelte'
  import UnionDefinitionEditor from '../element/kind/type/UnionDefinitionEditor.svelte'
  import ComponentBindingsEditor from '../element/kind/component/ComponentBindingsEditor.svelte'
  import SwitchValueTypeEditor from '../element/kind/directive/SwitchValueTypeEditor.svelte'
  import ValueTypeEditor from '../element/kind/type/ValueTypeEditor.svelte'
  import ValueTypeDefinition from '../element/kind/type/value-type-definition'
  import ComponentReference from '../element/kind/component/component-reference'
  import MebacoInjectionSource from '../ui/monaco/mebaco-injection-source'
  import FieldValidationIndicator from '../ui/validation/FieldValidationIndicator.svelte'
  import ValidationIssue from '../ui/validation/validation-issue'
  import ElementDialog from './element-dialog-controller'
  import { elementDialogStore } from './element-dialog-store'
  import ElementEditSchema from './element-edit-schema'

  let values = $state<Record<string, string>>({})
  let touched = $state<Record<string, boolean>>({})
  let activeTab = $state<string | null>(null)
  const rootNodeStore = TreeStore.rootNode

  const isRequiredField = (field: ElementEditSchema.Field): boolean => (
    'required' in field && field.required === true
  )

  $effect(() => {
    const session = $elementDialogStore
    if (session == null) return

    values =
      session.mode === 'create'
        ? Object.fromEntries(
            session.schema.fields.map((field) => [field.key, field.defaultValue ?? '']),
          )
        : session.schema.getInitialValues(session.element)
    touched = session.mode === 'create'
      ? Object.fromEntries(
          session.schema.fields
            .filter(isRequiredField)
            .map((field) => [field.key, true]),
        )
      : {}
    activeTab = session.schema.tabs?.[0]?.id ?? null
  })

  const getError = (field: ElementEditSchema.Field): string | null => {
    const value = values[field.key] ?? ''

    switch (field.type) {
      case 'text':
        return ElementEditSchema.validateText(field, value, values)
      case 'select':
        return ElementEditSchema.validateSelect(field, value)
      case 'number':
        return ElementEditSchema.validateNumber(field, value)
      case 'checkbox':
        return null
      case 'literal':
        return ElementEditSchema.validateLiteral(field, value, values)
      case 'formula':
        return ElementEditSchema.validateFormula(
          field,
          value,
          getInjectionSource('expression'),
        )
      case 'script':
        return ElementEditSchema.validateScript(field, value)
      case 'valueSource':
        return ElementEditSchema.validateValueSource(field, value, values)
      case 'valueType':
        return ElementEditSchema.validateValueType(field, value)
      case 'styleProps':
        return ElementEditSchema.validateStyleProps(value)
      case 'styleApplications':
        return ElementEditSchema.validateStyleApplications(field, value)
      case 'styleBases':
        return ElementEditSchema.validateStyleBases(field, value)
      case 'styleMonitor':
        return null
      case 'tagAttributes':
        return ElementEditSchema.validateTagAttributes(value)
      case 'objectShape':
        return ElementEditSchema.validateObjectShape(field, value)
      case 'unionDefinition':
        return ElementEditSchema.validateUnionDefinition(field, value)
      case 'componentBindings': {
        const component = field.components.find(
          (candidate) => candidate.componentId === values[field.componentIdKey],
        )
        return ComponentReference.validateBindings(value, component)
      }
      case 'switchValueType':
        return ElementEditSchema.validateSwitchValueType(field, value)
    }
  }

  const canSubmit = () => {
    const session = $elementDialogStore
    if (session == null) return false

    return session.schema.fields
      .filter(isVisibleField)
      .every((field) => getError(field) == null)
  }

  const isVisibleField = (field: ElementEditSchema.Field): boolean => {
    if (
      field.visibleWhen != null
      && values[field.visibleWhen.key] !== field.visibleWhen.value
    ) return false

    return field.visibleWhenAll?.every(
      (condition) => values[condition.key] === condition.value,
    ) ?? true
  }

  const isActiveTabField = (field: ElementEditSchema.Field): boolean => {
    const tabs = $elementDialogStore?.schema.tabs
    if (tabs == null || tabs.length === 0) return true
    return (field.tab ?? tabs[0].id) === activeTab
  }

  const visibleFields = () => (
    $elementDialogStore?.schema.fields
      .filter(isVisibleField)
      .filter(isActiveTabField)
    ?? []
  )

  const getSelectedOption = (
    field: ElementEditSchema.SelectField,
  ): ElementEditSchema.SelectOption | null => (
    field.options.find((option) => option.value === (values[field.key] ?? '')) ?? null
  )

  const getTargetNodeId = (): number | null => {
    const session = $elementDialogStore
    if (session == null) return null
    return session.mode === 'create' ? session.parentNodeId : session.nodeId
  }

  const getInjectionSource = (
    mode: 'expression' | 'action',
  ): string | undefined => {
    const targetNodeId = getTargetNodeId()
    if (targetNodeId == null) return undefined
    return MebacoInjectionSource.createForNode(
      $rootNodeStore,
      targetNodeId,
      mode,
      $elementDialogStore?.mode === 'create',
    )
  }

  const submit = () => {
    const session = $elementDialogStore
    if (session == null || !canSubmit()) return

    if (session.mode === 'create') {
      const element = session.schema.create(values)
      TreeStore.addChild(session.parentNodeId, element, session.insertIndex)
    } else {
      const element = session.schema.update(session.element, values)
      TreeStore.updateElement(session.nodeId, element)
    }

    ElementDialog.close()
  }

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if ($elementDialogStore == null) return
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    ElementDialog.close()
  }
</script>

<svelte:window onkeydown={handleDialogKeydown} />

{#if $elementDialogStore != null}
  <div class="scrim" role="presentation"></div>
  {@const title = $elementDialogStore.mode === 'create' ? $elementDialogStore.schema.createTitle : $elementDialogStore.schema.updateTitle}
  <section
    class="dialog"
    class:wide-dialog={$elementDialogStore.schema.fields.some((field) => field.type === 'objectShape')}
    aria-label={title}
  >
    <header class="dialog-header">
      <button type="button" onclick={ElementDialog.close}>Cancel</button>
      <button type="button" disabled={!canSubmit()} onclick={submit}>
        {$elementDialogStore.mode === 'create' ? 'Create' : 'Update'}
      </button>
    </header>

    <div
      class="dialog-body"
      class:contained-scroll={visibleFields().some((field) => (
        field.type === 'styleProps'
        || field.type === 'styleApplications'
        || field.type === 'styleBases'
        || field.type === 'styleMonitor'
        || field.type === 'objectShape'
        || field.type === 'unionDefinition'
        || field.type === 'switchValueType'
        || field.type === 'valueType'
      ))}
    >
      <h2>{title}</h2>

      {#if $elementDialogStore.schema.tabs != null && $elementDialogStore.schema.tabs.length > 0}
        <div class="dialog-tabs" role="tablist" aria-label={`${title} sections`}>
          {#each $elementDialogStore.schema.tabs as tab}
            <button
              type="button"
              class:active={activeTab === tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onclick={() => {
                activeTab = tab.id
              }}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      {/if}

      {#each visibleFields() as field}
        {@const error = getError(field)}
        {@const issue = touched[field.key] === true && error != null ? ValidationIssue.fromMessage(error) : null}
        {#if field.type === 'styleProps'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <StylePropsEditor
              value={values[field.key] ?? '[]'}
              errorMessage={touched[field.key] === true ? error : null}
              formulaInjectionSource={getInjectionSource('expression')}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'styleApplications'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <StyleBasesEditor
              value={values[field.key] ?? '[]'}
              options={field.options}
              getResolution={field.getResolution}
              formulaInjectionSource={getInjectionSource('expression')}
              usage="application"
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'styleBases'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <StyleBasesEditor
              value={values[field.key] ?? '[]'}
              options={field.options}
              getResolution={field.getResolution}
              formulaInjectionSource={getInjectionSource('expression')}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'styleMonitor'}
          <div class="field">
            <span class="field-label">{field.label}</span>
            <StyleMonitorEditor
              rootNode={$rootNodeStore}
              nodeId={$elementDialogStore.mode === 'update' ? $elementDialogStore.nodeId : null}
              parentNodeId={$elementDialogStore.mode === 'create' ? $elementDialogStore.parentNodeId : null}
              styleId={values[field.idKey] ?? ''}
              rules={values[field.rulesKey] ?? '[]'}
              bases={values[field.basesKey] ?? '[]'}
            />
          </div>
        {:else if field.type === 'tagAttributes'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <TagAttributesEditor
              value={values[field.key] ?? '[]'}
              formulaInjectionSource={getInjectionSource('expression')}
              actionInjectionSource={getInjectionSource('action')}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'objectShape'}
          <div class="field object-shape-field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <ObjectShapeEditor
              objectId={values[field.idKey] ?? ''}
              value={values[field.key] ?? '{"baseObjectIds":[],"properties":[]}'}
              objectOptions={field.objectOptions}
              namedTypeOptions={field.namedTypeOptions}
              errorMessage={touched[field.key] === true ? error : null}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'unionDefinition'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <UnionDefinitionEditor
              value={values[field.key] ?? field.defaultValue ?? ''}
              objectOptions={field.objectOptions}
              errorMessage={touched[field.key] === true ? error : null}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'componentBindings'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <ComponentBindingsEditor
              componentId={values[field.componentIdKey] ?? ''}
              value={values[field.key] ?? field.defaultValue ?? '[]'}
              components={field.components}
              injectionSource={getInjectionSource('expression')}
              errorMessage={touched[field.key] === true ? error : null}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'switchValueType'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <SwitchValueTypeEditor
              value={values[field.key] ?? field.defaultValue ?? ''}
              literalUnionOptions={field.literalUnionOptions}
              errorMessage={touched[field.key] === true ? error : null}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'valueType'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <ValueTypeEditor
              value={values[field.key] ?? field.defaultValue ?? ''}
              objectOptions={field.objectOptions}
              namedTypeOptions={field.namedTypeOptions}
              errorMessage={touched[field.key] === true ? error : null}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'formula'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <FormulaField
              value={values[field.key] ?? ''}
              injectionSource={getInjectionSource('expression')}
              expectedType={field.expectedType}
              expectedTypeText={field.getExpectedTypeText?.(values)}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'script'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <ActionField
              value={values[field.key] ?? ''}
              injectionSource={getInjectionSource('action')}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else if field.type === 'valueSource'}
          <div class="field" data-validation-severity={issue?.severity}>
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            <ValueSourceField
              value={values[field.key] ?? field.defaultValue ?? ''}
              valueTypeDefinition={field.valueTypeDefinitionKey == null
                ? undefined
                : ValueTypeDefinition.parse(values[field.valueTypeDefinitionKey] ?? '') ?? undefined}
              valueType={values[field.valueTypeKey] ?? 'string'}
              arrayDepth={Number(values[field.arrayDepthKey] ?? '0')}
              injectionSource={getInjectionSource('expression')}
              onValueChange={(nextValue) => {
                values[field.key] = nextValue
                touched[field.key] = true
              }}
            />
          </div>
        {:else}
          <label
            class="field"
            class:checkbox-field={field.type === 'checkbox'}
            data-validation-severity={issue?.severity}
          >
            <span class="field-label">
              {field.label}
              {#if issue != null}<FieldValidationIndicator {issue} />{/if}
            </span>
            {#if field.type === 'text'}
              <input
                class:id-width={field.width === 'id'}
                class:value-type-width={field.width === 'valueType'}
                class:array-depth-width={field.width === 'arrayDepth'}
                type="text"
                value={values[field.key] ?? ''}
                aria-invalid={issue == null ? undefined : true}
                data-validation-severity={issue?.severity}
                title={issue?.message}
                oninput={(event) => {
                  values[field.key] = event.currentTarget.value
                  touched[field.key] = true
                }}
                onblur={() => {
                  touched[field.key] = true
                }}
              />
            {/if}
            {#if field.type === 'select'}
              {@const selectedOption = getSelectedOption(field)}
              <span class:select-with-detail={selectedOption?.detail != null}>
                <select
                  class:id-width={field.width === 'id'}
                  class:value-type-width={field.width === 'valueType'}
                  class:array-depth-width={field.width === 'arrayDepth'}
                  value={values[field.key] ?? ''}
                  aria-invalid={issue == null ? undefined : true}
                  data-validation-severity={issue?.severity}
                  title={issue?.message}
                  onchange={(event) => {
                    values[field.key] = event.currentTarget.value
                    field.clearWhenChanged?.forEach((key) => {
                      values[key] = ''
                      touched[key] = false
                    })
                    touched[field.key] = true
                  }}
                  onblur={() => {
                    touched[field.key] = true
                  }}
                >
                  {#if field.required !== true}
                    <option value=""></option>
                  {/if}
                  {#each field.options as option}
                    <option value={option.value}>{option.label ?? option.value}</option>
                  {/each}
                </select>
                {#if selectedOption?.detail != null}
                  <span class="select-detail" title={selectedOption.title ?? selectedOption.detail}>
                    {selectedOption.detail}
                  </span>
                {/if}
              </span>
            {/if}
            {#if field.type === 'number'}
              <input
                class:id-width={field.width === 'id'}
                class:value-type-width={field.width === 'valueType'}
                class:array-depth-width={field.width === 'arrayDepth'}
                type="number"
                value={values[field.key] ?? ''}
                min={field.min}
                max={field.max}
                step={field.integer === true ? 1 : 'any'}
                aria-invalid={issue == null ? undefined : true}
                data-validation-severity={issue?.severity}
                title={issue?.message}
                oninput={(event) => {
                  values[field.key] = event.currentTarget.value
                  touched[field.key] = true
                }}
                onblur={() => {
                  touched[field.key] = true
                }}
              />
            {/if}
            {#if field.type === 'checkbox'}
              <input
                class="checkbox-input"
                type="checkbox"
                checked={values[field.key] === 'true'}
                onchange={(event) => {
                  values[field.key] = String(event.currentTarget.checked)
                  touched[field.key] = true
                }}
              />
            {/if}
            {#if field.type === 'literal'}
              {#if values[field.enabledWhen.key] !== field.enabledWhen.value}
                <span class="disabled-value">No default value</span>
              {:else if values[field.valueTypeKey] === 'boolean'}
                <select
                  value={values[field.key] ?? ''}
                  aria-invalid={issue == null ? undefined : true}
                  data-validation-severity={issue?.severity}
                  title={issue?.message}
                  onchange={(event) => {
                    values[field.key] = event.currentTarget.value
                    touched[field.key] = true
                  }}
                >
                  <option value=""></option>
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              {:else}
                <input
                  type={values[field.valueTypeKey] === 'number' ? 'number' : 'text'}
                  value={values[field.key] ?? ''}
                  aria-invalid={issue == null ? undefined : true}
                  data-validation-severity={issue?.severity}
                  title={issue?.message}
                  oninput={(event) => {
                    values[field.key] = event.currentTarget.value
                    touched[field.key] = true
                  }}
                  onblur={() => {
                    touched[field.key] = true
                  }}
                />
              {/if}
            {/if}
          </label>
        {/if}
      {/each}
    </div>
  </section>
{/if}

<style>
  .scrim {
    position: absolute;
    z-index: 30;
    inset: 0;
    background: rgba(18, 55, 64, 0.18);
  }

  .dialog {
    position: absolute;
    z-index: 31;
    top: 50%;
    left: 50%;
    display: flex;
    flex-direction: column;
    width: 720px;
    max-width: calc(100% - 48px);
    height: min(620px, calc(100% - 64px));
    border: 1px solid rgba(132, 198, 210, 0.78);
    border-radius: 8px;
    background: rgba(247, 252, 253, 0.96);
    box-shadow: 0 18px 42px rgba(18, 55, 64, 0.26);
    transform: translate(-50%, -50%);
    overflow: hidden;
  }

  .dialog.wide-dialog {
    width: min(1040px, calc(100% - 48px));
  }

  .dialog-header {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 12px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(234, 247, 250, 0.78);
  }

  button {
    min-width: 92px;
    height: 30px;
    padding: 0 16px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font-size: 13px;
    font-weight: 700;
    cursor: default;
  }

  button:disabled {
    opacity: 0.45;
  }

  button:not(:disabled):hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .dialog-body {
    display: grid;
    grid-auto-rows: min-content;
    gap: 18px;
    min-height: 0;
    padding: 22px 26px 28px;
    overflow: auto;
  }

  .dialog-body.contained-scroll {
    grid-template-rows: min-content min-content minmax(0, 1fr);
    grid-auto-rows: initial;
    overflow: hidden;
  }

  .dialog.wide-dialog .dialog-body.contained-scroll {
    flex: 1 1 auto;
  }

  .dialog-body.contained-scroll .field {
    grid-template-rows: min-content minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .object-shape-field {
    min-height: 0;
  }

  h2 {
    margin: 0;
    color: #2b4850;
    font-size: 18px;
    line-height: 1.3;
  }

  .field {
    display: grid;
    gap: 7px;
  }

  .checkbox-field {
    grid-template-columns: 16px max-content;
    align-items: center;
    gap: 8px;
    width: fit-content;
  }

  .checkbox-field .field-label {
    grid-column: 2;
    grid-row: 1;
    white-space: nowrap;
  }

  .checkbox-input {
    grid-column: 1;
    grid-row: 1;
    width: 16px;
    height: 16px;
    padding: 0;
  }

  .dialog-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 0 0;
  }

  .dialog-tabs button {
    min-width: 86px;
    height: 30px;
    border-radius: 999px;
    background: rgba(244, 251, 252, 0.9);
    color: #496970;
  }

  .dialog-tabs button.active,
  .dialog-tabs button.active:hover {
    border-color: #55b7c5;
    background: #cceff4;
    color: #174d59;
  }

  .field-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #496970;
    font-size: 13px;
    font-weight: 700;
  }

  input,
  select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 14px;
    outline: none;
  }

  select {
    appearance: none;
  }

  .id-width {
    width: min(100%, var(--mbc-width-id-field));
  }

  .value-type-width {
    width: min(100%, var(--mbc-width-value-type-field));
  }

  .array-depth-width {
    width: min(100%, var(--mbc-width-array-depth-field));
  }

  .select-with-detail {
    display: inline-grid;
    grid-template-columns: minmax(0, var(--mbc-width-id-field)) max-content;
    align-items: center;
    gap: var(--mbc-form-control-gap);
    width: fit-content;
    max-width: 100%;
  }

  .select-detail {
    color: #1976a2;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    padding: 0 10px;
  }

  .disabled-value {
    display: flex;
    align-items: center;
    width: min(100%, var(--mbc-width-id-field));
    height: 34px;
    padding: 0 10px;
    border: 1px solid rgba(154, 203, 212, 0.58);
    border-radius: 6px;
    background: rgba(232, 242, 244, 0.75);
    color: #6d8990;
    font-size: 13px;
  }

  input:focus,
  select:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

</style>
