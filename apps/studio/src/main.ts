import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import AppSettings from './system/application/settings/app-settings-store'
import { appAreaStore } from './system/application/navigation'

await AppSettings.initialize()
appAreaStore.set(AppSettings.getGeneral().defaultArea)

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
