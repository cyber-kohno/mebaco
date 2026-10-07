import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  startEmpty: vi.fn(),
  openFileWithAlert: vi.fn(),
  close: vi.fn(),
  confirmDiscard: vi.fn(),
  setScreen: vi.fn(),
  stopMcp: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../project/project-file', () => ({
  default: {
    startEmpty: mocks.startEmpty,
    openFileWithAlert: mocks.openFileWithAlert,
    close: mocks.close,
  },
}))
vi.mock('../project/project-guard', () => ({
  default: { confirmDiscard: mocks.confirmDiscard },
}))
vi.mock('./develop-screen-store', () => ({
  developScreenStore: { set: mocks.setScreen },
}))
vi.mock('../mcp/mcp-session-controller', () => ({ default: { stop: mocks.stopMcp } }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: mocks.showToast } }))

import DevelopProjectController from './develop-project-controller'

describe('DevelopProjectController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.stopMcp.mockResolvedValue({ outcome: 'unchanged', status: 'stopped' })
  })

  it('starts an empty project and opens the workspace', () => {
    DevelopProjectController.startEmpty()

    expect(mocks.startEmpty).toHaveBeenCalledOnce()
    expect(mocks.setScreen).toHaveBeenCalledWith('workspace')
  })

  it('opens the workspace only after a file is loaded', async () => {
    mocks.openFileWithAlert.mockResolvedValueOnce(false)
    await DevelopProjectController.openFileWithAlert()
    expect(mocks.setScreen).not.toHaveBeenCalled()

    mocks.openFileWithAlert.mockResolvedValueOnce(true)
    await DevelopProjectController.openFileWithAlert()
    expect(mocks.setScreen).toHaveBeenCalledWith('workspace')
  })

  it('closes a confirmed project and returns home', async () => {
    mocks.confirmDiscard.mockResolvedValueOnce(true)

    await DevelopProjectController.close()

    expect(mocks.close).toHaveBeenCalledOnce()
    expect(mocks.setScreen).toHaveBeenCalledWith('home')
  })

  it('keeps the project open when discard is cancelled', async () => {
    mocks.confirmDiscard.mockResolvedValueOnce(false)

    await DevelopProjectController.close()

    expect(mocks.close).not.toHaveBeenCalled()
    expect(mocks.setScreen).not.toHaveBeenCalled()
    expect(mocks.stopMcp).not.toHaveBeenCalled()
  })

  it('keeps the project and screen open when MCP stop is rejected', async () => {
    mocks.confirmDiscard.mockResolvedValueOnce(true)
    mocks.stopMcp.mockResolvedValueOnce({ outcome: 'rejected', message: 'Agent editing.' })
    await DevelopProjectController.close()
    expect(mocks.close).not.toHaveBeenCalled()
    expect(mocks.setScreen).not.toHaveBeenCalled()
    expect(mocks.showToast).toHaveBeenCalledWith('Agent editing.', { tone: 'danger', durationMs: 5000 })
  })
})
