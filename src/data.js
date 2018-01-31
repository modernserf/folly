import shortid from 'shortid'
import { curry, uncurryN, lensPath, view, set, over, compose, pipe, map, append } from 'ramda'

const tryNumber = x => Number.isFinite(Number(x)) ? Number(x) : x

const createLensBuilder = (stack) => new Proxy(lensPath, {
    get: (target, prop, receiver) => createLensBuilder(stack.concat(tryNumber(prop))),
    apply: () => lensPath(stack),
})

const L = createLensBuilder([])

const match = (handlers, initState) => (state = initState, action) => handlers[action.type]
    ? handlers[action.type](action.payload)(state)
    : state

export const program = (...children) => ({ type: 'program', children })

export const header = (label = '', varName, id = shortid.generate()) => ({
    type: 'headerCell',
    id,
    label,
    varName,
})
export const text = (label) => ({ type: 'text', id: shortid.generate(), label })

export const ruleBlock = (headers, ...children) => ({
    type: 'ruleBlock',
    id: shortid.generate(),
    header: {
        type: 'headerRow',
        children: headers,
    },
    children,
})

export const ruleCase = (freeVars, ...children) => ({
    type: 'ruleCase',
    id: shortid.generate(),
    freeVars,
    children,
})

export const placeholder = () => ({ type: 'placeholder' })
export const op = (operator, lhs = placeholder(), rhs = placeholder()) =>
    ({ type: 'operator', operator, lhs, rhs })
export const varr = (id) => ({ type: 'var', id })
export const list = (children = [], tail) => ({ type: 'list', children, tail })
export const struct = (...children) => ({ type: 'struct', children })
export const comment = (body) => ({ type: 'comment', body })

const listCons = () => list([placeholder()], placeholder())
const initStruct = (...headers) => struct(...headers.map((h) => [h, placeholder()]))
const eq = (varName) => op('==', varr(varName))

const enqueue = uncurryN(2, (lens) => compose(over(lens), append))
const dequeue = (lens) => over(lens, (xs) => xs.slice(1))
const appendL = enqueue
const mergeL = (lens, next) => over(lens, (prev) => ({ ...prev, ...next }))

const blocks = L.program.children

const allHeadersAt = ({ block }) =>
    blocks[block].header.children()
const headerAt = ({ block, headerField }) =>
    blocks[block].header.children[headerField]()
const headerVarAt = (cursor) =>
    compose(headerAt(cursor), L.varName())
const allRowsAt = ({ block }) =>
    blocks[block].children()
const allValuesAt = ({ block, rule }) =>
    blocks[block].children[rule].children()
const valueAt = ({ block, rule, holes: [hole] }) =>
    compose(blocks[block].children[rule].children(), lensPath(hole))
const freeVarAt = ({ block, rule }, id) =>
    blocks[block].children[rule].freeVars[id]()

const _ruleCase = (x) => ruleCase({}, ...x)
const rowsForHeaders = compose(_ruleCase, map((h) => eq(h.id)))

const W = (f) => (x) => f(x)(x)
const withView = curry((lens, f) => W(compose(f, view(lens))))
const withCursor = withView(L.cursor())

const fillHole = dequeue(L.cursor.holes())
const digHoleAt = (x) => enqueue(L.cursor.holes(), x)
const holesForRuleCase = digHoleAt([0])
const holesForRuleLine = (xs) => digHoleAt([xs.length - 1])
const holesForOperator = ({ holes: [hole] }) => pipe(
    digHoleAt([...hole, 'lhs']),
    digHoleAt([...hole, 'rhs']),
)
const holesForCons = ({ holes: [hole] }) => pipe(
    digHoleAt([...hole, 'children', 0]),
    digHoleAt([...hole, 'tail']),
)
const holesForStruct = ({ holes: [hole] }, headers) => pipe(
    ...headers.map((_, i) => digHoleAt([...hole, 'children', i, 1]))
)
const holesForFactAsRule = (headers) => pipe(
    ...headers.map((_, i) => digHoleAt([i, 'rhs'])),
)

