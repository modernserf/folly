import shortid from 'shortid'

export const program = (children = []) => ({ type: 'program', children })

export const header = (label = '', varName, id = shortid.generate()) => ({
    type: 'headerCell',
    id,
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
    id: shortid.generate(),
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
