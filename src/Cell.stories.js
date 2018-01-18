import h from 'react-hyperscript'
import { Provider } from 'react-redux'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'
import Cell, { BaseCell } from './Cell'

const textCell = { id: 'park', type: 'text', value: 'Park Street' }
const numberCell = { id: 'num', type: 'number', value: 123.45 }

const tuple = (...values) => ({
    format: { id: 'tuple' },
    fields: values.map((v, i) => ({ id: String(i), value: v, viewState: 'view' })),
})

const record = (...pairs) => ({
    format: { id: 'record', labels: pairs.map(([k]) => ({ id: k, label: k })) },
    fields: pairs.map(([k, v]) => ({ id: k, value: v, viewState: 'view' })),
})

const cellReducer = (state, rootState, { type, payload }) => {
    switch (type) {
    case 'cell_selected':
        return { ...state, viewState: 'edit' }
    case 'cell_changed':
        return { ...state, value: payload }
    case 'cell_changed_validated': {
        switch (payload.status) {
        case 'ok':
            return { ...state, value: payload.value, hasError: false }
        case 'error':
            return { ...state, value: payload.value, hasError: true }
        }
    }
    }
    return state
}

const reducer = (state, { type, payload }) => {
    switch (type) {
    case 'cell_action':
        return { ...state, [payload.id]: cellReducer(state[payload.id], state, payload.action) }
    default:
        return state
    }
}

const store = {
    _state: {
        1: { ...textCell, viewState: 'view' },
        2: { ...numberCell, viewState: 'view' },
        3: {
            type: 'struct',
            value: record(['From', textCell], ['To', { id: 'south', type: 'text', value: 'South Station' }]),
            viewState: 'view',
        },
    },
    _subscribers: [],
    dispatch (action) {
        console.log(action)
        store._state = reducer(store._state, action)
        store._subscribers.forEach((fn) => fn())
    },
    subscribe (fn) {
        store._subscribers.push(fn)
        return () => {
            const i = store._subscribers.indexOf(fn)
            store._subscribers.splice(i, 1)
        }
    },
    getState () {
        return {
            pull: (id, params) => store._state[id],
        }
    },
}

const App = () => h('div', [
    h(Cell, { id: '1' }),
    h(Cell, { id: '2' }),
    h(Cell, { id: '3' }),
])

storiesOf('Cell', module)
    .add('text cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'view'),
        h(BaseCell, { ...textCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(BaseCell, { ...textCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(BaseCell, { ...textCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(BaseCell, { ...textCell, viewState: 'invalid' }),
    ]))
    .add('number cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'view'),
        h(BaseCell, { ...numberCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(BaseCell, { ...numberCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(BaseCell, { ...numberCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(BaseCell, { ...numberCell, viewState: 'invalid' }),
        h('h2', 'not a number'),
        h(BaseCell, { ...numberCell, value: 'Butts', viewState: 'invalidNumber' }),
    ]))
    .add('ref cell', () => h(DevContainer, { width: '200px' }, [
        h('h2', 'ref of text'),
        h(BaseCell, { type: 'ref', value: textCell, viewState: 'view' }),
        h('h2', 'ref of number'),
        h(BaseCell, { type: 'ref', value: numberCell, viewState: 'view' }),
        h('h2', 'edit'),
        h(BaseCell, { type: 'ref', value: textCell, viewState: 'edit' }),
        h('h2', 'disabled'),
        h(BaseCell, { type: 'ref', value: textCell, viewState: 'disabled' }),
        h('h2', 'invalid'),
        h(BaseCell, { type: 'ref', value: textCell, viewState: 'invalid' }),
    ]))
    .add('struct cell', () => h(DevContainer, { width: '300px' }, [
        h('h2', '2-tuple'),
        h(BaseCell, {
            type: 'struct',
            value: tuple(textCell, numberCell),
            viewState: 'view',
        }),
        h('h2', 'named fields'),
        h(BaseCell, {
            type: 'struct',
            value: record(['From', textCell], ['To', { id: 'south', type: 'text', value: 'South Station' }]),
            viewState: 'view',
        }),
        h('h2', 'nested records'),
        h(BaseCell, {
            type: 'struct',
            value: record(
                ['Foo', {
                    type: 'struct',
                    value: record(['Quux', { type: 'ref', value: textCell, viewState: 'view' }]),
                    viewState: 'view',
                }],
                ['Bar', {
                    type: 'struct',
                    value: tuple(textCell, numberCell),
                    viewState: 'view',
                }]
            ),
            viewState: 'view',
        }),
    ]))
    .add('connected cell', () => h(DevContainer, { width: '300px' }, [
        h(Provider, { store }, [
            h(App),
        ]),
    ]))
