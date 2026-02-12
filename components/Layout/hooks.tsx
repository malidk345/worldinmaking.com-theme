import { useContext } from 'react'
import { Context, LayoutContextType } from './context'

export const useLayoutData = (): LayoutContextType => {
    const layoutData = useContext(Context)
    if (!layoutData) {
        return {
            menu: [],
            fullWidthContent: false,
            setFullWidthContent: () => { },
            compact: false,
            enterpriseMode: false,
            setEnterpriseMode: () => { },
            theoMode: false,
            setTheoMode: () => { },
            post: false,
            hedgehogModeEnabled: false,
            setHedgehogModeEnabled: () => { }
        }
    }
    return layoutData
}
