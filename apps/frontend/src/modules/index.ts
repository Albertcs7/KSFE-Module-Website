export interface VisibleModule {
  label: string
  path: string
  icon: string
  children?: { label: string; path: string }[]
}

const VISIBLE_MODULES: VisibleModule[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: 'grid',
  },
  {
    label: "Insurance",
    path: '/insurance',
    icon: 'heart-handshake',
    children: [
      { label: 'SLI', path: '/insurance/sli' },
      { label: 'Option 2', path: '/insurance/option2' },
      { label: 'Option 3', path: '/insurance/option3' },
      { label: 'Option 4', path: '/insurance/option4' },
      { label: 'Option 5', path: '/insurance/option5' },
    ]
  }
]

export const getVisibleModules = (): VisibleModule[] => VISIBLE_MODULES
