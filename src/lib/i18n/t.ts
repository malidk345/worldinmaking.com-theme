import { useMemo } from 'react'
import { useUser } from 'hooks/useUser'
import { catalog, type I18nKey, type UiLang } from './catalog'

export function resolveUiLang(code?: string | null): UiLang {
    return String(code || '').toLowerCase() === 'tr' ? 'tr' : 'en'
}

export function t(key: I18nKey, lang: UiLang = 'en'): string {
    return catalog[lang][key] || catalog.en[key] || key
}

export function useT() {
    const { user } = useUser()
    const lang = resolveUiLang(user?.profile?.preferredLanguage)
    return useMemo(() => {
        const translate = (key: I18nKey) => t(key, lang)
        return { t: translate, lang }
    }, [lang])
}
