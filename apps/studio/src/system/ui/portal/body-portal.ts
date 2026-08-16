const bodyPortal = (
  node: HTMLElement,
) => {
  document.body.appendChild(node)

  return {
    destroy: () => {
      node.remove()
    },
  }
}

export default bodyPortal
