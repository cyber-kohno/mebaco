<script lang="ts">
  import ActionMenu from './action-menu-controller'
  import { actionMenuStore } from './action-menu-store'
  import type ActionMenuState from './action-menu-state'

  const MENU_WIDTH = 220
  const MENU_GAP = 0
  const ITEM_HEIGHT = 30
  const FRAME_PADDING = 6

  let frameRefs: HTMLElement[] = []

  const getLevelItems = (
    items: ActionMenuState.Item[],
    path: number[],
  ) => ActionMenu.getLevelItems(items, path)

  const getMaxHeight = (levelTop: number) =>
    Math.max(160, window.innerHeight - levelTop - 8)

  const getTargetScrollTop = (
    focus: number,
    frame: HTMLElement | undefined,
    levelTop: number,
  ) => {
    if (focus < 0) return 0

    const height = frame?.getBoundingClientRect().height ?? getMaxHeight(levelTop)
    const itemMiddle = focus * ITEM_HEIGHT + ITEM_HEIGHT / 2
    const target = Math.max(0, itemMiddle - height / 2)
    if (frame == null) return target

    return Math.min(target, Math.max(0, frame.scrollHeight - frame.clientHeight))
  }

  const getLevelTop = (depth: number) => {
    const actionMenu = $actionMenuStore
    if (actionMenu == null) return 0

    let levelTop = actionMenu.placement.top

    for (let index = 1; index <= depth; index += 1) {
      const parentLevel = levels[index - 1]
      const parentFrame = frameRefs[index - 1]
      if (parentLevel == null) break

      levelTop +=
        FRAME_PADDING +
        parentLevel.focus * ITEM_HEIGHT -
        getTargetScrollTop(parentLevel.focus, parentFrame, levelTop)
    }

    return levelTop
  }

  $: levels = (() => {
    const actionMenu = $actionMenuStore
    if (actionMenu == null) return []

    const result = actionMenu.path.map((_, depth) => {
      const path = actionMenu.path.slice(0, depth + 1)
      const focus = actionMenu.path[depth]

      return {
        depth,
        path,
        items: getLevelItems(actionMenu.items, path),
        focus,
        hasFocusedChild: depth < actionMenu.path.length - 1,
      }
    })

    const lastLevel = result[result.length - 1]
    const activeItem = lastLevel?.items[lastLevel.focus]

    if (activeItem?.type === 'parent' && activeItem.children.length > 0) {
      result.push({
        depth: result.length,
        path: [...actionMenu.path, -1],
        items: activeItem.children,
        focus: -1,
        hasFocusedChild: false,
      })
    }

    return result
  })()

  $: {
    levels
    setTimeout(() => {
      levels.forEach((level) => {
        const frame = frameRefs[level.depth]
        if (frame == null || level.focus < 0) return
        frame.scrollTop = getTargetScrollTop(level.focus, frame, getLevelTop(level.depth))
      })
    }, 0)
  }
</script>

{#if $actionMenuStore != null}
  <button class="scrim" type="button" aria-label="Close menu" onclick={ActionMenu.close}></button>
  <div class="menu-layer" role="menu" tabindex="-1" onmouseleave={ActionMenu.close}>
    {#each levels as level}
      <div
        class="frame"
        style:left={`${$actionMenuStore.placement.left + level.depth * (MENU_WIDTH + MENU_GAP)}px`}
        style:top={`${getLevelTop(level.depth)}px`}
        style:max-height={`${getMaxHeight(getLevelTop(level.depth))}px`}
        bind:this={frameRefs[level.depth]}
      >
        {#each level.items as item, index}
          <button
            type="button"
            class="item"
            class:focus={index === level.focus}
            class:parent-focus={level.hasFocusedChild && index === level.focus && item.type === 'parent'}
            class:parent-sibling-muted={level.hasFocusedChild && index !== level.focus}
            data-role={item.type === 'action' ? item.role ?? 'normal' : 'normal'}
            onmouseenter={() => ActionMenu.hover(level.depth, index)}
            onclick={() => {
              ActionMenu.hover(level.depth, index)
              ActionMenu.enter()
            }}
          >
            <span>{item.label}</span>
            {#if item.type === 'parent'}
              <span class="arrow">></span>
            {/if}
          </button>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .scrim {
    position: absolute;
    z-index: 20;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }

  .menu-layer {
    position: absolute;
    z-index: 21;
    inset: 0;
    pointer-events: none;
  }

  .frame {
    display: inline-flex;
    position: absolute;
    flex-direction: column;
    width: 220px;
    padding: 6px;
    border: 1px solid rgba(132, 198, 210, 0.65);
    border-radius: 5px;
    background: rgba(29, 55, 62, 0.92);
    box-shadow: 0 14px 28px rgba(18, 55, 64, 0.34);
    box-sizing: border-box;
    overflow: hidden;
    pointer-events: auto;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 30px;
    height: 30px;
    flex: 0 0 30px;
    padding: 0 9px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #d9f7fb;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    line-height: 18px;
    text-align: left;
    cursor: default;
  }

  .item.focus {
    border-color: #8ed9e5;
    background: rgba(67, 142, 153, 0.72);
    color: #f0feff;
  }

  .item.parent-focus {
    border-color: #8ed9e5;
    background: rgba(34, 76, 108, 0.92);
    color: #f0feff;
  }

  .item.parent-sibling-muted {
    opacity: 0.4;
  }

  .item[data-role='warning'] {
    color: #ffe4b3;
  }

  .item[data-role='danger'] {
    color: #ffd7d7;
  }

  .item[data-role='warning'].focus {
    border-color: #d6a85b;
    background: rgba(89, 68, 42, 0.84);
  }

  .item[data-role='danger'].focus {
    border-color: #e08989;
    background: rgba(90, 47, 62, 0.84);
  }

  .arrow {
    font-size: 15px;
    line-height: 16px;
  }
</style>
