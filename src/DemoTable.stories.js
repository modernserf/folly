import h from 'react-hyperscript'
import { curry, uncurryN, last, lensPath, lensIndex, view, set, over, compose, pipe, map, append } from 'ramda'
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
const _blockAt = thenLensIndex(programBlocks)
const _rows = childrenL
const _headerItems = lensPath(['header', 'children'])
const _headerAt = thenLensIndex(_headerItems)
const _headerVarName = lensPath(['varName'])
const _ruleAt = thenLensIndex(_rows)

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

const _ruleCase = (x) => ruleCase(...x)
const varNameForHeader = (header) => header.varName || header.label
const defaultRowValue = compose(eq, varNameForHeader)
const rowsForHeaders = compose(_ruleCase, map(defaultRowValue))

const cursor = lensPath(['cursor'])
const cursorBlockField = lensPath(['cursor', 'block'])
const cursorHeaderField = lensPath(['cursor', 'headerField'])
const cursorRuleField = lensPath(['cursor', 'rule'])
const holes = lensPath(['cursor', 'holes'])

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

const reducer = match({
    // TODO `insertFooAt(index)`, `moveFoo(from, to)` etc

    // TODO: should this move the cursor focus to the header
    // or change to "header is focused" state?
    appendBlock: () => pipe(
        appendAndUpdateCursor(programBlocks, cursorBlockField, initRuleBlock()),
        set(cursorRuleField, 0),
        set(cursorHeaderField, 0)
    ),
    appendRuleCase: () => withCursor((cursor) => pipe(
        appendAndUpdateCursor(allRowsAt(cursor), cursorRuleField, ruleCase()),
        holesForRuleCase
    )),
    appendRuleLine: () => withCursor((cursor) => pipe(
        appendL(allValuesAt(cursor), placeholder()),
        withView(allValuesAt(cursor), holesForRuleLine),
    )),
    appendHeaderField: () => withCursor((cursor) =>
        appendAndUpdateCursor(allHeadersAt(cursor), cursorHeaderField, header())
    ),
    appendFactAsRule: () => withCursor((cursor) =>
        withView(allHeadersAt(cursor), (headers) => pipe(
            appendAndUpdateCursor(allRowsAt(cursor), cursorRuleField, rowsForHeaders(headers)),
            holesForFactAsRule(headers)
        ))
    ),

    // TODO: are these only meaningful in a "header is focused" state?
    setHeader: (label) => withCursor((cursor) =>
        set(headerAt(cursor), header(label)),
    ),
    setHeaderVar: (varName) => withCursor((cursor) =>
        set(headerVarAt(cursor), varName)
    ),

    addOperator: (operator) => withCursor((cursor) => pipe(
        set(valueAt(cursor), op(operator)),
        consumeHole,
        holesForOperator(cursor),
    )),
    addVar: (varName) => withCursor((cursor) => pipe(
        set(valueAt(cursor), varr(varName)),
        consumeHole,
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
}, {
    program: program(),
    cursor: { block: 0, rule: 0, headerField: 0, holes: [] },
})

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
