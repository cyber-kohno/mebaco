namespace RestrictedGlobals {
  export type Entry = {
    name: string
    message: string
  }

  export const entries: Entry[] = [
    {
      name: 'window',
      message: 'Mebaco script runtime does not provide window.',
    },
    {
      name: 'document',
      message: 'Mebaco script runtime does not provide document.',
    },
    {
      name: 'alert',
      message: 'Mebaco script runtime does not provide alert.',
    },
    {
      name: 'localStorage',
      message: 'Mebaco script runtime does not provide localStorage.',
    },
    {
      name: 'sessionStorage',
      message: 'Mebaco script runtime does not provide sessionStorage.',
    },
    {
      name: 'navigator',
      message: 'Mebaco script runtime does not provide navigator.',
    },
    {
      name: 'location',
      message: 'Mebaco script runtime does not provide location.',
    },
  ]
}

export default RestrictedGlobals
