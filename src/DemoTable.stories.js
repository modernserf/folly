import h from 'react-hyperscript'
import { uncurryN, last, lensPath, lensIndex, view, set, over, compose, insert, pipe, map, inc, append } from 'ramda'
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
const insertL = uncurryN(3, (lens) => compose(over(lens), insert))
const incL = uncurryN(2, (lens) => over(lens, inc))
const enqueue = uncurryN(2, (lens) => compose(over(lens), append))
const dequeue = (lens) => over(lens, (xs) => xs.slice(1))

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

const _ruleCase = (x) => ruleCase(...x)
const varNameForHeader = (header) => header.varName || header.label
const defaultRowValue = compose(eq, varNameForHeader)
const rowsForHeaders = compose(_ruleCase, map(defaultRowValue))

const cursor = lensPath(['cursor'])
const cursorHeaderField = lensPath(['cursor', 'headerField'])
const cursorRuleField = lensPath(['cursor', 'rule'])
const holes = lensPath(['cursor', 'holes'])

const withCursor = (f) => W(pipe(view(cursor), f))

const reducer = match({
    // TODO: should this move the cursor focus to the header
    // or change to "header is focused" state?
    // TODO: and should this reset the rule / headerField cursor position?
    insertBlockAtCursor: () => withCursor(
        ({ block }) => insertL(programBlocks, block, initRuleBlock())
    ),
    // TODO: are these only meaningful in a "header is focused" state?
    setHeader: (label) => withCursor(
        ({ block, headerField }) => set(headerAt(block, headerField), header(label)),
    ),
    setHeaderVar: (varName) => withCursor(
        ({ block, headerField }) => set(headerVarAt(block, headerField), varName)
    ),
    newHeaderField: () => pipe(
        incL(cursorHeaderField),
        withCursor(
            ({ block, headerField }) => insertL(headersAt(block), headerField, header())
        )
    ),
    // TODO: same action, separate states for 'first rule' / 'additional rule'
    // OR: addRuleCase (to end) vs insertRuleCase (at index)
    // handles incrementing rule
    addFirstRuleCase: () => pipe(
        withCursor(({ block }) => insertL(rowsAt(block), 0, ruleCase())),
        enqueue(holes, [0])
    ),
    addRuleCase: () => pipe(
        incL(cursorRuleField),
        withCursor(({ block, rule }) => insertL(rowsAt(block), rule, ruleCase())),
        enqueue(holes, [0])
    ),
    // TODO: should this be automatic when the 'hole queue' is empty?
    addRuleLine: () => pipe(
        W(pipe(
            withCursor(({ block, rule }) => view(valuesAt(block, rule))),
            (values) => enqueue(holes, [values.length]),
        )),
        withCursor(({ block, rule, holes: [hole] }) => set(valueAt(block, rule, hole), placeholder()))
    ),
    addOperator: (operator) =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), op(operator)),
            dequeue(holes),
            enqueue(holes, [...hole, 'lhs']),
            enqueue(holes, [...hole, 'rhs']),
        )),
    addVar: (varName) =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), varr(varName)),
            dequeue(holes),
        )),
    // should this be a distinct action from adding a cons list?
    // how would we represent optional holes?
    // does a comma need to be entered as an operator (i.e. before the value)?
    addEmptyList: () =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), list()),
            dequeue(holes)
        )),
    addConsList: () =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), listCons()),
            dequeue(holes),
            enqueue(holes, [...hole, 'children', 0]),
            enqueue(holes, [...hole, 'tail']),
        )),
    addStruct: (headers) =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), initStruct(...headers.map(header))),
            dequeue(holes),
            ...headers.map((_, i) =>
                // TODO: make helper to abstract struct impl details, e.g.
                // ...enqueueHolesForStruct(hole, headers)
                // 'holes' could even hold lenses, not paths ??
                enqueue(holes, [...hole, 'children', i, 1]))
        )),
    addText: (textValue) =>
        withCursor(({ block, rule, holes: [hole] }) => pipe(
            set(valueAt(block, rule, hole), text(textValue)),
            dequeue(holes)
        )),

    // TODO: see `add(First)RuleCase`
    addFirstFactAsRule: () => W(
        withCursor(({ block }) => pipe(
            view(headersAt(block)),
            (headers) => pipe(
                insertL(compose(ruleAt(block), rows), 0, rowsForHeaders(headers)),
                ...headers.map((_, i) => enqueue(holes, [i, 'rhs'])),
            )
        ))),
    addFactAsRule: () => W(
        withCursor(({ block, rule }) => pipe(
            view(headersAt(block)),
            (headers) => pipe(
                incL(cursorRuleField),
                insertL(compose(ruleAt(block), rows), rule + 1, rowsForHeaders(headers)),
                ...headers.map((_, i) => enqueue(holes, [i, 'rhs'])),
            )
        ))),

}, { program: program(), cursor: { block: 0, rule: 0, headerField: 0, holes: [] } })

const dispatch = (type, payload) => (state) => reducer(state, { type, payload })

const ruleFrames = [
    dispatch('insertBlockAtCursor'),

    dispatch('setHeader', 'Item'),
    dispatch('newHeaderField'),
    dispatch('setHeader', 'Not in'),
    dispatch('setHeaderVar', 'List'),

    dispatch('addFirstRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addEmptyList'),

    dispatch('addRuleCase'),
    dispatch('addOperator', '=='),
    dispatch('addVar', 'List'),
    dispatch('addConsList'),
    dispatch('addVar', 'First'),
    dispatch('addVar', 'Rest'),

    dispatch('addRuleLine'),
    dispatch('addOperator', '!='),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'First'),

    dispatch('addRuleLine'),
    dispatch('addStruct', ['Item', 'Not in']),
    dispatch('addVar', 'Item'),
    dispatch('addVar', 'Rest'),
]

const factsAsRules = [
    dispatch('insertBlockAtCursor'),

    dispatch('setHeader', 'From'),
    dispatch('newHeaderField'),
    dispatch('setHeader', 'To'),
    dispatch('newHeaderField'),
    dispatch('setHeader', 'Line'),

    dispatch('addFirstFactAsRule'),
    dispatch('addText', 'Park Street'),
    dispatch('addText', 'Downtown Crossing'),
    dispatch('addText', 'Red'),

    dispatch('addFactAsRule'),
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
            // showAll: true,
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
