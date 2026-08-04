import React from 'react'
import { LemonButton } from '../components/ui/LemonButton'
import { LemonTag } from '../components/ui/LemonTag'
import { Bold, Italic, Link as LinkIcon } from 'lucide-react'
import dayjsLib from 'dayjs'

export { LemonButton, LemonTag }

export const dayjs = dayjsLib
export const CodeSnippet: any = ({ children }: any) => <code>{children}</code>
export const Language: any = {}
export const themeLogic: any = () => ({ values: { theme: 'light' } })
export const Region: any = {}
export const urls: any = { notebook: () => '/', notebookEdit: () => '/' }
export const urlToResource = (url: string) => url

export const useActions = (_logic?: any) => ({})
export const useValues = (_logic?: any) => ({})
export const actions = (fn: any) => fn
export const kea = (_input: any) => () => ({ values: {}, actions: {} })
export const key = (fn: any) => fn
export const path = (fn: any) => fn
export const props = (fn: any) => fn
export const reducers = (fn: any) => fn
export const listeners = (fn: any) => fn
export const connect = (fn: any) => fn
export const isChristmas = false
export const PathType: any = {}

export const router = {
  values: { location: { pathname: '/', search: '', hash: '' }, currentLocation: { pathname: '/' } },
  actions: { push: () => {}, replace: () => {} },
}

const posthogMock = {
  capture: (_event: string, _properties?: any) => {},
  on: (_event: string, _callback: any) => {},
  opt_in_capturing: () => {},
  opt_out_capturing: () => {},
}

export default posthogMock

export const IconBold = (props: any) => <Bold className="w-4 h-4" {...props} />
export const IconItalic = (props: any) => <Italic className="w-4 h-4" {...props} />
export const IconLink = (props: any) => <LinkIcon className="w-4 h-4" {...props} />

export const Scene: any = {}
export const ProductKey: any = {}

export class PostHogErrorBoundary extends React.Component<any, any> {
  override render() {
    return this.props.children
  }
}

export const LemonDropdown: React.FC<any> = ({ children, overlay }) => (
  <div className="relative inline-block group">
    {children}
    {overlay && (
      <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg p-2">
        {overlay}
      </div>
    )}
  </div>
)

export const LemonBadge: any = ({ children, content, className }: any) => (
  <span className={`inline-flex items-center justify-center font-bold px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 ${className || ''}`}>
    {content || children}
  </span>
)
LemonBadge.Number = ({ count, className }: any) => (
  <span className={`inline-flex items-center justify-center font-bold px-1 py-0.5 text-[9px] rounded-full bg-blue-600 text-white ${className || ''}`}>
    {count}
  </span>
)

export const LemonInput = React.forwardRef<HTMLInputElement, any>((props, ref) => (
  <input ref={ref} {...props} className={`px-2.5 py-1 text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 ${props.className || ''}`} />
))

export const LemonTextArea = React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
  <textarea ref={ref} {...props} className={`p-2 text-sm border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 ${props.className || ''}`} />
))

export const LemonMenu: React.FC<any> = ({ children }) => (
  <div className="relative inline-block">{children}</div>
)

export const Spinner: React.FC<any> = () => (
  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
)

export const lemonToast = {
  info: (msg: string, _opts?: any) => console.log('[Toast Info]', msg),
  error: (msg: string, _opts?: any) => console.error('[Toast Error]', msg),
  warning: (msg: string, _opts?: any) => console.warn('[Toast Warning]', msg),
  success: (msg: string, _opts?: any) => console.log('[Toast Success]', msg),
}