const appendAndUpdateCursor = (lensToValues, lensToCursor, tailValue) => pipe(
    appendL(lensToValues, tailValue),
    withView(lensToValues, (xs) => set(lensToCursor, xs.length - 1))
)

const resetRuleCase = set(L.cursor.rule(), 0)
const resetHeaderField = set(L.cursor.headerField(), 0)
const resetHoles = set(L.cursor.holes(), [])

// TODO: these are used for selecting which actions are meaningful in a given context
const focusHeader = set(L.cursor.focus(), 'header')
const focusBody = set(L.cursor.focus(), 'body')

export const reducer = match({
    // TODO `selectFooAt(path)`, `insertFooAt(index)`, `moveFoo(from, to)` etc
    appendBlock: () => pipe(
        appendAndUpdateCursor(blocks(), L.cursor.block(), ruleBlock([header()])),
        resetRuleCase,
        resetHoles,
        resetHeaderField,
        focusHeader,
    ),
    appendRuleCase: () => withCursor((cursor) => pipe(
        appendAndUpdateCursor(allRowsAt(cursor), L.cursor.rule(), ruleCase({})),
        resetHoles,
        holesForRuleCase,
        focusBody,
        withCursor((nextCursor) => set(valueAt(nextCursor), placeholder()))
    )),
    appendRuleLine: () => withCursor((cursor) => pipe(
        appendL(allValuesAt(cursor), placeholder()),
        resetHoles,
        withView(allValuesAt(cursor), holesForRuleLine),
    )),
    appendHeaderField: () => withCursor((cursor) =>
        appendAndUpdateCursor(allHeadersAt(cursor), L.cursor.headerField(), header())
    ),
    appendFactAsRule: () => withCursor((cursor) =>
        withView(allHeadersAt(cursor), (headers) => pipe(
            appendAndUpdateCursor(allRowsAt(cursor), L.cursor.rule(), rowsForHeaders(headers)),
            resetHoles,
            holesForFactAsRule(headers),
            focusBody,
        ))
    ),

    setHeader: (header) => withCursor((cursor) =>
        set(headerAt(cursor), header)
    ),
    // TODO: setHeaderLabel (changes label without changing ID)
    setHeaderVar: (varName) => withCursor((cursor) =>
        set(headerVarAt(cursor), varName)
    ),

    addOperator: (operator) => withCursor((cursor) => pipe(
        set(valueAt(cursor), op(operator)),
        fillHole,
        holesForOperator(cursor),
    )),
    addVar: (id) => withCursor((cursor) => pipe(
        set(valueAt(cursor), varr(id)),
        fillHole,
    )),
    addNewVar: ({ id, label }) => withCursor((cursor) => pipe(
        set(freeVarAt(cursor, id), label),
        set(valueAt(cursor), varr(id)),
        fillHole
    )),
    // should this be a distinct action from adding a cons list?
    // how would we represent optional holes?
    // does a comma need to be entered as an operator (i.e. before the value)?
    addEmptyList: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), list()),
        fillHole
    )),
    addConsList: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), listCons()),
        fillHole,
        holesForCons(cursor)
    )),
    addStruct: (headers) => withCursor((cursor) => pipe(
        set(valueAt(cursor), initStruct(...headers.map(header))),
        fillHole,
        holesForStruct(cursor, headers)
    )),
    addText: (textValue) => withCursor((cursor) => pipe(
        set(valueAt(cursor), text(textValue)),
        fillHole
    )),

    // TODO: this should queue up all the placeholders in the rule
    selectBody: ({ block, rule, path }) => pipe(
        mergeL(L.cursor(), { block, rule, holes: [path] }),
        focusBody,
    ),
    selectHeader: ({ block, headerField }) => pipe(
        mergeL(L.cursor(), { block, headerField }),
        focusHeader,
    ),
    commentOut: () => withCursor((cursor) => pipe(
        over(valueAt(cursor), comment),
        fillHole,
    )),
    removeValue: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), placeholder())
    )),
}, {
    program: program(),
    cursor: { block: 0, rule: 0, headerField: 0, holes: [], focus: 'body' },
})
