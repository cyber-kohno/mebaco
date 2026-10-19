import type ElementDialogStore from './element-dialog-store'

namespace ElementDialogDirty {
  export const getInitialValues = (
    session: ElementDialogStore.Session,
  ): Record<string, string> => session.mode === 'create'
    ? Object.fromEntries(
        session.schema.fields.map((field) => [field.key, field.defaultValue ?? '']),
      )
    : session.schema.getInitialValues(session.element)

  export const isDirty = (
    session: ElementDialogStore.Session,
    values: Readonly<Record<string, string>>,
  ): boolean => {
    const initialValues = getInitialValues(session)
    return session.schema.fields.some((field) => (
      (values[field.key] ?? '') !== (initialValues[field.key] ?? '')
    ))
  }
}

export default ElementDialogDirty
