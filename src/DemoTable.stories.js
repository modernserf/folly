import { Component } from 'react'
import h from 'react-hyperscript'
import { last, pipe, lens, lensPath, lensIndex, view, set, over, compose, insert } from 'ramda'
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
const factBlock = (headers, ...children) => ({
    type: 'factBlock',
    id: colonize(headers),
    header: {
        type: 'headerRow',
        children: headers,
    },
    children,
})

const header = (label, varName) => ({ type: 'headerCell', id: slugify(label), label, varName })
const factRow = (values) => ({ type: 'factRow', id: shortid.generate(), values })
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

const data = {
    program: program(
        factBlock(
            [header('Station')],
            factRow({ station: text('Park Street') }),
            factRow({ station: text('Downtown Crossing') }),
            factRow({ station: text('Govt Center') }),
        ),
        factBlock(
            [header('From'), header('To'), header('Line')],
            factRow({
                from: text('Park Street'),
                to: text('Downtown Crossing'),
                line: text('Red'),
            }),
            factRow({
                from: text('Park Street'),
                to: text('Govt Center'),
                line: text('Green'),
            }),
            factRow({
                from: text('State Street'),
                to: text('Downtown Crossing'),
                line: text('Orange'),
            }),
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

const programBlocks = lensPath(['program', 'children'])
const baseFactBlock = () => factBlock([header('')], factRow({}))
const addFactBlockToProgram = (index) =>
    over(programBlocks, insert(index, baseFactBlock()))

const headerItems = lensPath(['header', 'children'])
const rows = lensPath(['children'])

const thenLensIndex = (aLens) => (index) => compose(aLens, lensIndex(index))

const factAt = thenLensIndex(programBlocks)
const headerAt = thenLensIndex(headerItems)
const rowAt = thenLensIndex(rows)

const valueAt = (key) => lensPath(['values', key])

const setHeader = (factIndex, headerIndex, value) =>
    set(compose(factAt(factIndex), headerAt(headerIndex)), value)

const insertHeaderField = (factIndex, headerIndex) =>
    over(compose(factAt(factIndex), headerItems), insert(headerIndex, header('')))

const setValue = (factIndex, rowIndex, key, value) =>
    set(compose(factAt(factIndex), rowAt(rowIndex), valueAt(key)), value)

const insertFactRow = (factIndex, rowIndex) =>
    over(compose(factAt(factIndex), rows), insert(rowIndex, factRow({})))

const factFrames = [
    { program: program() },
    addFactBlockToProgram(0),
    setHeader(0, 0, header('From')),
    insertHeaderField(0, 1),
    setHeader(0, 1, header('To')),
    insertHeaderField(0, 2),
    setHeader(0, 2, header('Line')),

    setValue(0, 0, 'from', text('Park Street')),
    setValue(0, 0, 'to', text('Downtown Crossing')),
    setValue(0, 0, 'line', text('Red')),

    insertFactRow(0, 1),
    setValue(0, 1, 'from', text('Park Street')),
    setValue(0, 1, 'to', text('Govt Center')),
    setValue(0, 1, 'line', text('Green')),
]

const ruleFrames = [
    // init
    { program: program() },
    // add rule
    { program: program(
        ruleBlock(
            [header('')],
        ),
    ) },
    { program: program(
        ruleBlock(
            [header('Item')],
        ),
    ) },
    { program: program(
        ruleBlock(
            [header('Item'), header('')],
        ),
    ) },
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in')],
        ),
    ) },
    // set variable name
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
        ),
    ) },
    // add case
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(),
        ),
    ) },
    // add op
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', placeholder(), placeholder())
            ),
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), placeholder())
            ),
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
        ),
    ) },
    // add case
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase()
        ),
    ) },
    // add operator
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('=='),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List')),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([placeholder()], placeholder())),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], placeholder())),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
            )
        ),
    ) },
    // add operator
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!='),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!=', varr('Item')),
            )
        ),
    ) },
    // add operand
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!=', varr('Item'), varr('First')),
            )
        ),
    ) },
    // add struct
    { program: program(
        ruleBlock(
            [header('Item'), header('Not in', 'List')],
            ruleCase(
                op('==', varr('List'), list())
            ),
            ruleCase(
                op('==', varr('List'), list([varr('First')], varr('Rest'))),
                op('!=', varr('Item'), varr('First')),
                struct(
                    [header('Item'), placeholder()],
                    [header('Not in'), placeholder()]
                )
            )
        ),
    ) },
    // add field
    { program: program(
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
                    [header('Not in'), placeholder()]
                )
            )
        ),
    ) },
    // add field
    { program: program(
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
    ) },
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
            h(Program, data),
        ]))
    .add('edit fact', () =>
        h(PlayerWrap, {
            frames: applyFrames(factFrames).map((state, i) => h('div', [
                h(Program, { key: i, ...state }),
                h('pre', { style: { lineHeight: 1.4 } }, [JSON.stringify(state, null, 2)]),
            ])),
        }))
    .add('edit rule', () =>
        h(PlayerWrap, {
            // showAll: true,
            frames: ruleFrames.map((state, i) => h(Program, { key: i, ...state })),
        }))
