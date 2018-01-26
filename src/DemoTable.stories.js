import h from 'react-hyperscript'
import { uncurryN, last, lensPath, lensIndex, view, set, over, compose, insert, pipe, map } from 'ramda'
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

// const match = (handlers, initState) => (state = initState, action) => handlers[action.type]
//     ? pipe(...handlers[action.type](action.payload))(state)
//     : state

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
const thenLensIndex = (aLens) => (index) => compose(aLens, lensIndex(index))

const programBlocks = lensPath(['program', 'children'])
const ruleAt = thenLensIndex(programBlocks)

const rows = lensPath(['children'])

const _headerItems = lensPath(['header', 'children'])
const _headerAt = thenLensIndex(_headerItems)
const headersAt = (ruleIndex) => compose(ruleAt(ruleIndex), _headerItems)
const headerAt = (ruleIndex, headerIndex) => compose(ruleAt(ruleIndex), _headerAt(headerIndex))

const headerVarName = lensPath(['varName'])
const headerVarAt = (ruleIndex, headerIndex) =>
    compose(headerAt(ruleIndex, headerIndex), headerVarName)

const rowsAt = (ruleIndex) => compose(ruleAt(ruleIndex), rows)

const rowAt = thenLensIndex(rows)
const valueAt = (ruleIndex, caseIndex, path) =>
    compose(ruleAt(ruleIndex), rowAt(caseIndex), lensPath(['children', ...path]))

const W = (f) => (x) => f(x)(x)

const _ruleCase = (x) => ruleCase(...x)
const varNameForHeader = (header) => header.varName || header.label
const defaultRowValue = compose(eq, varNameForHeader)
const rowsForHeaders = compose(_ruleCase, map(defaultRowValue))

const insertFactAsRule = (ruleIndex, rowIndex) => W(pipe(
    view(headersAt(ruleIndex)),
    pipe(
        rowsForHeaders,
        insertL(compose(ruleAt(ruleIndex), rows), rowIndex),
    )
))

const ruleFrames = [
    { program: program() },
    insertL(programBlocks, 0, initRuleBlock()),

    set(headerAt(0, 0), header('Item')),
    insertL(headersAt(0), 1, header()),
    set(headerAt(0, 1), header('Not in')),
    set(headerVarAt(0, 1), 'List'),

    insertL(rowsAt(0), 0, ruleCase()),
    set(valueAt(0, 0, [0]), op('==')),
    set(valueAt(0, 0, [0, 'lhs']), varr('List')),
    set(valueAt(0, 0, [0, 'rhs']), list()),

    insertL(rowsAt(0), 1, ruleCase()),
    set(valueAt(0, 1, [0]), op('==')),
    set(valueAt(0, 1, [0, 'lhs']), varr('List')),
    set(valueAt(0, 1, [0, 'rhs']), listCons()),
    set(valueAt(0, 1, [0, 'rhs', 'children', 0]), varr('First')),
    set(valueAt(0, 1, [0, 'rhs', 'tail']), varr('Rest')),

    set(valueAt(0, 1, [1]), op('!=')),
    set(valueAt(0, 1, [1, 'lhs']), varr('Item')),
    set(valueAt(0, 1, [1, 'rhs']), varr('First')),

    set(valueAt(0, 1, [2]), initStruct(header('Item'), header('Not in'))),
    set(valueAt(0, 1, [2, 'children', 0, 1]), varr('Item')),
    set(valueAt(0, 1, [2, 'children', 1, 1]), varr('Rest')),
]

const factsAsRules = [
    { program: program() },
    insertL(programBlocks, 0, initRuleBlock()),
    set(headerAt(0, 0), header('From')),
    insertL(headersAt(0), 1, header()),
    set(headerAt(0, 1), header('To')),
    insertL(headersAt(0), 2, header()),
    set(headerAt(0, 2), header('Line')),

    insertFactAsRule(0, 0),
    set(valueAt(0, 0, [0, 'rhs']), text('Park Street')),
    set(valueAt(0, 0, [1, 'rhs']), text('Downtown Crossing')),
    set(valueAt(0, 0, [2, 'rhs']), text('Red')),

    insertFactAsRule(0, 1),
    set(valueAt(0, 1, [0, 'rhs']), text('Park Street')),
    set(valueAt(0, 1, [1, 'rhs']), text('Govt Center')),
    set(valueAt(0, 1, [2, 'rhs']), text('Green')),
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
            // showAll: true,
            frames: applyFrames(factsAsRules).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                // h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
