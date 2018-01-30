import h from 'react-hyperscript'
import { uncurryN, last, lensPath, lensIndex, view, set, over, compose, pipe, map, append } from 'ramda'
import shortid from 'shortid'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { Player, Range } from './story'
import { Program } from './DemoTable'

export const Container = styled.div`
    width: 375px;
    height: 812px;
    border: 1px solid #ccc;
    border-radius: 20px;
    margin: 20px;
    padding: 20px;
    font-family: 'Parc Place', sans-serif;
    font-size: 14px;
    color: #333;
    overflow: auto;
`

const W = (f) => (x) => f(x)(x)

const match = (handlers, initState) => (state = initState, action) => handlers[action.type]
    ? handlers[action.type](action.payload)(state)
    : state

const slugify = (x) => x.toLowerCase().replace(/\s/g, '_')
const colonize = (header) => header.map((h) => `${h.id}:`).join('')

const program = (...children) => ({ type: 'program', children })

const header = (label = '', varName) => ({ type: 'headerCell', id: slugify(label), label, varName })
const text = (label) => ({ type: 'text', id: shortid.generate(), label })

const ruleBlock = (headers, ...children) => ({
    type: 'ruleBlock',
    id: colonize(headers),
    header: {
        type: 'headerRow',
        children: headers,
    },
    children,
})

const placeholder = () => ({ type: 'placeholder' })
const ruleCase = (...children) => ({ type: 'ruleCase', id: shortid.generate(), children })
const op = (operator, lhs = placeholder(), rhs = placeholder()) => ({ type: 'operator', operator, lhs, rhs })
const varr = (label) => ({ type: 'var', label })
const list = (children = [], tail) => ({ type: 'list', children, tail })
const struct = (...children) => ({ type: 'struct', children })

const listCons = () => list([placeholder()], placeholder())
const initStruct = (...headers) => struct(...headers.map((h) => [h, placeholder()]))
const eq = (varName, rhs) => op('==', varr(varName), rhs)
const initRuleBlock = () => ruleBlock([header()])

const dataRulesOnly = {
    program: program(
        ruleBlock(
            [header('Station')],
            ruleCase(eq('Station', text('Park Street'))),
            ruleCase(eq('Station', text('Downtown Crossing'))),
            ruleCase(eq('Station', text('Govt Center')))
        ),
        ruleBlock(
            [header('From'), header('To'), header('Line')],
            ruleCase(
                eq('From', text('Park Street')),
                eq('To', text('Downtown Crossing')),
                eq('Line', text('Red')),
            ),
            ruleCase(
                eq('From', text('Park Street')),
                eq('To', text('Govt Center')),
                eq('Line', text('Green')),
            ),
            ruleCase(
                eq('From', text('State Street')),
                eq('To', text('Downtown Crossing')),
                eq('Line', text('Orange')),
            ),
        ),
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!=', varr('Item'), varr('First')),
                struct(
                    [header('Item'), varr('Item')],
                    [header('Not in'), varr('Rest')]
                )
            )
        ),
        ruleBlock(
            [header('From'), header('To'), header('Path')],
            ruleCase(
                op('==', varr('From'), varr('To')),
                op('==', varr('Path'), list())
            ),
            ruleCase(
                op('==', varr('Path'), list([varr('Link')], varr('Rest'))),
                struct(
                    [header('From'), varr('From')],
                    [header('To'), varr('Next')],
                    [header('Link'), varr('Link')]
                ),
                struct(
                    [header('Item'), varr('Link')],
                    [header('Not in'), varr('Rest')],
                ),
                struct(
                    [header('From'), varr('Next')],
                    [header('To'), varr('To')],
                    [header('Path'), varr('Rest')]
                )
            )
        )
    ),
}
const enqueue = uncurryN(2, (lens) => compose(over(lens), append))
const dequeue = (lens) => over(lens, (xs) => xs.slice(1))
const appendL = enqueue

const thenLensIndex = (aLens) => (index) => compose(aLens, lensIndex(index))

const childrenL = lensPath(['children'])
const programBlocks = lensPath(['program', 'children'])
const ruleAt = thenLensIndex(programBlocks)

const rows = childrenL

const _headerItems = lensPath(['header', 'children'])
const _headerAt = thenLensIndex(_headerItems)
const headersAt = (ruleIndex) => compose(ruleAt(ruleIndex), _headerItems)
const headerAt = (ruleIndex, headerIndex) => compose(ruleAt(ruleIndex), _headerAt(headerIndex))

const headerVarName = lensPath(['varName'])
const headerVarAt = (ruleIndex, headerIndex) =>
    compose(headerAt(ruleIndex, headerIndex), headerVarName)

const rowsAt = (ruleIndex) => compose(ruleAt(ruleIndex), rows)

const rowAt = thenLensIndex(rows)
const valuesAt = (ruleIndex, caseIndex) =>
    compose(ruleAt(ruleIndex), rowAt(caseIndex), childrenL)
const valueAt = (ruleIndex, caseIndex, path) =>
    compose(ruleAt(ruleIndex), rowAt(caseIndex), childrenL, lensPath(path))
const valueAtCursor = ({ block, rule, holes: [hole] }) => valueAt(block, rule, hole)

const _ruleCase = (x) => ruleCase(...x)
const varNameForHeader = (header) => header.varName || header.label
const defaultRowValue = compose(eq, varNameForHeader)
const rowsForHeaders = compose(_ruleCase, map(defaultRowValue))

