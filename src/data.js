import {
    curry, uncurryN, lensPath, view, set, over, compose, pipe, append, range,
    remove, insert,
} from 'ramda'
import {
    program, header, ruleBlock, ruleCase, text, placeholder, op, varr, list, struct, comment, traverse,
} from './tree'

const tryNumber = x => Number.isFinite(Number(x)) ? Number(x) : x

const createLensBuilder = (stack) => new Proxy(lensPath, {
    get: (target, prop, receiver) => createLensBuilder(stack.concat(tryNumber(prop))),
    apply: () => lensPath(stack),
})

const L = createLensBuilder([])

const match = (handlers, initState) => (state = initState, action) => handlers[action.type]
    ? handlers[action.type](action.payload)(state)
    : state

const findPlaceholders = ({ holes: [[line]] }, data) =>
    traverse(data, [line])
        .filter((x) => x.node.type === 'placeholder')
        .map((x) => x.path)

const listCons = () => list([placeholder()], placeholder())
const initStruct = (id, arity) => struct(id, range(0, arity).map(placeholder))

const enqueue = uncurryN(2, (lens) => compose(over(lens), append))
const dequeue = (lens) => over(lens, (xs) => xs.slice(1))
const appendL = enqueue
const mergeL = (lens, next) => over(lens, (prev) => ({ ...prev, ...next }))

const blocks = L.program.children

const allHeadersAt = ({ block }) =>
    blocks[block].header.children()
const headerAt = ({ block, headerField }) =>
    blocks[block].header.children[headerField]
const allRowsAt = ({ block }) =>
    blocks[block].children()
const allValuesAt = ({ block, rule }) =>
    blocks[block].children[rule].children()
const entireLineAt = ({ block, rule, holes: [[line]] }) =>
    blocks[block].children[rule].children[line]()
const valueAt = ({ block, rule, holes: [hole] }) =>
    compose(blocks[block].children[rule].children(), lensPath(hole))
const freeVarAt = ({ block, rule }, id) =>
    blocks[block].children[rule].freeVars[id]()

const _ruleCase = (x) => ruleCase({}, x)
const rowsForHeaders = compose(_ruleCase, (hs) => hs.map((h, i) => op('==', varr(i))))

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

const foldPipe = (xs) => (init) => xs.reduce((x, f) => f(x), init)

const holesForStruct = ({ holes: [hole] }, arity) =>
    foldPipe(range(0, arity).map((_, i) => digHoleAt([...hole, 'children', i])))

const holesForFactAsRule = (headers) =>
    foldPipe(headers.map((_, i) => digHoleAt([i, 'rhs'])))

const concatR = (r) => (l) => l.concat(r)

const holesAtLinePlaceholders = withCursor((cursor) =>
    withView(entireLineAt(cursor), (tree) =>
        over(L.cursor.holes(), concatR(findPlaceholders(cursor, tree)))
    ))

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

const moveIndexes = (from, to) => (list) => pipe(
    remove(from, 1),
    insert(to, list[from])
)(list)

export const reducer = match({
    appendBlock: (id) => pipe(
        set(blocks[id](), ruleBlock(id, [header()])),
        set(L.cursor.block(), id),
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

    moveBlock: ({ block, toBlock }) =>
        over(blocks(), moveIndexes(block, toBlock)),
    moveRule: ({ block, rule, toRule }) =>
        over(allRowsAt({ block }), moveIndexes(rule, toRule)),
    moveLine: ({ block, rule, line, toLine }) =>
        over(allValuesAt({ block, rule }), moveIndexes(line, toLine)),

    setHeaderLabel: (label) => withCursor((cursor) =>
        set(headerAt(cursor).label(), label)
    ),
    setHeaderVar: (varName) => withCursor((cursor) =>
        set(headerAt(cursor).varName(), varName)
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
    // TODO: should this be a distinct action from adding a cons list?
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
    addStruct: (id) => withCursor((cursor) => pipe(
        withView(blocks[id].header.children(), (headers) => pipe(
            set(valueAt(cursor), initStruct(id, headers.length)),
            fillHole,
            holesForStruct(cursor, headers.length)
        ))
    )),
    addText: (textValue) => withCursor((cursor) => pipe(
        set(valueAt(cursor), text(textValue)),
        fillHole
    )),

    selectBody: ({ block, rule, path }) => pipe(
        mergeL(L.cursor(), { block, rule, holes: [path] }),
        focusBody,
        holesAtLinePlaceholders,
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
        // TODO: does this 'garbage collect' free vars?
    )),

    cut: () => withCursor((cursor) => pipe(
        withView(valueAt(cursor), set(L.clipboard())),
        set(valueAt(cursor), placeholder())
    )),
    paste: () => withCursor((cursor) =>
        withView(L.clipboard(), set(valueAt(cursor)))
    ),
}, {
    program: program(),
    cursor: { block: 0, rule: 0, headerField: 0, holes: [], focus: 'body' },
    clipboard: null,
})
