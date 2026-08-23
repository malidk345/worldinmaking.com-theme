import React from 'react'

/** Local stand-in for kea / kea-router / kea-forms / kea-loaders. WIM does not run a kea store. */

export const useActions = (_logic?: any): Record<string, (...args: any[]) => void> => ({})
export const useValues = (_logic?: any): Record<string, any> => ({})
export const useMountedLogic = (_logic?: any): Record<string, any> => ({})
export const useAllValues = (_logic?: any): Record<string, any> => ({})

export const kea = (_input?: any) => () => ({ values: {}, actions: {} })
export const actions = (fn: any) => fn
export const key = (fn: any) => fn
export const path = (fn: any) => fn
export const props = (fn: any) => fn
export const reducers = (fn: any) => fn
export const listeners = (fn: any) => fn
export const connect = (fn: any) => fn
export const selectors = (fn: any) => fn
export const events = (fn: any) => fn
export const afterMount = (fn: any) => fn
export const loaders = (fn: any) => fn
export const forms = (fn: any) => fn

export type MakeLogicType<V = any, A = any> = any
export type BuiltLogic = any
export type DeepPartial<T> = T
export type DeepPartialMap<T, E = any> = any
export type FieldName = string
export type ValidationErrorType = string
export type FieldProps = any

export const router = {
    values: {
        location: { pathname: '/', search: '', hash: '' },
        currentLocation: { pathname: '/' },
        searchParams: {} as Record<string, any>,
        hashParams: {} as Record<string, any>,
    },
    actions: {
        push: (..._args: any[]) => {},
        replace: (..._args: any[]) => {},
    },
}

export const urlToAction = (map: any) => map

export function Form({ children }: { children?: React.ReactNode }): React.ReactElement {
    return React.createElement(React.Fragment, null, children)
}

export function Field({ children, ...rest }: any): React.ReactElement {
    if (typeof children === 'function') {
        return children({ value: undefined, onChange: () => {}, ...rest })
    }
    return React.createElement(React.Fragment, null, children)
}
