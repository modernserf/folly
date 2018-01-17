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
]

const traverse = (data, path) =>
    path.length ? traverse(data[path[0]], path.slice(1)) : data

const findNextNode = (path, data, offset) => {
    if (!path.length) { return [] }
    const most = path.slice(0, -1)
    const last = path[path.length - 1]
    const keys = Object.keys(traverse(data, most))
    const idx = keys.indexOf(last)
    const nextKey = keys[idx + offset]
    if (nextKey) {
        return most.concat(nextKey)
    } else {
        return findNextNode(most, data, offset)
    }
}

const firstLeaf = (data, path, offset) => {
    const val = traverse(data, path)
    if (typeof val === 'object') {
        const keys = Object.keys(val)
        const nextKey = offset > 0 ? keys[0] : keys[keys.length - 1]
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

function reducer (state, data, action) {
    const val = traverse(data, state)
    switch (action) {
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
    }
    onAction = (action) => {
        this.setState((state) => ({ path: reducer(state.path, this.props.data, action) }))
    }
    render () {
        return h('div', [
            h(Tree, { data: this.props.data, path: this.state.path }),
            h('div', actions.map((button) =>
                h('button', { key: button, onClick: () => this.onAction(button) }, [button]))),
        ])
    }
}

storiesOf('Editor', module)
    .add('selection', () => {
        const data = {
            foo: {
                bar: [1, 2, undefined, 4],
            },
            baz: [
                { id: 1, label: undefined },
                { id: 2, label: 'baz 2' },
            ],
        }
        return h(Editor, { data })
    })
