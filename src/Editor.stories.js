import { Component } from 'react'
import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'

const actions = [
    // selection
    'prev', // select prev term
    'next', // select next term
    'prev_leaf', // select prev leaf node
    'next_leaf', // select next leaf node
    'prev_unbound', // go to prev unbound field
    'next_unbound', // "     next "
    'in', // select first field of focused term
    'out', // select enclosing term
].map((key) => [key, () => ({ type: key })])

const head = (xs) => xs[0]
const tail = (xs) => xs.slice(1)
const most = (xs) => xs.slice(0, -1)
const last = (xs) => xs[xs.length - 1]

const traverse = (data, path) =>
    path.length ? traverse(data[head(path)], tail(path)) : data

const findNextNode = (path, data, offset) => {
    if (!path.length) { return [] }
    const keys = Object.keys(traverse(data, most(path)))
    const idx = keys.indexOf(last(path))
    const nextKey = keys[idx + offset]
    if (nextKey) {
        return most(path).concat([nextKey])
    } else {
        return findNextNode(most(path), data, offset)
    }
}

const firstLeaf = (data, path, offset) => {
    const val = traverse(data, path)
    if (typeof val === 'object') {
        const keys = Object.keys(val)
        const nextKey = offset > 0 ? head(keys) : last(keys)
        return firstLeaf(data, path.concat([nextKey]), offset)
    } else {
        return path
    }
}

const findNextLeaf = (path, data, offset) => {
    const val = traverse(data, path)
    if (typeof val === 'object' && offset > 0) {
        return firstLeaf(data, path, offset)
    }
    const nextPath = findNextNode(path, data, offset)
    return firstLeaf(data, nextPath, offset)
}

const findNextUndefined = (path, data, offset) => {
    const inner = (innerPath) => {
        const leaf = findNextLeaf(innerPath, data, offset)
        if (traverse(data, leaf) === undefined) {
            return leaf
        }
        return inner(leaf)
    }

    try {
        return inner(path)
    } catch (e) {
        return path
    }
}

function reducer (state, data, { type, payload }) {
    const val = traverse(data, state)
    switch (type) {
    case 'prev': {
        return findNextNode(state, data, -1)
    }
    case 'next': {
        return findNextNode(state, data, 1)
    }
    case 'prev_leaf': {
        return findNextLeaf(state, data, -1)
    }
    case 'next_leaf': {
        return findNextLeaf(state, data, 1)
    }
    case 'prev_unbound': {
        return findNextUndefined(state, data, -1)
    }
    case 'next_unbound': {
        return findNextUndefined(state, data, 1)
    }
    case 'in': {
        if (typeof val === 'object') {
            return state.concat(Object.keys(val)[0])
        } else {
            return state
        }
    }
    case 'out': {
        return state.slice(0, -1)
    }
    default:
        return state
    }
}

const Selected = styled.span`
    color: orange;
`

const Unbound = styled.span`
    font-style: italic;
`

const Structure = styled.div`
    padding-left: 1em;
`

const Tree = ({ data, path }) => {
    // selected
    if (path && path.length === 0) {
        return h(Selected, [
            h(Tree, { data }),
        ])
    // unbound
    } else if (data === undefined) {
        return h(Unbound, ['undefined'])
    // structure
    } else if (typeof data === 'object') {
        return h('div',
            Object.entries(data).map(([k, v]) =>
                (!path || path[0] !== k)
                    ? h(Structure, [k, ':', h(Tree, { key: k, data: v })])
                    : h(Structure, [k, ':', h(Tree, { key: k, data: v, path: path.slice(1) })])))
    // normal value
    } else {
        return h('span', [data])
    }
}

class Editor extends Component {
    state = {
        path: [],
        data: {
            foo: {
                bar: [1, 2, undefined, 4],
            },
            baz: [
                { id: 1, label: undefined },
                { id: 2, label: 'baz 2' },
            ],
        },
    }
    onAction = (action) => {
        this.setState((state) => ({ path: reducer(state.path, state.data, action) }))
    }
    render () {
        const { path, data } = this.state
        return h('div', [
            h(Tree, { path, data }),
            h('div', actions.map(([label, handler]) =>
                h('button', { key: label, onClick: () => this.onAction(handler()) }, [label]))),
        ])
    }
}

storiesOf('Editor', module)
    .add('selection', () => {
        return h(Editor)
    })
