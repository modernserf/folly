import { createStore } from 'redux'

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

export const store = createStore((state) => state)
Object.defineProperty(window, 'db', { get: () => store.getState() })

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}
