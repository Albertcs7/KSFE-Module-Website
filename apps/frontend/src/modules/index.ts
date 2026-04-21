export interface VisibleModule {
  label: string
  path: string
  icon: string
}

const VISIBLE_MODULES: VisibleModule[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: 'grid',
  },
  {
    label:"Insurance",
    path:'/insurance',
    icon:'heart-handshake',
  }
]

export const getVisibleModules = (): VisibleModule[] => VISIBLE_MODULES
