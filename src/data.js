import shortid from 'shortid'
import { curry, uncurryN, lensPath, lensIndex, view, set, over, compose, pipe, map, append } from 'ramda'

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
export const op = (operator, lhs = placeholder(), rhs = placeholder()) => ({ type: 'operator', operator, lhs, rhs })
export const varr = (id) => ({ type: 'var', id })
export const list = (children = [], tail) => ({ type: 'list', children, tail })
export const struct = (...children) => ({ type: 'struct', children })
export const comment = (body) => ({ type: 'comment', body })

const listCons = () => list([placeholder()], placeholder())
const initStruct = (...headers) => struct(...headers.map((h) => [h, placeholder()]))
export const eq = (varName, rhs) => op('==', varr(varName), rhs)
const initRuleBlock = () => ruleBlock([header()])

const enqueue = uncurryN(2, (lens) => compose(over(lens), append))
const dequeue = (lens) => over(lens, (xs) => xs.slice(1))
const appendL = enqueue

const thenLensIndex = (aLens) => (index) => compose(aLens, lensIndex(index))

const childrenL = lensPath(['children'])
const programBlocks = lensPath(['program', 'children'])
const _blockAt = thenLensIndex(programBlocks)
const _rows = childrenL
const _headerItems = lensPath(['header', 'children'])
const _headerAt = thenLensIndex(_headerItems)
const _headerVarName = lensPath(['varName'])
const _ruleAt = thenLensIndex(_rows)
const _freeVarsL = lensPath(['freeVars'])

const allHeadersAt = ({ block }) =>
    compose(_blockAt(block), _headerItems)
const headerAt = ({ block, headerField }) =>
    compose(_blockAt(block), _headerAt(headerField))
const headerVarAt = (cursor) =>
    compose(headerAt(cursor), _headerVarName)
const allRowsAt = ({ block }) =>
    compose(_blockAt(block), _rows)
const allValuesAt = ({ block, rule }) =>
    compose(_blockAt(block), _ruleAt(rule), childrenL)
const valueAt = ({ block, rule, holes: [hole] }) =>
    compose(_blockAt(block), _ruleAt(rule), childrenL, lensPath(hole))
const freeVarAt = ({ block, rule }, id) =>
    compose(_blockAt(block), _ruleAt(rule), _freeVarsL, lensPath([id]))

const _ruleCase = (x) => ruleCase({}, ...x)
const defaultRowValue = compose(eq, (h) => h.id)
const rowsForHeaders = compose(_ruleCase, map(defaultRowValue))

const cursor = lensPath(['cursor'])
const cursorBlockField = lensPath(['cursor', 'block'])
const cursorHeaderField = lensPath(['cursor', 'headerField'])
const cursorRuleField = lensPath(['cursor', 'rule'])
const holes = lensPath(['cursor', 'holes'])
const cursorFocus = lensPath(['cursor', 'focus'])

const W = (f) => (x) => f(x)(x)
const withView = curry((lens, f) => W(compose(f, view(lens))))
const withCursor = withView(cursor)

const consumeHole = dequeue(holes)
const holesForRuleCase = enqueue(holes, [0])
const holesForRuleLine = (xs) => enqueue(holes, [xs.length - 1])
const holesForOperator = ({ holes: [hole] }) => pipe(
    enqueue(holes, [...hole, 'lhs']),
    enqueue(holes, [...hole, 'rhs']),
)
const holesForCons = ({ holes: [hole] }) => pipe(
    enqueue(holes, [...hole, 'children', 0]),
    enqueue(holes, [...hole, 'tail']),
)
const holesForStruct = ({ holes: [hole] }, headers) => pipe(
    ...headers.map((_, i) => enqueue(holes, [...hole, 'children', i, 1]))
)
const holesForFactAsRule = (headers) => pipe(
    ...headers.map((_, i) => enqueue(holes, [i, 'rhs'])),
)

const appendAndUpdateCursor = (lensToValues, lensToCursor, tailValue) => pipe(
    appendL(lensToValues, tailValue),
    withView(lensToValues, (xs) => set(lensToCursor, xs.length - 1))
)

const resetRuleCase = set(cursorRuleField, 0)
const resetHeaderField = set(cursorHeaderField, 0)
const resetHoles = set(holes, [])

// TODO: these are used for selecting which actions are meaningful in a given context
const focusHeader = set(cursorFocus, 'header')
const focusBody = set(cursorFocus, 'body')

export const reducer = match({
    // TODO `selectFooAt(path)`, `insertFooAt(index)`, `moveFoo(from, to)` etc
    appendBlock: () => pipe(
        appendAndUpdateCursor(programBlocks, cursorBlockField, initRuleBlock()),
        resetRuleCase,
        resetHoles,
        resetHeaderField,
        focusHeader,
    ),
    appendRuleCase: () => withCursor((cursor) => pipe(
        appendAndUpdateCursor(allRowsAt(cursor), cursorRuleField, ruleCase({})),
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
        appendAndUpdateCursor(allHeadersAt(cursor), cursorHeaderField, header())
    ),
    appendFactAsRule: () => withCursor((cursor) =>
        withView(allHeadersAt(cursor), (headers) => pipe(
            appendAndUpdateCursor(allRowsAt(cursor), cursorRuleField, rowsForHeaders(headers)),
            resetHoles,
            holesForFactAsRule(headers),
            focusBody,
        ))
    ),

    // TODO: changing this should change references in body
    setHeader: (header) => withCursor((cursor) =>
        set(headerAt(cursor), header)
    ),
    setHeaderVar: (varName) => withCursor((cursor) =>
        set(headerVarAt(cursor), varName)
    ),

    addOperator: (operator) => withCursor((cursor) => pipe(
        set(valueAt(cursor), op(operator)),
        consumeHole,
        holesForOperator(cursor),
    )),
    addVar: (id) => withCursor((cursor) => pipe(
        set(valueAt(cursor), varr(id)),
        consumeHole,
    )),
    addNewVar: ({ id, label }) => withCursor((cursor) => pipe(
        set(freeVarAt(cursor, id), label),
        set(valueAt(cursor), varr(id)),
        consumeHole
    )),
    // should this be a distinct action from adding a cons list?
    // how would we represent optional holes?
    // does a comma need to be entered as an operator (i.e. before the value)?
    addEmptyList: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), list()),
        consumeHole
    )),
    addConsList: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), listCons()),
        consumeHole,
        holesForCons(cursor)
    )),
    addStruct: (headers) => withCursor((cursor) => pipe(
        set(valueAt(cursor), initStruct(...headers.map(header))),
        consumeHole,
        holesForStruct(cursor, headers)
    )),
    addText: (textValue) => withCursor((cursor) => pipe(
        set(valueAt(cursor), text(textValue)),
        consumeHole
    )),

    // TODO: this should queue up all the placeholders in the rule
    selectBody: ({ block, rule, path }) => over(cursor, (prevC) => ({
        ...prevC,
        block,
        rule,
        holes: [path],
        focus: 'body',
    })),
    selectHeader: ({ block, headerField }) => over(cursor, (prevC) => ({
        ...prevC,
        block,
        headerField,
        focus: 'header',
    })),

    commentOut: () => withCursor((cursor) => pipe(
        over(valueAt(cursor), comment),
        consumeHole,
    )),
    removeValue: () => withCursor((cursor) => pipe(
        set(valueAt(cursor), placeholder())
    )),
}, {
    program: program(),
    cursor: { block: 0, rule: 0, headerField: 0, holes: [], focus: 'body' },
})
