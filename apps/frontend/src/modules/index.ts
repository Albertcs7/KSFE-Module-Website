export interface VisibleModule {
  label: string
  path: string
  icon: string
  children?: { label: string; path: string }[]
}

const VISIBLE_MODULES: VisibleModule[] = [
  {
    label: "Insurance",
    path: '/insurance',
    icon: 'heart-handshake',
    children: [
      { label: 'SLI', path: '/insurance/sli' },
      { label: 'GIS', path: '/insurance/gis' },
      { label: 'Monthly Report', path: '/insurance/monthly-report' },
    ]
  }
]

export const getVisibleModules = (): VisibleModule[] => VISIBLE_MODULES