const cursor = lensPath(['cursor'])
const cursorBlockField = lensPath(['cursor', 'block'])
const cursorHeaderField = lensPath(['cursor', 'headerField'])
const cursorRuleField = lensPath(['cursor', 'rule'])
const holes = lensPath(['cursor', 'holes'])

const withView = (lens, f) => W(pipe(view(lens), f))
const withCursor = (f) => withView(cursor, f)

const consumeHole = dequeue(holes)
const holesForRuleCase = enqueue(holes, [0])
const holesForRuleLine = (values) => enqueue(holes, [values.length])
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

const appendAndUpdateCursor = (lensToValue, lensToCursor, value) => pipe(
    appendL(lensToValue, value),
    withView(lensToValue, (value) => set(lensToCursor, value.length - 1))
)

const reducer = match({
    // TODO `insertFooAt(index)`, `moveFoo(from, to)` etc

    // TODO: should this move the cursor focus to the header
    // or change to "header is focused" state?
    appendBlock: () => pipe(
        appendAndUpdateCursor(programBlocks, cursorBlockField, initRuleBlock()),
        set(cursorRuleField, 0),
        set(cursorHeaderField, 0)
    ),
    appendRuleCase: () => withCursor(({ block }) => pipe(
        appendAndUpdateCursor(rowsAt(block), cursorRuleField, ruleCase()),
        holesForRuleCase
    )),
    appendRuleLine: () => withCursor(({ block, rule }) => pipe(
        appendL(valuesAt(block, rule), placeholder()),
        withView(valuesAt(block, rule), holesForRuleLine)
    )),
    appendHeaderField: () => withCursor(({ block }) =>
        appendAndUpdateCursor(headersAt(block), cursorHeaderField, header())
    ),
    appendFactAsRule: () => withCursor(({ block }) =>
        withView(headersAt(block), (headers) => pipe(
            appendAndUpdateCursor(compose(ruleAt(block), rows), cursorRuleField, rowsForHeaders(headers)),
            holesForFactAsRule(headers)
        ))
    ),

    // TODO: are these only meaningful in a "header is focused" state?
    setHeader: (label) => withCursor(
        ({ block, headerField }) => set(headerAt(block, headerField), header(label)),
    ),
    setHeaderVar: (varName) => withCursor(
        ({ block, headerField }) => set(headerVarAt(block, headerField), varName)
    ),

    addOperator: (operator) => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), op(operator)),
        consumeHole,
        holesForOperator(cursor),
    )),
    addVar: (varName) => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), varr(varName)),
        consumeHole,
    )),
    // should this be a distinct action from adding a cons list?
    // how would we represent optional holes?
    // does a comma need to be entered as an operator (i.e. before the value)?
    addEmptyList: () => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), list()),
        dequeue(holes)
    )),
    addConsList: () => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), listCons()),
        consumeHole,
        holesForCons(cursor)
    )),
    addStruct: (headers) => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), initStruct(...headers.map(header))),
        consumeHole,
        holesForStruct(cursor, headers)
    )),
    addText: (textValue) => withCursor((cursor) => pipe(
        set(valueAtCursor(cursor), text(textValue)),
        dequeue(holes)
    )),
}, { program: program(), cursor: { block: 0, rule: 0, headerField: 0, holes: [] } })

const dispatch = (type, payload) => (state) => reducer(state, { type, payload })

const ruleFrames = [
    dispatch('appendBlock'),

    dispatch('setHeader', 'Item'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'Not in'),
    dispatch('setHeaderVar', 'List'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addEmptyList'),

    dispatch('appendRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addConsList'),
    dispatch('addVar', 'First'),
    dispatch('addVar', 'Rest'),

    dispatch('appendRuleLine'),
    dispatch('addOperator', '!='),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'First'),

    dispatch('appendRuleLine'),
    dispatch('addStruct', ['Item', 'Not in']),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'Rest'),
]

const factsAsRules = [
    dispatch('appendBlock'),

    dispatch('setHeader', 'From'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'To'),
    dispatch('appendHeaderField'),
    dispatch('setHeader', 'Line'),

    dispatch('appendFactAsRule'),
    dispatch('addText', 'Park Street'),
    dispatch('addText', 'Downtown Crossing'),
    dispatch('addText', 'Red'),

    dispatch('appendFactAsRule'),
    dispatch('addText', 'Park Street'),
    dispatch('addText', 'Govt Center'),
    dispatch('addText', 'Green'),
]

const PlayerWrap = (props) =>
    h(Player, props, ({ children, onNext, onPlay, setFrame, frame, frames }) => [
        h(Container, [
            children,
        ]),
        h('button', { onClick: onNext }, ['step']),
        h('button', { onClick: onPlay }, ['play']),
        h(Range, { min: 0, max: frames.length - 1, value: frame, onChange: setFrame }),
    ])

const applyFrames = (data) => data.reduce((items, next) =>
    typeof next === 'function'
        ? items.concat([next(last(items))])
        : items.concat([next]),
[])

storiesOf('Demo', module)
    .add('table', () =>
        h(Container, [
            h(Program, dataRulesOnly),
        ]))
    .add('edit rule', () =>
        h(PlayerWrap, {
            showAll: true,
            frames: applyFrames(ruleFrames).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
    .add('edit fact', () =>
        h(PlayerWrap, {
            showAll: true,
            frames: applyFrames(factsAsRules).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
