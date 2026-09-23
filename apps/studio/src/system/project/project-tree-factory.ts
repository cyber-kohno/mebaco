import Components from '@system/model/declaration/components'
import Declares from '@system/model/declaration/declares'
import Functions from '@system/model/declaration/functions'
import Types from '@system/model/declaration/types'
import Styles from '@system/model/declaration/styles'
import Constants from '@system/model/declaration/constants'
import Apps from '@system/model/project/apps'
import Common from '@system/model/project/common'
import Launchers from '@system/model/project/launchers'
import ProjectModel from '@system/model/project/project'
import Resources from '@system/model/resource/resources'
import Storage from '@system/model/storage/storage'
import DebugElement from '@system/model/debug/debug'
import DebugConfigurationsElement from '@system/model/debug/debug-configurations'
import DebugConfigurationElement from '@system/model/debug/debug-configuration'
import DebugResourceBindingsElement from '@system/model/debug/debug-resource-bindings'
import DebugLogElement from '@system/model/debug/debug-log'
import DebugLaunchShortcutsElement from '@system/model/debug/debug-launch-shortcuts'
import Release from '@system/model/release/release'
import Bundles from '@system/model/release/bundles'
import type TreeNode from '@system/model/tree/tree-node'

namespace ProjectTreeFactory {
  export const createRootNode = (): TreeNode.Node => ({
    id: 1,
    element: ProjectModel.create(),
    isOpen: true,
    children: [
      {
        id: 2,
        element: Apps.create(),
        isOpen: true,
        children: [],
      },
      {
        id: 3,
        element: Launchers.create(),
        isOpen: true,
        children: [],
      },
      {
        id: 16,
        element: Release.create(),
        isOpen: true,
        children: [
          {
            id: 17,
            element: Bundles.create(),
            isOpen: true,
            children: [],
          },
        ],
      },
      {
        id: 4,
        element: Common.create(),
        isOpen: false,
        children: [
          {
            id: 5,
            element: Declares.create(),
            isOpen: true,
            children: [
              {
                id: 20,
                element: Constants.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 6,
                element: Styles.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 7,
                element: Types.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 8,
                element: Functions.create(),
                isOpen: true,
                children: [],
              },
              {
                id: 9,
                element: Components.create(),
                isOpen: true,
                children: [],
              },
            ],
          },
          {
            id: 10,
            element: Resources.create(),
            isOpen: true,
            children: [],
          },
          {
            id: 19,
            element: Storage.create(),
            isOpen: true,
            children: [],
          },
        ],
      },
      {
        id: 11,
        element: DebugElement.create(),
        isOpen: true,
        children: [
          {
            id: 12,
            element: DebugConfigurationsElement.create(),
            isOpen: true,
            children: [
              {
                id: 13,
                element: DebugConfigurationElement.createDefault(),
                isOpen: true,
                children: [
                  {
                    id: 14,
                    element: DebugResourceBindingsElement.create(),
                    isOpen: true,
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            id: 18,
            element: DebugLaunchShortcutsElement.create(),
            isOpen: true,
            children: [],
          },
          {
            id: 15,
            element: DebugLogElement.create(),
            isOpen: true,
            children: [],
          },
        ],
      },
    ],
  })
}

export default ProjectTreeFactory
