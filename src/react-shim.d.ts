declare module 'react' {
  export type SetStateAction<S> = S | ((previous: S) => S)
  export type Dispatch<A> = (value: A) => void
  export type ReactNode = any
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>]
  export function useEffect(effect: () => void | (() => void), dependencies?: unknown[]): void
  export function useMemo<T>(factory: () => T, dependencies: unknown[]): T
  export function useRef<T>(initialValue: T): { current: T }
  export function useRef<T>(initialValue: T | null): { current: T | null }
  export type Context<T> = { Provider: (props: { value: T; children?: ReactNode }) => any }
  export function createContext<T>(defaultValue: T): Context<T>
  export function useContext<T>(context: Context<T>): T
  export const StrictMode: (props: { children?: unknown }) => any
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): { render(children: unknown): void }
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown
  export const jsxs: unknown
  export const Fragment: unknown
}

declare namespace JSX {
  interface IntrinsicElements { [elementName: string]: any }
}
