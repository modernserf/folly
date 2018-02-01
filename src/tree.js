import { path } from 'ramda'

export const program = (children = {}) => ({ type: 'program', children })

export const header = (label = '', varName) => ({
    type: 'headerCell',
    label,
    varName,
})

export const ruleBlock = (id, headers, children = []) => ({
    type: 'ruleBlock',
    id,
    header: {
        type: 'headerRow',
        children: headers,
    },
    children,
})

export const ruleCase = (freeVars, children = []) => ({
    type: 'ruleCase',
    freeVars,
    children,
})

export const text = (label) => ({ type: 'text', label })
export const placeholder = () => ({ type: 'placeholder' })
export const op = (operator, lhs = placeholder(), rhs = placeholder()) =>
    ({ type: 'operator', operator, lhs, rhs })
export const varr = (id) => ({ type: 'var', id })
export const list = (children = [], tail) => ({ type: 'list', children, tail })
export const struct = (id, children = []) => ({ type: 'struct', id, children })
export const comment = (body) => ({ type: 'comment', body })

const childPaths = {
    operator: () => [['lhs'], ['rhs']],
    struct: (xs) => xs.children.map((_, i) => ['children', i]),
    list: (xs) => xs.children.map((_, i) => ['children', i]).concat(xs.tail ? [['tail']] : []),
}

const getChildren = (node, prevPath) =>
    childPaths[node.type](node).map((nextPath) =>
        traverse(path(nextPath, node), [...prevPath, ...nextPath])).reduce((l, r) => l.concat(r), [])

export const traverse = (node, path) =>
    childPaths[node.type]
        ? [{ node, path }, ...getChildren(node, path)]
        : [{ node, path }]
